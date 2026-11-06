package com.krunnex.restaurant.service;

import com.krunnex.restaurant.domain.*;
import com.krunnex.restaurant.repository.*;
import com.krunnex.restaurant.web.dto.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final OutletRepository outletRepository;
    private final ProductRepository productRepository;
    private final ProductVariantRepository variantRepository;
    private final AddOnRepository addOnRepository;
    private final DiscountRepository discountRepository;
    private final PricingCalculationService pricingCalculationService;
    private final KitchenTicketService kitchenTicketService;
    private final RestaurantTableRepository tableRepository;
    private final BillingAndPaymentService billingService;

    private final SecureRandom random = new SecureRandom();

    public OrderService(
            OrderRepository orderRepository,
            OutletRepository outletRepository,
            ProductRepository productRepository,
            ProductVariantRepository variantRepository,
            AddOnRepository addOnRepository,
            DiscountRepository discountRepository,
            PricingCalculationService pricingCalculationService,
            KitchenTicketService kitchenTicketService,
            RestaurantTableRepository tableRepository,
            BillingAndPaymentService billingService) {
        this.orderRepository = orderRepository;
        this.outletRepository = outletRepository;
        this.productRepository = productRepository;
        this.variantRepository = variantRepository;
        this.addOnRepository = addOnRepository;
        this.discountRepository = discountRepository;
        this.pricingCalculationService = pricingCalculationService;
        this.kitchenTicketService = kitchenTicketService;
        this.tableRepository = tableRepository;
        this.billingService = billingService;
    }

    /**
     * Create a new order with duplicate protection, table assignment, and server-side pricing.
     */
    @Transactional
    public Order createOrder(CreateOrderRequest request) {
        UUID outletId = request.getOutletId();

        // 1. Idempotency Check: return existing order if key matches
        if (request.getIdempotencyKey() != null && !request.getIdempotencyKey().isBlank()) {
            Optional<Order> existing = orderRepository.findByOutletIdAndIdempotencyKey(outletId, request.getIdempotencyKey().trim());
            if (existing.isPresent()) {
                return existing.get();
            }
        }

        Outlet outlet = outletRepository.findByIdWithoutTenantScope(outletId)
                .orElseThrow(() -> new IllegalArgumentException("Outlet not found: " + outletId));

        // 2. Table resolution & occupation check
        RestaurantTable table = null;
        if (request.getTableId() != null) {
            table = tableRepository.findById(request.getTableId()).orElse(null);
        }
        if (table == null && request.getTableNumber() != null && !request.getTableNumber().isBlank()) {
            String tblNum = request.getTableNumber().trim();
            table = tableRepository.findByOutletIdAndTableNumber(outletId, tblNum)
                    .orElseGet(() -> {
                        RestaurantTable newTbl = new RestaurantTable();
                        newTbl.setTenantId(outlet.getTenantId());
                        newTbl.setOutlet(outlet);
                        newTbl.setTableNumber(tblNum);
                        newTbl.setName("Table " + tblNum);
                        newTbl.setCapacity(4);
                        newTbl.setStatus(TableStatus.AVAILABLE);
                        return tableRepository.save(newTbl);
                    });
        }

        // If Dine In with assigned table, verify table is not occupied by another active order
        if (table != null && request.getOrderType() == OrderType.DINE_IN) {
            if (table.getCurrentOrder() != null && table.getCurrentOrder().getStatus() != OrderStatus.COMPLETED && table.getCurrentOrder().getStatus() != OrderStatus.CANCELLED) {
                // Table is occupied: return running order if already linked to same table
                Order running = orderRepository.findById(table.getCurrentOrder().getId()).orElse(null);
                if (running != null && (running.getStatus() == OrderStatus.CREATED || running.getStatus() == OrderStatus.CONFIRMED || running.getStatus() == OrderStatus.PREPARING)) {
                    throw new IllegalStateException("Table " + table.getTableNumber() + " already has an active running order: #" + running.getOrderNumber());
                }
            }
        }

        Discount discount = null;
        if (request.getDiscountId() != null) {
            discount = discountRepository.findById(request.getDiscountId())
                    .orElseThrow(() -> new IllegalArgumentException("Discount not found: " + request.getDiscountId()));
        }

        Order order = new Order();
        order.setOutlet(outlet);
        order.setOrderType(request.getOrderType());
        order.setStatus(OrderStatus.CREATED);
        order.setCustomerNotes(request.getCustomerNotes());
        order.setIdempotencyKey(request.getIdempotencyKey() != null ? request.getIdempotencyKey().trim() : null);
        order.setDiscount(discount);
        order.setTable(table);
        order.setOrderNumber(generateOrderNumber());

        // 3. Populate Order Items & Calculate Server-Side Pricing
        populateOrderItemsAndTotals(order, request.getItems(), discount);

        Order savedOrder = orderRepository.save(order);

        // Update table status to RUNNING and link current order
        if (table != null) {
            table.setCurrentOrder(savedOrder);
            table.setStatus(TableStatus.RUNNING);
            tableRepository.save(table);
        }

        // 4. KOT Release logic based on payment policy
        // If PAY_FIRST, KOT is released only when payment is verified
        // If PAY_LATER or FLEXIBLE, release KOT immediately
        PaymentPolicy policy = outlet.getPaymentPolicy() != null ? outlet.getPaymentPolicy() : PaymentPolicy.FLEXIBLE;
        if (policy != PaymentPolicy.PAY_FIRST) {
            try {
                kitchenTicketService.createTicketFromOrder(savedOrder.getId());
            } catch (Exception ex) {
                ex.printStackTrace();
            }
        }

        return savedOrder;
    }

    /**
     * Submits newly added items to an existing running order.
     * Preserves existing items & prices, recalculates totals, revises bills, and generates an add-on KOT.
     */
    @Transactional
    public Order addItemsToRunningOrder(UUID orderId, AddOrderItemsRequest request) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));

        if (order.getStatus() == OrderStatus.COMPLETED || order.getStatus() == OrderStatus.CANCELLED) {
            throw new IllegalStateException("Cannot add items to an order that is " + order.getStatus());
        }

        List<OrderItem> newlyCreatedItems = new ArrayList<>();
        UUID outletId = order.getOutlet().getId();

        // 1. Calculate pricing for the newly added items
        CalculationRequest calcReq = new CalculationRequest();
        calcReq.setOutletId(outletId);
        List<CalculationRequest.ItemRequest> calcItems = new ArrayList<>();
        for (OrderItemRequest ir : request.getItems()) {
            CalculationRequest.ItemRequest cir = new CalculationRequest.ItemRequest();
            cir.setProductId(ir.getProductId());
            cir.setVariantId(ir.getVariantId());
            cir.setAddOnIds(ir.getAddOnIds());
            cir.setQuantity(ir.getQuantity());
            calcItems.add(cir);
        }
        calcReq.setItems(calcItems);

        CalculationResponse newItemsCalc = pricingCalculationService.calculateTotals(calcReq);

        // 2. Create and append new OrderItems to the order
        for (int i = 0; i < request.getItems().size(); i++) {
            OrderItemRequest ir = request.getItems().get(i);
            CalculationResponse.ItemDetail detail = newItemsCalc.getItems().get(i);

            Product product = productRepository.findById(ir.getProductId())
                    .orElseThrow(() -> new IllegalArgumentException("Product not found: " + ir.getProductId()));

            ProductVariant variant = null;
            if (ir.getVariantId() != null) {
                variant = variantRepository.findById(ir.getVariantId())
                        .orElseThrow(() -> new IllegalArgumentException("Variant not found: " + ir.getVariantId()));
            }

            OrderItem orderItem = new OrderItem();
            orderItem.setProduct(product);
            orderItem.setVariant(variant);
            orderItem.setProductNameSnapshot(product.getName());
            orderItem.setVariantNameSnapshot(variant != null ? variant.getName() : null);
            orderItem.setQuantity(ir.getQuantity());
            orderItem.setUnitPriceSnapshot(detail.getUnitPrice());
            orderItem.setLineTotalSnapshot(detail.getLineTotal());
            orderItem.setTaxRatePercentSnapshot(detail.getTaxRatePercent());
            orderItem.setIsTaxInclusiveSnapshot(detail.getIsTaxInclusive());
            orderItem.setItemTaxSnapshot(detail.getItemTax());
            orderItem.setItemNotes(ir.getItemNotes());

            if (ir.getAddOnIds() != null && !ir.getAddOnIds().isEmpty()) {
                List<AddOn> addOns = addOnRepository.findAllById(ir.getAddOnIds());
                for (AddOn addOn : addOns) {
                    OrderItemAddOn itemAddOn = new OrderItemAddOn();
                    itemAddOn.setAddOn(addOn);
                    itemAddOn.setAddOnNameSnapshot(addOn.getName());
                    itemAddOn.setPriceSnapshot(addOn.getPrice());
                    orderItem.addAddOn(itemAddOn);
                }
            }

            order.addItem(orderItem);
            newlyCreatedItems.add(orderItem);
        }

        // 3. Update Order Totals safely
        order.setSubtotal(order.getSubtotal().add(newItemsCalc.getSubtotal()));
        order.setTaxableAmount(order.getTaxableAmount().add(newItemsCalc.getTaxableAmount()));
        order.setTaxAmount(order.getTaxAmount().add(newItemsCalc.getTaxAmount()));
        order.setTotalAmount(order.getTotalAmount().add(newItemsCalc.getTotalAmount()));

        Order saved = orderRepository.saveAndFlush(order);

        // 4. Controlled revision of issued bills if one exists and not fully settled
        billingService.reviseBillForOrder(saved);

        // 5. Generate Add-On KOT containing ONLY the newly added items
        PaymentPolicy policy = order.getOutlet().getPaymentPolicy() != null ? order.getOutlet().getPaymentPolicy() : PaymentPolicy.FLEXIBLE;
        if (policy != PaymentPolicy.PAY_FIRST) {
            // Find the persisted OrderItem instances from the saved order
            int addedCount = request.getItems().size();
            int totalItems = saved.getItems().size();
            List<OrderItem> savedNewItems = saved.getItems().subList(Math.max(0, totalItems - addedCount), totalItems);
            kitchenTicketService.createAddOnTicket(saved.getId(), savedNewItems);
        }

        return saved;
    }

    /**
     * Update order items (only allowed in active state).
     */
    @Transactional
    public Order updateOrderItems(UUID orderId, UpdateOrderItemsRequest request) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));

        if (order.getStatus() == OrderStatus.COMPLETED || order.getStatus() == OrderStatus.CANCELLED) {
            throw new IllegalStateException("Items cannot be updated when order is " + order.getStatus());
        }

        order.clearItems();
        populateOrderItemsAndTotals(order, request.getItems(), order.getDiscount());

        Order saved = orderRepository.save(order);
        billingService.reviseBillForOrder(saved);
        return saved;
    }

    /**
     * Transition order status with validation.
     */
    @Transactional
    public Order transitionStatus(UUID orderId, OrderStatus newStatus, String cancellationReason) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));

        OrderStatus current = order.getStatus();
        if (!current.canTransitionTo(newStatus)) {
            throw new IllegalStateException("Invalid status transition from " + current + " to " + newStatus);
        }

        if (newStatus == OrderStatus.CANCELLED) {
            if (cancellationReason == null || cancellationReason.isBlank()) {
                throw new IllegalArgumentException("Cancellation reason is required when cancelling an order");
            }
            order.setCancellationReason(cancellationReason);
            // Free up table if cancelled
            if (order.getTable() != null) {
                RestaurantTable table = order.getTable();
                if (table.getCurrentOrder() != null && table.getCurrentOrder().getId().equals(order.getId())) {
                    table.setStatus(TableStatus.AVAILABLE);
                    table.setCurrentOrder(null);
                    tableRepository.save(table);
                }
            }
        }

        order.setStatus(newStatus);
        return orderRepository.save(order);
    }

    private void populateOrderItemsAndTotals(Order order, List<OrderItemRequest> itemRequests, Discount discount) {
        UUID outletId = order.getOutlet().getId();

        // Convert to CalculationRequest to leverage Task 04's exact tax and discount calculations
        CalculationRequest calcReq = new CalculationRequest();
        calcReq.setOutletId(outletId);
        if (discount != null) {
            calcReq.setDiscountId(discount.getId());
        }

        List<CalculationRequest.ItemRequest> calcItems = new ArrayList<>();
        for (OrderItemRequest ir : itemRequests) {
            CalculationRequest.ItemRequest cir = new CalculationRequest.ItemRequest();
            cir.setProductId(ir.getProductId());
            cir.setVariantId(ir.getVariantId());
            cir.setAddOnIds(ir.getAddOnIds());
            cir.setQuantity(ir.getQuantity());
            calcItems.add(cir);
        }
        calcReq.setItems(calcItems);

        CalculationResponse calcResponse = pricingCalculationService.calculateTotals(calcReq);

        order.setSubtotal(calcResponse.getSubtotal());
        order.setDiscountAmount(calcResponse.getDiscountAmount());
        order.setTaxableAmount(calcResponse.getTaxableAmount());
        order.setTaxAmount(calcResponse.getTaxAmount());
        order.setTotalAmount(calcResponse.getTotalAmount());

        // Create OrderItems with snapshot fields
        for (int i = 0; i < itemRequests.size(); i++) {
            OrderItemRequest ir = itemRequests.get(i);
            CalculationResponse.ItemDetail detail = calcResponse.getItems().get(i);

            Product product = productRepository.findById(ir.getProductId())
                    .orElseThrow(() -> new IllegalArgumentException("Product not found: " + ir.getProductId()));

            ProductVariant variant = null;
            if (ir.getVariantId() != null) {
                variant = variantRepository.findById(ir.getVariantId())
                        .orElseThrow(() -> new IllegalArgumentException("Variant not found: " + ir.getVariantId()));
            }

            OrderItem orderItem = new OrderItem();
            orderItem.setProduct(product);
            orderItem.setVariant(variant);
            orderItem.setProductNameSnapshot(product.getName());
            orderItem.setVariantNameSnapshot(variant != null ? variant.getName() : null);
            orderItem.setQuantity(ir.getQuantity());
            orderItem.setUnitPriceSnapshot(detail.getUnitPrice());
            orderItem.setLineTotalSnapshot(detail.getLineTotal());
            orderItem.setTaxRatePercentSnapshot(detail.getTaxRatePercent());
            orderItem.setIsTaxInclusiveSnapshot(detail.getIsTaxInclusive());
            orderItem.setItemTaxSnapshot(detail.getItemTax());
            orderItem.setItemNotes(ir.getItemNotes());

            // Add-ons snapshot
            if (ir.getAddOnIds() != null && !ir.getAddOnIds().isEmpty()) {
                List<AddOn> addOns = addOnRepository.findAllById(ir.getAddOnIds());
                for (AddOn addOn : addOns) {
                    OrderItemAddOn itemAddOn = new OrderItemAddOn();
                    itemAddOn.setAddOn(addOn);
                    itemAddOn.setAddOnNameSnapshot(addOn.getName());
                    itemAddOn.setPriceSnapshot(addOn.getPrice());
                    orderItem.addAddOn(itemAddOn);
                }
            }

            order.addItem(orderItem);
        }
    }

    private String generateOrderNumber() {
        String datePrefix = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        int rand = 1000 + random.nextInt(9000);
        return "ORD-" + datePrefix + "-" + rand;
    }
}

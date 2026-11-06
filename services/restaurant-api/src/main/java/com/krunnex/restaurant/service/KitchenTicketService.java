package com.krunnex.restaurant.service;

import com.krunnex.restaurant.domain.*;
import com.krunnex.restaurant.repository.KitchenTicketItemRepository;
import com.krunnex.restaurant.repository.KitchenTicketRepository;
import com.krunnex.restaurant.repository.OrderRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class KitchenTicketService {

    private final KitchenTicketRepository kitchenTicketRepository;
    private final KitchenTicketItemRepository kitchenTicketItemRepository;
    private final OrderRepository orderRepository;

    public KitchenTicketService(
            KitchenTicketRepository kitchenTicketRepository,
            KitchenTicketItemRepository kitchenTicketItemRepository,
            OrderRepository orderRepository) {
        this.kitchenTicketRepository = kitchenTicketRepository;
        this.kitchenTicketItemRepository = kitchenTicketItemRepository;
        this.orderRepository = orderRepository;
    }

    /**
     * Creates a Kitchen Order Ticket (KOT) from a confirmed order.
     * Captures order items, quantities, add-ons and preparation notes as immutable snapshots.
     * Deduplicates if a ticket has already been created for this order.
     */
    @Transactional
    public KitchenTicket createTicketFromOrder(UUID orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));

        if (order.getStatus() == OrderStatus.CANCELLED) {
            throw new IllegalStateException("Cannot create kitchen ticket for a cancelled order");
        }

        // Prevent duplicate tickets when an order is processed more than once
        Optional<KitchenTicket> existing = kitchenTicketRepository.findByOrderId(order.getId());
        if (existing.isPresent()) {
            return existing.get();
        }

        KitchenTicket ticket = new KitchenTicket();
        ticket.setTenantId(order.getTenantId());
        ticket.setOutlet(order.getOutlet());
        ticket.setOrder(order);
        ticket.setTicketNumber(generateTicketNumber(order.getOutlet()));
        ticket.setStatus(KitchenTicketStatus.QUEUED);
        ticket.setOrderNumberSnapshot(order.getOrderNumber());
        ticket.setOrderTypeSnapshot(order.getOrderType().name());
        ticket.setCustomerNotesSnapshot(order.getCustomerNotes());

        for (OrderItem orderItem : order.getItems()) {
            KitchenTicketItem ticketItem = new KitchenTicketItem();
            ticketItem.setTenantId(order.getTenantId());
            ticketItem.setOrderItem(orderItem);
            ticketItem.setProductNameSnapshot(orderItem.getProductNameSnapshot());
            ticketItem.setVariantNameSnapshot(orderItem.getVariantNameSnapshot());
            ticketItem.setQuantity(orderItem.getQuantity());
            ticketItem.setItemNotesSnapshot(orderItem.getItemNotes());
            ticketItem.setStatus(KitchenTicketStatus.QUEUED);

            if (orderItem.getAddOns() != null) {
                for (OrderItemAddOn orderAddOn : orderItem.getAddOns()) {
                    KitchenTicketItemAddOn itemAddOn = new KitchenTicketItemAddOn();
                    itemAddOn.setTenantId(order.getTenantId());
                    itemAddOn.setAddOnNameSnapshot(orderAddOn.getAddOnNameSnapshot());
                    ticketItem.addAddOn(itemAddOn);
                }
            }

            ticket.addItem(ticketItem);
        }

        return kitchenTicketRepository.save(ticket);
    }

    /**
     * Creates an add-on Kitchen Order Ticket (KOT) for newly added items to an existing running order.
     * Contains only the new items and references the original order and table.
     */
    @Transactional
    public KitchenTicket createAddOnTicket(UUID orderId, List<OrderItem> newItems) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));

        if (order.getStatus() == OrderStatus.CANCELLED) {
            throw new IllegalStateException("Cannot create add-on kitchen ticket for a cancelled order");
        }

        if (newItems == null || newItems.isEmpty()) {
            return null;
        }

        // Check if an existing ticket exists to append or create linked ticket
        Optional<KitchenTicket> existingTicket = kitchenTicketRepository.findByOrderId(order.getId());

        if (existingTicket.isPresent()) {
            KitchenTicket ticket = existingTicket.get();
            // Append new items to existing ticket with QUEUED status
            for (OrderItem inputItem : newItems) {
                // Find corresponding managed OrderItem from order.getItems()
                OrderItem orderItem = order.getItems().stream()
                        .filter(i -> (inputItem.getId() != null && inputItem.getId().equals(i.getId()))
                                || (i.getProduct().getId().equals(inputItem.getProduct().getId())
                                && (inputItem.getVariant() == null || (i.getVariant() != null && i.getVariant().getId().equals(inputItem.getVariant().getId())))))
                        .findFirst()
                        .orElse(inputItem);

                KitchenTicketItem ticketItem = new KitchenTicketItem();
                ticketItem.setTenantId(order.getTenantId());
                ticketItem.setOrderItem(orderItem);
                ticketItem.setProductNameSnapshot(orderItem.getProductNameSnapshot());
                ticketItem.setVariantNameSnapshot(orderItem.getVariantNameSnapshot());
                ticketItem.setQuantity(orderItem.getQuantity());
                ticketItem.setItemNotesSnapshot(orderItem.getItemNotes());
                ticketItem.setStatus(KitchenTicketStatus.QUEUED);

                if (orderItem.getAddOns() != null) {
                    for (OrderItemAddOn orderAddOn : orderItem.getAddOns()) {
                        KitchenTicketItemAddOn itemAddOn = new KitchenTicketItemAddOn();
                        itemAddOn.setTenantId(order.getTenantId());
                        itemAddOn.setAddOnNameSnapshot(orderAddOn.getAddOnNameSnapshot());
                        ticketItem.addAddOn(itemAddOn);
                    }
                }

                ticket.addItem(ticketItem);
            }

            // If ticket was completed/ready, set back to PREPARING/QUEUED for new items
            if (ticket.getStatus() == KitchenTicketStatus.READY) {
                ticket.setStatus(KitchenTicketStatus.PREPARING);
            }
            return kitchenTicketRepository.save(ticket);
        } else {
            // No previous ticket was released (e.g. was PAY_FIRST), create first ticket
            return createTicketFromOrder(orderId);
        }
    }

    /**
     * Updates ticket status with state machine validation.
     */
    @Transactional
    public KitchenTicket updateTicketStatus(UUID ticketId, KitchenTicketStatus newStatus, String cancellationReason) {
        KitchenTicket ticket = kitchenTicketRepository.findById(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Kitchen ticket not found: " + ticketId));

        if (!ticket.getStatus().canTransitionTo(newStatus)) {
            throw new IllegalStateException(
                    String.format("Invalid status transition from %s to %s", ticket.getStatus(), newStatus));
        }

        if (newStatus == KitchenTicketStatus.CANCELLED) {
            if (cancellationReason == null || cancellationReason.isBlank()) {
                throw new IllegalArgumentException("Cancellation reason is required when cancelling a kitchen ticket");
            }
            ticket.setCancellationReason(cancellationReason);
            // Mark remaining non-ready items as cancelled
            for (KitchenTicketItem item : ticket.getItems()) {
                if (item.getStatus() != KitchenTicketStatus.READY) {
                    item.setStatus(KitchenTicketStatus.CANCELLED);
                }
            }
        } else if (newStatus == KitchenTicketStatus.READY) {
            // Mark all items as READY
            for (KitchenTicketItem item : ticket.getItems()) {
                if (item.getStatus() != KitchenTicketStatus.CANCELLED) {
                    item.setStatus(KitchenTicketStatus.READY);
                }
            }
        } else if (newStatus == KitchenTicketStatus.PREPARING) {
            for (KitchenTicketItem item : ticket.getItems()) {
                if (item.getStatus() == KitchenTicketStatus.QUEUED) {
                    item.setStatus(KitchenTicketStatus.PREPARING);
                }
            }
        }

        ticket.setStatus(newStatus);
        KitchenTicket savedTicket = kitchenTicketRepository.save(ticket);

        // Synchronize Order status where applicable
        if (ticket.getOrder() != null) {
            Order order = ticket.getOrder();
            OrderStatus targetOrderStatus = switch (newStatus) {
                case PREPARING -> OrderStatus.PREPARING;
                case READY -> OrderStatus.READY;
                case CANCELLED -> OrderStatus.CANCELLED;
                default -> null;
            };

            if (targetOrderStatus != null) {
                // If moving to PREPARING and order is in CREATED, allow moving through CONFIRMED if needed, or if canTransitionTo
                if (order.getStatus() == OrderStatus.CREATED && targetOrderStatus == OrderStatus.PREPARING) {
                    order.setStatus(OrderStatus.CONFIRMED);
                    orderRepository.save(order);
                }
                if (order.getStatus().canTransitionTo(targetOrderStatus)) {
                    if (targetOrderStatus == OrderStatus.CANCELLED && (cancellationReason != null && !cancellationReason.isBlank())) {
                        order.setCancellationReason(cancellationReason);
                    }
                    order.setStatus(targetOrderStatus);
                    orderRepository.save(order);
                }
            }
        }

        return savedTicket;
    }

    /**
     * Updates individual item preparation status (e.g., drinks in one order tracked independently).
     */
    @Transactional
    public KitchenTicketItem updateItemStatus(UUID itemId, KitchenTicketStatus newStatus) {
        KitchenTicketItem item = kitchenTicketItemRepository.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException("Kitchen ticket item not found: " + itemId));

        if (!item.getStatus().canTransitionTo(newStatus)) {
            throw new IllegalStateException(
                    String.format("Invalid item status transition from %s to %s", item.getStatus(), newStatus));
        }

        item.setStatus(newStatus);
        KitchenTicketItem savedItem = kitchenTicketItemRepository.save(item);

        // Synchronize parent ticket status:
        KitchenTicket ticket = item.getTicket();
        boolean allReadyOrCancelled = ticket.getItems().stream()
                .allMatch(i -> i.getStatus() == KitchenTicketStatus.READY || i.getStatus() == KitchenTicketStatus.CANCELLED);
        boolean anyPreparing = ticket.getItems().stream()
                .anyMatch(i -> i.getStatus() == KitchenTicketStatus.PREPARING);

        if (allReadyOrCancelled && ticket.getStatus() != KitchenTicketStatus.READY && ticket.getStatus() != KitchenTicketStatus.CANCELLED) {
            ticket.setStatus(KitchenTicketStatus.READY);
            kitchenTicketRepository.save(ticket);
        } else if (anyPreparing && ticket.getStatus() == KitchenTicketStatus.QUEUED) {
            ticket.setStatus(KitchenTicketStatus.PREPARING);
            kitchenTicketRepository.save(ticket);
        }

        return savedItem;
    }

    /**
     * Filters tickets by outlet, status and creation time with pagination.
     */
    @Transactional(readOnly = true)
    public Page<KitchenTicket> listTickets(
            UUID outletId, KitchenTicketStatus status, ZonedDateTime since, Pageable pageable) {
        if (status != null && since != null) {
            return kitchenTicketRepository.findByOutletIdAndStatusAndCreatedAtGreaterThanEqual(outletId, status, since, pageable);
        } else if (status != null) {
            return kitchenTicketRepository.findByOutletIdAndStatus(outletId, status, pageable);
        } else if (since != null) {
            return kitchenTicketRepository.findByOutletIdAndCreatedAtGreaterThanEqual(outletId, since, pageable);
        } else {
            return kitchenTicketRepository.findByOutletId(outletId, pageable);
        }
    }

    private String generateTicketNumber(Outlet outlet) {
        String dateStr = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
        String randomSuffix = UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        return String.format("KOT-%s-%s", dateStr, randomSuffix);
    }
}

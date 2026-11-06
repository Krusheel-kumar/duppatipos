package com.krunnex.restaurant.web;

import com.krunnex.restaurant.domain.Order;
import com.krunnex.restaurant.domain.OrderStatus;
import com.krunnex.restaurant.repository.OrderRepository;
import com.krunnex.restaurant.service.OrderService;
import com.krunnex.restaurant.web.dto.CreateOrderRequest;
import com.krunnex.restaurant.web.dto.OrderStatusUpdateRequest;
import com.krunnex.restaurant.web.dto.UpdateOrderItemsRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {

    private final OrderService orderService;
    private final OrderRepository orderRepository;

    public OrderController(OrderService orderService, OrderRepository orderRepository) {
        this.orderService = orderService;
        this.orderRepository = orderRepository;
    }

    /**
     * Create order with duplicate prevention and server-side calculation.
     */
    @PostMapping
    @PreAuthorize("@tenantAuthorizationService.canAccessOutlet(#request.outletId)")
    public ResponseEntity<Order> createOrder(@Valid @RequestBody CreateOrderRequest request) {
        Order order = orderService.createOrder(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(order);
    }

    /**
     * Get order details by ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<Order> getOrder(@PathVariable UUID id) {
        return orderRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * List orders for a specific outlet with optional status filtering.
     */
    @GetMapping("/outlet/{outletId}")
    @PreAuthorize("@tenantAuthorizationService.canAccessOutlet(#outletId)")
    public List<Order> listOrders(
            @PathVariable UUID outletId,
            @RequestParam(required = false) OrderStatus status) {
        if (status != null) {
            return orderRepository.findByOutletIdAndStatus(outletId, status);
        }
        return orderRepository.findByOutletIdOrderByCreatedAtDesc(outletId);
    }

    /**
     * Update order items (only valid in CREATED status).
     */
    @PutMapping("/{id}/items")
    public ResponseEntity<Order> updateOrderItems(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateOrderItemsRequest request) {
        Order updated = orderService.updateOrderItems(id, request);
        return ResponseEntity.ok(updated);
    }

    /**
     * Submit additional items to an existing running order (Pay Later / Dine-In flow).
     */
    @PostMapping("/{id}/add-items")
    public ResponseEntity<Order> addItemsToRunningOrder(
            @PathVariable UUID id,
            @Valid @RequestBody com.krunnex.restaurant.web.dto.AddOrderItemsRequest request) {
        Order updated = orderService.addItemsToRunningOrder(id, request);
        return ResponseEntity.ok(updated);
    }

    /**
     * Transition order status (e.g., CONFIRMED, PREPARING, READY, COMPLETED, CANCELLED).
     */
    @PatchMapping("/{id}/status")
    public ResponseEntity<Order> updateStatus(
            @PathVariable UUID id,
            @Valid @RequestBody OrderStatusUpdateRequest request) {
        Order updated = orderService.transitionStatus(id, request.getStatus(), request.getCancellationReason());
        return ResponseEntity.ok(updated);
    }
}

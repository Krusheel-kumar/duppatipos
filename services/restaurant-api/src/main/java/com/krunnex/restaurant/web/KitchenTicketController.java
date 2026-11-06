package com.krunnex.restaurant.web;

import com.krunnex.restaurant.domain.KitchenTicket;
import com.krunnex.restaurant.domain.KitchenTicketItem;
import com.krunnex.restaurant.domain.KitchenTicketStatus;
import com.krunnex.restaurant.repository.KitchenTicketRepository;
import com.krunnex.restaurant.service.KitchenTicketService;
import com.krunnex.restaurant.web.dto.KitchenTicketItemStatusUpdateRequest;
import com.krunnex.restaurant.web.dto.KitchenTicketStatusUpdateRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.ZonedDateTime;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/kitchen-tickets")
public class KitchenTicketController {

    private final KitchenTicketService kitchenTicketService;
    private final KitchenTicketRepository kitchenTicketRepository;

    public KitchenTicketController(
            KitchenTicketService kitchenTicketService,
            KitchenTicketRepository kitchenTicketRepository) {
        this.kitchenTicketService = kitchenTicketService;
        this.kitchenTicketRepository = kitchenTicketRepository;
    }

    /**
     * Create/generate KOT from an existing confirmed order.
     */
    @PostMapping("/orders/{orderId}")
    public ResponseEntity<KitchenTicket> createTicket(@PathVariable UUID orderId) {
        KitchenTicket ticket = kitchenTicketService.createTicketFromOrder(orderId);
        return ResponseEntity.status(HttpStatus.CREATED).body(ticket);
    }

    /**
     * Get kitchen ticket details by ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<KitchenTicket> getTicket(@PathVariable UUID id) {
        return kitchenTicketRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Get kitchen ticket by order ID.
     */
    @GetMapping("/order/{orderId}")
    public ResponseEntity<KitchenTicket> getTicketByOrder(@PathVariable UUID orderId) {
        return kitchenTicketRepository.findByOrderId(orderId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * List and filter tickets by outlet, status and creation timestamp with pagination.
     */
    @GetMapping("/outlet/{outletId}")
    @PreAuthorize("@tenantAuthorizationService.canAccessOutlet(#outletId)")
    public Page<KitchenTicket> listOutletTickets(
            @PathVariable UUID outletId,
            @RequestParam(required = false) KitchenTicketStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) ZonedDateTime since,
            Pageable pageable) {
        return kitchenTicketService.listTickets(outletId, status, since, pageable);
    }

    /**
     * Update ticket level status (e.g., PREPARING, READY, CANCELLED).
     */
    @PatchMapping("/{id}/status")
    public ResponseEntity<KitchenTicket> updateTicketStatus(
            @PathVariable UUID id,
            @Valid @RequestBody KitchenTicketStatusUpdateRequest request) {
        KitchenTicket updated = kitchenTicketService.updateTicketStatus(
                id, request.getStatus(), request.getCancellationReason());
        return ResponseEntity.ok(updated);
    }

    /**
     * Update item level preparation status (e.g. mark one beverage as READY).
     */
    @PatchMapping("/items/{itemId}/status")
    public ResponseEntity<KitchenTicketItem> updateItemStatus(
            @PathVariable UUID itemId,
            @Valid @RequestBody KitchenTicketItemStatusUpdateRequest request) {
        KitchenTicketItem updated = kitchenTicketService.updateItemStatus(itemId, request.getStatus());
        return ResponseEntity.ok(updated);
    }
}

package com.krunnex.restaurant.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import org.hibernate.annotations.TenantId;

import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "kitchen_tickets")
public class KitchenTicket {

    @Id
    @GeneratedValue
    private UUID id;

    @TenantId
    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "outlet_id", nullable = false)
    private Outlet outlet;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "order_id", nullable = false, unique = true)
    private Order order;

    @Column(name = "ticket_number", nullable = false, length = 50)
    private String ticketNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private KitchenTicketStatus status = KitchenTicketStatus.QUEUED;

    @Column(name = "order_number_snapshot", nullable = false, length = 50)
    private String orderNumberSnapshot;

    @Column(name = "order_type_snapshot", nullable = false, length = 30)
    private String orderTypeSnapshot;

    @Column(name = "customer_notes_snapshot", columnDefinition = "TEXT")
    private String customerNotesSnapshot;

    @Column(name = "cancellation_reason", columnDefinition = "TEXT")
    private String cancellationReason;

    @OneToMany(mappedBy = "ticket", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JsonIgnoreProperties("ticket")
    private List<KitchenTicketItem> items = new ArrayList<>();

    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt;

    @Column(name = "updated_at")
    private ZonedDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = ZonedDateTime.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = ZonedDateTime.now();
    }

    public void addItem(KitchenTicketItem item) {
        items.add(item);
        item.setTicket(this);
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public Outlet getOutlet() { return outlet; }
    public void setOutlet(Outlet outlet) { this.outlet = outlet; }
    public Order getOrder() { return order; }
    public void setOrder(Order order) { this.order = order; }
    public String getTicketNumber() { return ticketNumber; }
    public void setTicketNumber(String ticketNumber) { this.ticketNumber = ticketNumber; }
    public KitchenTicketStatus getStatus() { return status; }
    public void setStatus(KitchenTicketStatus status) { this.status = status; }
    public String getOrderNumberSnapshot() { return orderNumberSnapshot; }
    public void setOrderNumberSnapshot(String orderNumberSnapshot) { this.orderNumberSnapshot = orderNumberSnapshot; }
    public String getOrderTypeSnapshot() { return orderTypeSnapshot; }
    public void setOrderTypeSnapshot(String orderTypeSnapshot) { this.orderTypeSnapshot = orderTypeSnapshot; }
    public String getCustomerNotesSnapshot() { return customerNotesSnapshot; }
    public void setCustomerNotesSnapshot(String customerNotesSnapshot) { this.customerNotesSnapshot = customerNotesSnapshot; }
    public String getCancellationReason() { return cancellationReason; }
    public void setCancellationReason(String cancellationReason) { this.cancellationReason = cancellationReason; }
    public List<KitchenTicketItem> getItems() { return items; }
    public void setItems(List<KitchenTicketItem> items) { this.items = items; }
    public ZonedDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(ZonedDateTime createdAt) { this.createdAt = createdAt; }
    public ZonedDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(ZonedDateTime updatedAt) { this.updatedAt = updatedAt; }
}

package com.krunnex.restaurant.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import org.hibernate.annotations.TenantId;

import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "kitchen_ticket_items")
public class KitchenTicketItem {

    @Id
    @GeneratedValue
    private UUID id;

    @TenantId
    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_id", nullable = false)
    private KitchenTicket ticket;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_item_id")
    private OrderItem orderItem;

    @Column(name = "product_name_snapshot", nullable = false, length = 200)
    private String productNameSnapshot;

    @Column(name = "variant_name_snapshot", length = 100)
    private String variantNameSnapshot;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "item_notes_snapshot", length = 255)
    private String itemNotesSnapshot;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private KitchenTicketStatus status = KitchenTicketStatus.QUEUED;

    @OneToMany(mappedBy = "ticketItem", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<KitchenTicketItemAddOn> addOns = new ArrayList<>();

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

    public void addAddOn(KitchenTicketItemAddOn itemAddOn) {
        addOns.add(itemAddOn);
        itemAddOn.setTicketItem(this);
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public KitchenTicket getTicket() { return ticket; }
    public void setTicket(KitchenTicket ticket) { this.ticket = ticket; }
    public OrderItem getOrderItem() { return orderItem; }
    public void setOrderItem(OrderItem orderItem) { this.orderItem = orderItem; }
    public String getProductNameSnapshot() { return productNameSnapshot; }
    public void setProductNameSnapshot(String productNameSnapshot) { this.productNameSnapshot = productNameSnapshot; }
    public String getVariantNameSnapshot() { return variantNameSnapshot; }
    public void setVariantNameSnapshot(String variantNameSnapshot) { this.variantNameSnapshot = variantNameSnapshot; }
    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }
    public String getItemNotesSnapshot() { return itemNotesSnapshot; }
    public void setItemNotesSnapshot(String itemNotesSnapshot) { this.itemNotesSnapshot = itemNotesSnapshot; }
    public KitchenTicketStatus getStatus() { return status; }
    public void setStatus(KitchenTicketStatus status) { this.status = status; }
    public List<KitchenTicketItemAddOn> getAddOns() { return addOns; }
    public void setAddOns(List<KitchenTicketItemAddOn> addOns) { this.addOns = addOns; }
    public ZonedDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(ZonedDateTime createdAt) { this.createdAt = createdAt; }
    public ZonedDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(ZonedDateTime updatedAt) { this.updatedAt = updatedAt; }
}

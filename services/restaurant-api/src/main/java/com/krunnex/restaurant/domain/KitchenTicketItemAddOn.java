package com.krunnex.restaurant.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import org.hibernate.annotations.TenantId;

import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "kitchen_ticket_item_add_ons")
public class KitchenTicketItemAddOn {

    @Id
    @GeneratedValue
    private UUID id;

    @TenantId
    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_item_id", nullable = false)
    private KitchenTicketItem ticketItem;

    @Column(name = "add_on_name_snapshot", nullable = false, length = 150)
    private String addOnNameSnapshot;

    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = ZonedDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public KitchenTicketItem getTicketItem() { return ticketItem; }
    public void setTicketItem(KitchenTicketItem ticketItem) { this.ticketItem = ticketItem; }
    public String getAddOnNameSnapshot() { return addOnNameSnapshot; }
    public void setAddOnNameSnapshot(String addOnNameSnapshot) { this.addOnNameSnapshot = addOnNameSnapshot; }
    public ZonedDateTime getCreatedAt() { return createdAt; }
}

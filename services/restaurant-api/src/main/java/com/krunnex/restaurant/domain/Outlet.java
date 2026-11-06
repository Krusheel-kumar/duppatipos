package com.krunnex.restaurant.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.TenantId;
import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "outlets")
public class Outlet {

    @Id
    @GeneratedValue
    private UUID id;

    @TenantId
    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_policy", nullable = false, length = 30)
    private PaymentPolicy paymentPolicy = PaymentPolicy.FLEXIBLE;

    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt;

    @Column(name = "updated_at")
    private ZonedDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = ZonedDateTime.now();
        updatedAt = createdAt;
        if (paymentPolicy == null) {
            paymentPolicy = PaymentPolicy.FLEXIBLE;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = ZonedDateTime.now();
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public PaymentPolicy getPaymentPolicy() { return paymentPolicy; }
    public void setPaymentPolicy(PaymentPolicy paymentPolicy) { this.paymentPolicy = paymentPolicy; }
}

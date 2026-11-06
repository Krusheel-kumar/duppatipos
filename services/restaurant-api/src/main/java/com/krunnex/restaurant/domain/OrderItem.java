package com.krunnex.restaurant.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import org.hibernate.annotations.TenantId;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "order_items")
public class OrderItem {

    @Id
    @GeneratedValue
    private UUID id;

    @TenantId
    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "variant_id")
    private ProductVariant variant;

    @Column(name = "product_name_snapshot", nullable = false, length = 200)
    private String productNameSnapshot;

    @Column(name = "variant_name_snapshot", length = 100)
    private String variantNameSnapshot;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "unit_price_snapshot", nullable = false, precision = 12, scale = 2)
    private BigDecimal unitPriceSnapshot;

    @Column(name = "line_total_snapshot", nullable = false, precision = 12, scale = 2)
    private BigDecimal lineTotalSnapshot;

    @Column(name = "tax_rate_percent_snapshot", nullable = false, precision = 5, scale = 2)
    private BigDecimal taxRatePercentSnapshot = BigDecimal.ZERO;

    @Column(name = "is_tax_inclusive_snapshot", nullable = false)
    private Boolean isTaxInclusiveSnapshot = false;

    @Column(name = "item_tax_snapshot", nullable = false, precision = 12, scale = 2)
    private BigDecimal itemTaxSnapshot = BigDecimal.ZERO;

    @Column(name = "item_notes", length = 255)
    private String itemNotes;

    @OneToMany(mappedBy = "orderItem", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<OrderItemAddOn> addOns = new ArrayList<>();

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

    public void addAddOn(OrderItemAddOn itemAddOn) {
        addOns.add(itemAddOn);
        itemAddOn.setOrderItem(this);
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public Order getOrder() { return order; }
    public void setOrder(Order order) { this.order = order; }
    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }
    public ProductVariant getVariant() { return variant; }
    public void setVariant(ProductVariant variant) { this.variant = variant; }
    public String getProductNameSnapshot() { return productNameSnapshot; }
    public void setProductNameSnapshot(String productNameSnapshot) { this.productNameSnapshot = productNameSnapshot; }
    public String getVariantNameSnapshot() { return variantNameSnapshot; }
    public void setVariantNameSnapshot(String variantNameSnapshot) { this.variantNameSnapshot = variantNameSnapshot; }
    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }
    public BigDecimal getUnitPriceSnapshot() { return unitPriceSnapshot; }
    public void setUnitPriceSnapshot(BigDecimal unitPriceSnapshot) { this.unitPriceSnapshot = unitPriceSnapshot; }
    public BigDecimal getLineTotalSnapshot() { return lineTotalSnapshot; }
    public void setLineTotalSnapshot(BigDecimal lineTotalSnapshot) { this.lineTotalSnapshot = lineTotalSnapshot; }
    public BigDecimal getTaxRatePercentSnapshot() { return taxRatePercentSnapshot; }
    public void setTaxRatePercentSnapshot(BigDecimal taxRatePercentSnapshot) { this.taxRatePercentSnapshot = taxRatePercentSnapshot; }
    public Boolean getIsTaxInclusiveSnapshot() { return isTaxInclusiveSnapshot; }
    public void setIsTaxInclusiveSnapshot(Boolean isTaxInclusiveSnapshot) { this.isTaxInclusiveSnapshot = isTaxInclusiveSnapshot; }
    public BigDecimal getItemTaxSnapshot() { return itemTaxSnapshot; }
    public void setItemTaxSnapshot(BigDecimal itemTaxSnapshot) { this.itemTaxSnapshot = itemTaxSnapshot; }
    public String getItemNotes() { return itemNotes; }
    public void setItemNotes(String itemNotes) { this.itemNotes = itemNotes; }
    public List<OrderItemAddOn> getAddOns() { return addOns; }
    public void setAddOns(List<OrderItemAddOn> addOns) { this.addOns = addOns; }
    public ZonedDateTime getCreatedAt() { return createdAt; }
    public ZonedDateTime getUpdatedAt() { return updatedAt; }
}

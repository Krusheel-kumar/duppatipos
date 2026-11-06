package com.krunnex.restaurant.web.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class CalculationRequest {

    @NotNull(message = "Outlet ID is required")
    private UUID outletId;

    @NotNull(message = "Items list cannot be null")
    private List<ItemRequest> items = new ArrayList<>();

    private UUID discountId;

    public UUID getOutletId() { return outletId; }
    public void setOutletId(UUID outletId) { this.outletId = outletId; }
    public List<ItemRequest> getItems() { return items; }
    public void setItems(List<ItemRequest> items) { this.items = items; }
    public UUID getDiscountId() { return discountId; }
    public void setDiscountId(UUID discountId) { this.discountId = discountId; }

    public static class ItemRequest {
        @NotNull(message = "Product ID is required")
        private UUID productId;

        private UUID variantId;

        private List<UUID> addOnIds = new ArrayList<>();

        @NotNull(message = "Quantity is required")
        @DecimalMin(value = "1", message = "Quantity must be at least 1")
        private Integer quantity = 1;

        public UUID getProductId() { return productId; }
        public void setProductId(UUID productId) { this.productId = productId; }
        public UUID getVariantId() { return variantId; }
        public void setVariantId(UUID variantId) { this.variantId = variantId; }
        public List<UUID> getAddOnIds() { return addOnIds; }
        public void setAddOnIds(List<UUID> addOnIds) { this.addOnIds = addOnIds; }
        public Integer getQuantity() { return quantity; }
        public void setQuantity(Integer quantity) { this.quantity = quantity; }
    }
}

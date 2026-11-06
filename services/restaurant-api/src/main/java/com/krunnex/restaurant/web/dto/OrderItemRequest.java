package com.krunnex.restaurant.web.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class OrderItemRequest {

    @NotNull(message = "Product ID is required")
    private UUID productId;

    private UUID variantId;

    private List<UUID> addOnIds = new ArrayList<>();

    @NotNull(message = "Quantity is required")
    @DecimalMin(value = "1", message = "Quantity must be at least 1")
    private Integer quantity = 1;

    @Size(max = 255, message = "Item notes must not exceed 255 characters")
    private String itemNotes;

    public UUID getProductId() { return productId; }
    public void setProductId(UUID productId) { this.productId = productId; }
    public UUID getVariantId() { return variantId; }
    public void setVariantId(UUID variantId) { this.variantId = variantId; }
    public List<UUID> getAddOnIds() { return addOnIds; }
    public void setAddOnIds(List<UUID> addOnIds) { this.addOnIds = addOnIds; }
    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }
    public String getItemNotes() { return itemNotes; }
    public void setItemNotes(String itemNotes) { this.itemNotes = itemNotes; }
}

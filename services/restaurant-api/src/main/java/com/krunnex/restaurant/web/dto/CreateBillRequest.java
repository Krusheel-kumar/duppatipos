package com.krunnex.restaurant.web.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public class CreateBillRequest {

    @NotNull(message = "Order ID is required")
    private UUID orderId;

    private String notes;

    public UUID getOrderId() {
        return orderId;
    }

    public void setOrderId(UUID orderId) {
        this.orderId = orderId;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}

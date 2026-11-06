package com.krunnex.restaurant.web.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.ArrayList;
import java.util.List;

public class AddOrderItemsRequest {

    private String idempotencyKey;

    @NotEmpty(message = "At least one item must be added")
    @Valid
    private List<OrderItemRequest> items = new ArrayList<>();

    public String getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; }
    public List<OrderItemRequest> getItems() { return items; }
    public void setItems(List<OrderItemRequest> items) { this.items = items; }
}

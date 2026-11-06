package com.krunnex.restaurant.web.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public class PriceOverrideRequest {

    @NotNull(message = "Price is required")
    @DecimalMin(value = "0.00", message = "Price override cannot be negative")
    private BigDecimal price;

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
}

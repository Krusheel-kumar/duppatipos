package com.krunnex.restaurant.web.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public class AddOnRequest {

    @NotBlank(message = "Add-on name is required")
    @Size(max = 150, message = "Add-on name must not exceed 150 characters")
    private String name;

    @NotNull(message = "Add-on price is required")
    @DecimalMin(value = "0.00", message = "Add-on price cannot be negative")
    private BigDecimal price;

    private Boolean isActive = true;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }
}

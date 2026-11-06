package com.krunnex.restaurant.web.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public class TaxRateRequest {

    @NotBlank(message = "Tax rate name is required")
    @Size(max = 100, message = "Tax rate name must not exceed 100 characters")
    private String name;

    @NotNull(message = "Rate percent is required")
    @DecimalMin(value = "0.00", message = "Tax rate percent cannot be negative")
    @DecimalMax(value = "100.00", message = "Tax rate percent cannot exceed 100%")
    private BigDecimal ratePercent;

    private Boolean isInclusive = false;

    private Boolean isActive = true;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public BigDecimal getRatePercent() { return ratePercent; }
    public void setRatePercent(BigDecimal ratePercent) { this.ratePercent = ratePercent; }
    public Boolean getIsInclusive() { return isInclusive; }
    public void setIsInclusive(Boolean isInclusive) { this.isInclusive = isInclusive; }
    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }
}

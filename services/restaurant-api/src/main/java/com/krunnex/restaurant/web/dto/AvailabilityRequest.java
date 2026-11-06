package com.krunnex.restaurant.web.dto;

import jakarta.validation.constraints.NotNull;

public class AvailabilityRequest {

    @NotNull(message = "isAvailable status must be specified")
    private Boolean isAvailable;

    public Boolean getIsAvailable() { return isAvailable; }
    public void setIsAvailable(Boolean isAvailable) { this.isAvailable = isAvailable; }
}

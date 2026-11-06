package com.krunnex.restaurant.web.dto;

import com.krunnex.restaurant.domain.KitchenTicketStatus;
import jakarta.validation.constraints.NotNull;

public class KitchenTicketItemStatusUpdateRequest {

    @NotNull(message = "Status is required")
    private KitchenTicketStatus status;

    public KitchenTicketStatus getStatus() {
        return status;
    }

    public void setStatus(KitchenTicketStatus status) {
        this.status = status;
    }
}

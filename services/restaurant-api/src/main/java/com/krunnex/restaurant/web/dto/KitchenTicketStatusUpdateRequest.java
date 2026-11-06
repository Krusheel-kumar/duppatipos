package com.krunnex.restaurant.web.dto;

import com.krunnex.restaurant.domain.KitchenTicketStatus;
import jakarta.validation.constraints.NotNull;

public class KitchenTicketStatusUpdateRequest {

    @NotNull(message = "Status is required")
    private KitchenTicketStatus status;

    private String cancellationReason;

    public KitchenTicketStatus getStatus() {
        return status;
    }

    public void setStatus(KitchenTicketStatus status) {
        this.status = status;
    }

    public String getCancellationReason() {
        return cancellationReason;
    }

    public void setCancellationReason(String cancellationReason) {
        this.cancellationReason = cancellationReason;
    }
}

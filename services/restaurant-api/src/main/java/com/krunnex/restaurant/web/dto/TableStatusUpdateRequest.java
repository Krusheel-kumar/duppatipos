package com.krunnex.restaurant.web.dto;

import com.krunnex.restaurant.domain.TableStatus;
import jakarta.validation.constraints.NotNull;

public class TableStatusUpdateRequest {

    @NotNull(message = "New table status is required")
    private TableStatus status;

    private String reason;

    public TableStatus getStatus() { return status; }
    public void setStatus(TableStatus status) { this.status = status; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}

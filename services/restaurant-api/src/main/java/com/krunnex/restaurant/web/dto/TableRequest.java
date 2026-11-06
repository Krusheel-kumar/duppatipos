package com.krunnex.restaurant.web.dto;

import com.krunnex.restaurant.domain.TableStatus;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public class TableRequest {

    @NotNull(message = "Outlet ID is required")
    private UUID outletId;

    @NotBlank(message = "Table number is required")
    private String tableNumber;

    private String name;

    @Min(value = 1, message = "Capacity must be at least 1")
    private Integer capacity = 4;

    private TableStatus status = TableStatus.AVAILABLE;

    public UUID getOutletId() { return outletId; }
    public void setOutletId(UUID outletId) { this.outletId = outletId; }
    public String getTableNumber() { return tableNumber; }
    public void setTableNumber(String tableNumber) { this.tableNumber = tableNumber; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Integer getCapacity() { return capacity; }
    public void setCapacity(Integer capacity) { this.capacity = capacity; }
    public TableStatus getStatus() { return status; }
    public void setStatus(TableStatus status) { this.status = status; }
}

package com.krunnex.restaurant.web.dto;

import com.krunnex.restaurant.domain.Order;
import com.krunnex.restaurant.domain.RestaurantTable;
import com.krunnex.restaurant.domain.TableStatus;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.UUID;

public class TableDetailResponse {

    private UUID id;
    private String tableNumber;
    private String name;
    private Integer capacity;
    private TableStatus status;
    private UUID currentOrderId;
    private String orderNumber;
    private ZonedDateTime orderCreatedAt;
    private Long durationMinutes;
    private BigDecimal currentTotal = BigDecimal.ZERO;
    private BigDecimal amountPaid = BigDecimal.ZERO;
    private BigDecimal amountDue = BigDecimal.ZERO;

    public static TableDetailResponse from(RestaurantTable table, Order order, BigDecimal paidAmount) {
        TableDetailResponse resp = new TableDetailResponse();
        resp.setId(table.getId());
        resp.setTableNumber(table.getTableNumber());
        resp.setName(table.getName());
        resp.setCapacity(table.getCapacity());
        resp.setStatus(table.getStatus());

        if (order != null) {
            resp.setCurrentOrderId(order.getId());
            resp.setOrderNumber(order.getOrderNumber());
            resp.setOrderCreatedAt(order.getCreatedAt());
            if (order.getCreatedAt() != null) {
                long duration = java.time.Duration.between(order.getCreatedAt(), ZonedDateTime.now()).toMinutes();
                resp.setDurationMinutes(Math.max(0, duration));
            }
            resp.setCurrentTotal(order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO);
            BigDecimal paid = paidAmount != null ? paidAmount : BigDecimal.ZERO;
            resp.setAmountPaid(paid);
            resp.setAmountDue(resp.getCurrentTotal().subtract(paid).max(BigDecimal.ZERO));
        }

        return resp;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getTableNumber() { return tableNumber; }
    public void setTableNumber(String tableNumber) { this.tableNumber = tableNumber; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Integer getCapacity() { return capacity; }
    public void setCapacity(Integer capacity) { this.capacity = capacity; }
    public TableStatus getStatus() { return status; }
    public void setStatus(TableStatus status) { this.status = status; }
    public UUID getCurrentOrderId() { return currentOrderId; }
    public void setCurrentOrderId(UUID currentOrderId) { this.currentOrderId = currentOrderId; }
    public String getOrderNumber() { return orderNumber; }
    public void setOrderNumber(String orderNumber) { this.orderNumber = orderNumber; }
    public ZonedDateTime getOrderCreatedAt() { return orderCreatedAt; }
    public void setOrderCreatedAt(ZonedDateTime orderCreatedAt) { this.orderCreatedAt = orderCreatedAt; }
    public Long getDurationMinutes() { return durationMinutes; }
    public void setDurationMinutes(Long durationMinutes) { this.durationMinutes = durationMinutes; }
    public BigDecimal getCurrentTotal() { return currentTotal; }
    public void setCurrentTotal(BigDecimal currentTotal) { this.currentTotal = currentTotal; }
    public BigDecimal getAmountPaid() { return amountPaid; }
    public void setAmountPaid(BigDecimal amountPaid) { this.amountPaid = amountPaid; }
    public BigDecimal getAmountDue() { return amountDue; }
    public void setAmountDue(BigDecimal amountDue) { this.amountDue = amountDue; }
}

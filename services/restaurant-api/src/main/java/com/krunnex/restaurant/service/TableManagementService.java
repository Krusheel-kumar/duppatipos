package com.krunnex.restaurant.service;

import com.krunnex.restaurant.domain.*;
import com.krunnex.restaurant.repository.BillRepository;
import com.krunnex.restaurant.repository.OrderRepository;
import com.krunnex.restaurant.repository.OutletRepository;
import com.krunnex.restaurant.repository.RestaurantTableRepository;
import com.krunnex.restaurant.web.dto.TableDetailResponse;
import com.krunnex.restaurant.web.dto.TableRequest;
import com.krunnex.restaurant.web.dto.TableStatusUpdateRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class TableManagementService {

    private final RestaurantTableRepository tableRepository;
    private final OutletRepository outletRepository;
    private final OrderRepository orderRepository;
    private final BillRepository billRepository;

    public TableManagementService(
            RestaurantTableRepository tableRepository,
            OutletRepository outletRepository,
            OrderRepository orderRepository,
            BillRepository billRepository) {
        this.tableRepository = tableRepository;
        this.outletRepository = outletRepository;
        this.orderRepository = orderRepository;
        this.billRepository = billRepository;
    }

    @Transactional(readOnly = true)
    public List<TableDetailResponse> getOutletTables(UUID outletId) {
        List<RestaurantTable> tables = tableRepository.findByOutletIdOrderByTableNumberAsc(outletId);
        List<TableDetailResponse> responses = new ArrayList<>();

        for (RestaurantTable table : tables) {
            Order activeOrder = null;
            BigDecimal paidAmount = BigDecimal.ZERO;

            if (table.getCurrentOrder() != null) {
                activeOrder = orderRepository.findById(table.getCurrentOrder().getId()).orElse(null);
                if (activeOrder != null) {
                    Optional<Bill> billOpt = billRepository.findByOrderId(activeOrder.getId());
                    if (billOpt.isPresent()) {
                        paidAmount = billOpt.get().getPaidAmount();
                    }
                }
            }

            responses.add(TableDetailResponse.from(table, activeOrder, paidAmount));
        }

        return responses;
    }

    @Transactional(readOnly = true)
    public TableDetailResponse getTableDetail(UUID tableId) {
        RestaurantTable table = tableRepository.findById(tableId)
                .orElseThrow(() -> new IllegalArgumentException("Table not found: " + tableId));

        Order activeOrder = null;
        BigDecimal paidAmount = BigDecimal.ZERO;
        if (table.getCurrentOrder() != null) {
            activeOrder = orderRepository.findById(table.getCurrentOrder().getId()).orElse(null);
            if (activeOrder != null) {
                Optional<Bill> billOpt = billRepository.findByOrderId(activeOrder.getId());
                if (billOpt.isPresent()) {
                    paidAmount = billOpt.get().getPaidAmount();
                }
            }
        }

        return TableDetailResponse.from(table, activeOrder, paidAmount);
    }

    @Transactional
    public RestaurantTable createTable(TableRequest request) {
        UUID outletId = request.getOutletId();
        Optional<RestaurantTable> existing = tableRepository.findByOutletIdAndTableNumber(outletId, request.getTableNumber().trim());
        if (existing.isPresent()) {
            throw new IllegalArgumentException("Table number '" + request.getTableNumber() + "' already exists in this outlet");
        }

        Outlet outlet = outletRepository.findByIdWithoutTenantScope(outletId)
                .orElseThrow(() -> new IllegalArgumentException("Outlet not found: " + outletId));

        RestaurantTable table = new RestaurantTable();
        table.setTenantId(outlet.getTenantId());
        table.setOutlet(outlet);
        table.setTableNumber(request.getTableNumber().trim());
        table.setName(request.getName() != null && !request.getName().isBlank() ? request.getName().trim() : "Table " + request.getTableNumber().trim());
        table.setCapacity(request.getCapacity() != null ? request.getCapacity() : 4);
        table.setStatus(TableStatus.AVAILABLE);

        return tableRepository.save(table);
    }

    @Transactional
    public RestaurantTable updateTableStatus(UUID tableId, TableStatusUpdateRequest request) {
        RestaurantTable table = tableRepository.findById(tableId)
                .orElseThrow(() -> new IllegalArgumentException("Table not found: " + tableId));

        TableStatus newStatus = request.getStatus();

        // Enforce state transition rules
        if (!table.getStatus().canTransitionTo(newStatus)) {
            throw new IllegalStateException(String.format("Invalid table status transition from %s to %s", table.getStatus(), newStatus));
        }

        // Business Rule: Do not mark a table available while its order remains unpaid, unless order is completed/cancelled or explicitly cleared
        if (newStatus == TableStatus.AVAILABLE && table.getCurrentOrder() != null) {
            Order currentOrder = orderRepository.findById(table.getCurrentOrder().getId()).orElse(null);
            if (currentOrder != null && currentOrder.getStatus() != OrderStatus.CANCELLED && currentOrder.getStatus() != OrderStatus.COMPLETED) {
                Optional<Bill> billOpt = billRepository.findByOrderId(currentOrder.getId());
                boolean isFullyPaid = billOpt.isPresent() && billOpt.get().getStatus() == BillStatus.PAID;
                if (!isFullyPaid && (request.getReason() == null || request.getReason().isBlank())) {
                    throw new IllegalStateException("Cannot mark table available while order remains unpaid without an authorized exception reason");
                }
            }
            // Clear current order on successful release
            table.setCurrentOrder(null);
        }

        table.setStatus(newStatus);
        return tableRepository.save(table);
    }

    @Transactional
    public void deleteTable(UUID tableId) {
        RestaurantTable table = tableRepository.findById(tableId)
                .orElseThrow(() -> new IllegalArgumentException("Table not found: " + tableId));

        if (table.getStatus() != TableStatus.AVAILABLE && table.getStatus() != TableStatus.CLOSED) {
            throw new IllegalStateException("Cannot delete table while occupied or with active orders. Current status: " + table.getStatus());
        }

        tableRepository.delete(table);
    }
}

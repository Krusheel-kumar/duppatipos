package com.krunnex.restaurant.web;

import com.krunnex.restaurant.domain.RestaurantTable;
import com.krunnex.restaurant.service.TableManagementService;
import com.krunnex.restaurant.web.dto.TableDetailResponse;
import com.krunnex.restaurant.web.dto.TableRequest;
import com.krunnex.restaurant.web.dto.TableStatusUpdateRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/tables")
public class TableController {

    private final TableManagementService tableService;

    public TableController(TableManagementService tableService) {
        this.tableService = tableService;
    }

    @GetMapping("/outlet/{outletId}")
    @PreAuthorize("@tenantAuthorizationService.canAccessOutlet(#outletId)")
    public List<TableDetailResponse> listOutletTables(@PathVariable UUID outletId) {
        return tableService.getOutletTables(outletId);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TableDetailResponse> getTableDetail(@PathVariable UUID id) {
        return ResponseEntity.ok(tableService.getTableDetail(id));
    }

    @PostMapping
    @PreAuthorize("@tenantAuthorizationService.canAccessOutlet(#request.outletId)")
    public ResponseEntity<RestaurantTable> createTable(@Valid @RequestBody TableRequest request) {
        RestaurantTable created = tableService.createTable(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<RestaurantTable> updateTableStatus(
            @PathVariable UUID id,
            @Valid @RequestBody TableStatusUpdateRequest request) {
        RestaurantTable updated = tableService.updateTableStatus(id, request);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTable(@PathVariable UUID id) {
        tableService.deleteTable(id);
        return ResponseEntity.noContent().build();
    }
}

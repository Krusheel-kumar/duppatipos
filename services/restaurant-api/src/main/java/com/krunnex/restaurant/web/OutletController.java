package com.krunnex.restaurant.web;

import com.krunnex.restaurant.domain.Outlet;
import com.krunnex.restaurant.repository.OutletRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/outlets")
public class OutletController {

    private final OutletRepository outletRepository;

    public OutletController(OutletRepository outletRepository) {
        this.outletRepository = outletRepository;
    }

    @GetMapping
    public List<Outlet> listOutlets() {
        return outletRepository.findAll();
    }

    @GetMapping("/{id}")
    @PreAuthorize("@tenantAuthorizationService.canAccessOutlet(#id)")
    public ResponseEntity<Outlet> getOutlet(@PathVariable UUID id) {
        return outletRepository.findByIdWithoutTenantScope(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/payment-policy")
    @PreAuthorize("@tenantAuthorizationService.canAccessOutlet(#id)")
    public ResponseEntity<Outlet> updatePaymentPolicy(
            @PathVariable UUID id,
            @RequestParam com.krunnex.restaurant.domain.PaymentPolicy policy) {
        return outletRepository.findByIdWithoutTenantScope(id)
                .map(outlet -> {
                    outlet.setPaymentPolicy(policy);
                    return ResponseEntity.ok(outletRepository.save(outlet));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}

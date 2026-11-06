package com.krunnex.restaurant.security;

import com.krunnex.restaurant.domain.Outlet;
import com.krunnex.restaurant.repository.OutletMembershipRepository;
import com.krunnex.restaurant.repository.OutletRepository;
import com.krunnex.restaurant.repository.TenantMembershipRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

@Service("tenantAuthorizationService")
public class TenantAuthorizationService {

    private final TenantMembershipRepository tenantMembershipRepository;
    private final OutletMembershipRepository outletMembershipRepository;
    private final OutletRepository outletRepository;

    public TenantAuthorizationService(
            TenantMembershipRepository tenantMembershipRepository,
            OutletMembershipRepository outletMembershipRepository,
            OutletRepository outletRepository) {
        this.tenantMembershipRepository = tenantMembershipRepository;
        this.outletMembershipRepository = outletMembershipRepository;
        this.outletRepository = outletRepository;
    }

    public boolean canAccessTenant(UUID tenantId) {
        if (tenantId == null) {
            return false;
        }
        UUID userId = getCurrentUserId();
        if (userId == null) {
            return false;
        }
        return tenantMembershipRepository.existsByUserIdAndTenantId(userId, tenantId);
    }

    public boolean canAccessOutlet(UUID outletId) {
        if (outletId == null) {
            return false;
        }
        UUID userId = getCurrentUserId();
        if (userId == null) {
            return false;
        }

        // Direct outlet membership
        if (outletMembershipRepository.existsByUserIdAndOutletId(userId, outletId)) {
            return true;
        }

        // Or tenant-level membership for the outlet's tenant
        Optional<Outlet> outlet = outletRepository.findByIdWithoutTenantScope(outletId);
        return outlet.map(o -> tenantMembershipRepository.existsByUserIdAndTenantId(userId, o.getTenantId()))
                .orElse(false);
    }

    public UUID getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal principal) {
            return principal.getId();
        }
        return null;
    }
}

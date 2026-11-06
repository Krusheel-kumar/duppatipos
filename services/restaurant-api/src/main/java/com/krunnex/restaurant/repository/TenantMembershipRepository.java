package com.krunnex.restaurant.repository;

import com.krunnex.restaurant.domain.TenantMembership;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface TenantMembershipRepository extends JpaRepository<TenantMembership, UUID> {
    Optional<TenantMembership> findByUserIdAndTenantId(UUID userId, UUID tenantId);
    boolean existsByUserIdAndTenantId(UUID userId, UUID tenantId);
}

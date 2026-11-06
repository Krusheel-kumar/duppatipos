package com.krunnex.restaurant.repository;

import com.krunnex.restaurant.domain.OutletMembership;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface OutletMembershipRepository extends JpaRepository<OutletMembership, UUID> {
    Optional<OutletMembership> findByUserIdAndOutletId(UUID userId, UUID outletId);
    boolean existsByUserIdAndOutletId(UUID userId, UUID outletId);
}

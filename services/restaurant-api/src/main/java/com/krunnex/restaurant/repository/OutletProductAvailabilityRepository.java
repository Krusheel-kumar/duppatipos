package com.krunnex.restaurant.repository;

import com.krunnex.restaurant.domain.OutletProductAvailability;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OutletProductAvailabilityRepository extends JpaRepository<OutletProductAvailability, UUID> {
    List<OutletProductAvailability> findByOutletId(UUID outletId);
    Optional<OutletProductAvailability> findByOutletIdAndProductId(UUID outletId, UUID productId);
}

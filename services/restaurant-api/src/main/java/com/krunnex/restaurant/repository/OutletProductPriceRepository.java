package com.krunnex.restaurant.repository;

import com.krunnex.restaurant.domain.OutletProductPrice;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OutletProductPriceRepository extends JpaRepository<OutletProductPrice, UUID> {
    List<OutletProductPrice> findByOutletId(UUID outletId);
    Optional<OutletProductPrice> findByOutletIdAndProductId(UUID outletId, UUID productId);
}

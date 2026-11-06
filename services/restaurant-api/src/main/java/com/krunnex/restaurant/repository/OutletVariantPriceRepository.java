package com.krunnex.restaurant.repository;

import com.krunnex.restaurant.domain.OutletVariantPrice;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OutletVariantPriceRepository extends JpaRepository<OutletVariantPrice, UUID> {
    List<OutletVariantPrice> findByOutletId(UUID outletId);
    Optional<OutletVariantPrice> findByOutletIdAndVariantId(UUID outletId, UUID variantId);
}

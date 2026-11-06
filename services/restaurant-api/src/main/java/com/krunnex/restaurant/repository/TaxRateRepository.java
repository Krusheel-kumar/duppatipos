package com.krunnex.restaurant.repository;

import com.krunnex.restaurant.domain.TaxRate;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TaxRateRepository extends JpaRepository<TaxRate, UUID> {
    List<TaxRate> findByIsActiveTrue();
    Optional<TaxRate> findByName(String name);
}

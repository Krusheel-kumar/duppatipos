package com.krunnex.restaurant.repository;

import com.krunnex.restaurant.domain.Discount;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DiscountRepository extends JpaRepository<Discount, UUID> {
    List<Discount> findByIsActiveTrue();
    Optional<Discount> findByName(String name);
}

package com.krunnex.restaurant.repository;

import com.krunnex.restaurant.domain.ProductCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProductCategoryRepository extends JpaRepository<ProductCategory, UUID> {
    List<ProductCategory> findByIsActiveTrueOrderByDisplayOrderAsc();
    Optional<ProductCategory> findByName(String name);
}

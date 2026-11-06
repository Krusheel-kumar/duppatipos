package com.krunnex.restaurant.repository;

import com.krunnex.restaurant.domain.Outlet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;
import java.util.UUID;

public interface OutletRepository extends JpaRepository<Outlet, UUID> {

    @Query(value = "SELECT * FROM outlets WHERE id = :id", nativeQuery = true)
    Optional<Outlet> findByIdWithoutTenantScope(@Param("id") UUID id);
}

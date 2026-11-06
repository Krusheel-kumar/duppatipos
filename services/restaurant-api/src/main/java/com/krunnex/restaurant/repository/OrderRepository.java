package com.krunnex.restaurant.repository;

import com.krunnex.restaurant.domain.Order;
import com.krunnex.restaurant.domain.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrderRepository extends JpaRepository<Order, UUID> {
    List<Order> findByOutletIdOrderByCreatedAtDesc(UUID outletId);
    List<Order> findByOutletIdAndStatus(UUID outletId, OrderStatus status);
    Optional<Order> findByOutletIdAndIdempotencyKey(UUID outletId, String idempotencyKey);
    Optional<Order> findByOrderNumber(String orderNumber);

    @Query(value = "SELECT * FROM orders WHERE id = :id", nativeQuery = true)
    Optional<Order> findByIdWithoutTenantScope(@Param("id") UUID id);
}

package com.krunnex.restaurant.repository;

import com.krunnex.restaurant.domain.Payment;
import com.krunnex.restaurant.domain.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    List<Payment> findByBillIdOrderByCreatedAtAsc(UUID billId);

    List<Payment> findByOutletIdAndStatus(UUID outletId, PaymentStatus status);

    Optional<Payment> findByOutletIdAndIdempotencyKey(UUID outletId, String idempotencyKey);

    @Query(value = "SELECT * FROM payments WHERE id = :id", nativeQuery = true)
    Optional<Payment> findByIdWithoutTenantScope(@Param("id") UUID id);
}

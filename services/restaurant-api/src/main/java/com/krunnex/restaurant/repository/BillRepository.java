package com.krunnex.restaurant.repository;

import com.krunnex.restaurant.domain.Bill;
import com.krunnex.restaurant.domain.BillStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BillRepository extends JpaRepository<Bill, UUID> {

    Optional<Bill> findByOrderId(UUID orderId);

    Optional<Bill> findByInvoiceNumber(String invoiceNumber);

    List<Bill> findByOutletIdOrderByCreatedAtDesc(UUID outletId);

    List<Bill> findByOutletIdAndStatus(UUID outletId, BillStatus status);

    @Query(value = "SELECT * FROM bills WHERE id = :id", nativeQuery = true)
    Optional<Bill> findByIdWithoutTenantScope(@Param("id") UUID id);

    @Query(value = "SELECT * FROM bills WHERE order_id = :orderId", nativeQuery = true)
    Optional<Bill> findByOrderIdWithoutTenantScope(@Param("orderId") UUID orderId);
}

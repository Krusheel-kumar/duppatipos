package com.krunnex.restaurant.repository;

import com.krunnex.restaurant.domain.KitchenTicket;
import com.krunnex.restaurant.domain.KitchenTicketStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.ZonedDateTime;
import java.util.Optional;
import java.util.UUID;

public interface KitchenTicketRepository extends JpaRepository<KitchenTicket, UUID> {

    Optional<KitchenTicket> findByOrderId(UUID orderId);

    Optional<KitchenTicket> findByOutletIdAndTicketNumber(UUID outletId, String ticketNumber);

    Page<KitchenTicket> findByOutletId(UUID outletId, Pageable pageable);

    Page<KitchenTicket> findByOutletIdAndStatus(UUID outletId, KitchenTicketStatus status, Pageable pageable);

    Page<KitchenTicket> findByOutletIdAndCreatedAtGreaterThanEqual(UUID outletId, ZonedDateTime createdAt, Pageable pageable);

    Page<KitchenTicket> findByOutletIdAndStatusAndCreatedAtGreaterThanEqual(
            UUID outletId, KitchenTicketStatus status, ZonedDateTime createdAt, Pageable pageable);

    @Query(value = "SELECT * FROM kitchen_tickets WHERE id = :id", nativeQuery = true)
    Optional<KitchenTicket> findByIdWithoutTenantScope(@Param("id") UUID id);

    @Query(value = "SELECT * FROM kitchen_tickets WHERE order_id = :orderId", nativeQuery = true)
    Optional<KitchenTicket> findByOrderIdWithoutTenantScope(@Param("orderId") UUID orderId);
}

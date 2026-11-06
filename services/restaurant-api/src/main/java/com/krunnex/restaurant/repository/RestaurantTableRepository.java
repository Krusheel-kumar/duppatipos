package com.krunnex.restaurant.repository;

import com.krunnex.restaurant.domain.RestaurantTable;
import com.krunnex.restaurant.domain.TableStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RestaurantTableRepository extends JpaRepository<RestaurantTable, UUID> {

    List<RestaurantTable> findByOutletIdOrderByTableNumberAsc(UUID outletId);

    List<RestaurantTable> findByOutletIdAndStatus(UUID outletId, TableStatus status);

    Optional<RestaurantTable> findByOutletIdAndTableNumber(UUID outletId, String tableNumber);

    Optional<RestaurantTable> findByCurrentOrderId(UUID currentOrderId);
}

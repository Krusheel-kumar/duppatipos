package com.krunnex.restaurant.repository;

import com.krunnex.restaurant.domain.KitchenTicketItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface KitchenTicketItemRepository extends JpaRepository<KitchenTicketItem, UUID> {
}

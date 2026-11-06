package com.krunnex.restaurant.repository;

import com.krunnex.restaurant.domain.AddOn;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface AddOnRepository extends JpaRepository<AddOn, UUID> {
    List<AddOn> findByIsActiveTrue();
}

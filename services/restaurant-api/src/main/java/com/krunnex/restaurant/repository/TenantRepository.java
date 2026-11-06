package com.krunnex.restaurant.repository;

import com.krunnex.restaurant.domain.Tenant;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface TenantRepository extends JpaRepository<Tenant, UUID> {
}

package com.krunnex.restaurant;

import com.krunnex.restaurant.domain.Outlet;
import com.krunnex.restaurant.domain.Tenant;
import com.krunnex.restaurant.repository.OutletRepository;
import com.krunnex.restaurant.repository.TenantRepository;
import com.krunnex.restaurant.security.TenantContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class MultiTenantDataIsolationTest {

    @Autowired
    private TenantRepository tenantRepository;

    @Autowired
    private OutletRepository outletRepository;

    private Tenant tenant1;
    private Tenant tenant2;

    @BeforeEach
    void setup() {
        // Run as super admin (null or system tenant) to setup
        // But since we use Hibernate 6 TenantId, it will enforce tenant if configured.
        // If TenantIdentifierResolver returns a default, it will be saved there.
        // To save tenants themselves, they are not tenant-scoped!
        // But Outlets ARE tenant scoped.
        
        tenant1 = new Tenant();
        tenant1.setName("Tenant One");
        tenant1.setDomain("t1-" + java.util.UUID.randomUUID() + ".local");
        tenant1 = tenantRepository.save(tenant1);

        tenant2 = new Tenant();
        tenant2.setName("Tenant Two");
        tenant2.setDomain("t2-" + java.util.UUID.randomUUID() + ".local");
        tenant2 = tenantRepository.save(tenant2);

        TenantContext.setTenantId(tenant1.getId());
        Outlet outlet1 = new Outlet();
        outlet1.setName("Outlet One - T1");
        outlet1.setTenantId(tenant1.getId()); // Not strictly needed if Hibernate intercepts, but good to set
        outletRepository.saveAndFlush(outlet1);
        
        TenantContext.setTenantId(tenant2.getId());
        Outlet outlet2 = new Outlet();
        outlet2.setName("Outlet Two - T2");
        outlet2.setTenantId(tenant2.getId());
        outletRepository.saveAndFlush(outlet2);
        
        TenantContext.clear();
    }

    @Test
    
    void givenTenant1_whenFindAllOutlets_thenOnlyTenant1OutletsReturned() {
        TenantContext.setTenantId(tenant1.getId());
        
        List<Outlet> outlets = outletRepository.findAll();
        
        assertThat(outlets).hasSize(1);
        assertThat(outlets.get(0).getName()).isEqualTo("Outlet One - T1");
        
        TenantContext.clear();
    }

    @Test
    
    void givenTenant2_whenFindAllOutlets_thenOnlyTenant2OutletsReturned() {
        TenantContext.setTenantId(tenant2.getId());
        
        List<Outlet> outlets = outletRepository.findAll();
        
        assertThat(outlets).hasSize(1);
        assertThat(outlets.get(0).getName()).isEqualTo("Outlet Two - T2");
        
        TenantContext.clear();
    }
}

package com.krunnex.restaurant;

import com.krunnex.restaurant.domain.*;
import com.krunnex.restaurant.repository.*;
import com.krunnex.restaurant.security.TenantContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.util.Collections;
import java.util.UUID;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
class MultiTenantSecurityAndAuthorizationTest {

    @Autowired
    private WebApplicationContext context;

    private MockMvc mockMvc;

    @Autowired
    private TenantRepository tenantRepository;

    @Autowired
    private OutletRepository outletRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private TenantMembershipRepository tenantMembershipRepository;

    @Autowired
    private OutletMembershipRepository outletMembershipRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private Tenant tenantA;
    private Tenant tenantB;

    private Outlet outletA1;
    private Outlet outletA2;
    private Outlet outletB1;

    private User userTenantAOnly;
    private User userOutletA1Only;
    private String rawPassword = "password123";

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(context)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();

        // Setup Tenant A and B
        tenantA = new Tenant();
        tenantA.setName("Tenant A");
        tenantA.setDomain("tenant-a-" + UUID.randomUUID() + ".local");
        tenantA = tenantRepository.save(tenantA);

        tenantB = new Tenant();
        tenantB.setName("Tenant B");
        tenantB.setDomain("tenant-b-" + UUID.randomUUID() + ".local");
        tenantB = tenantRepository.save(tenantB);

        // Setup Outlets
        TenantContext.setTenantId(tenantA.getId());
        outletA1 = new Outlet();
        outletA1.setName("Outlet A1");
        outletA1.setTenantId(tenantA.getId());
        outletA1 = outletRepository.saveAndFlush(outletA1);

        outletA2 = new Outlet();
        outletA2.setName("Outlet A2");
        outletA2.setTenantId(tenantA.getId());
        outletA2 = outletRepository.saveAndFlush(outletA2);

        TenantContext.setTenantId(tenantB.getId());
        outletB1 = new Outlet();
        outletB1.setName("Outlet B1");
        outletB1.setTenantId(tenantB.getId());
        outletB1 = outletRepository.saveAndFlush(outletB1);
        TenantContext.clear();

        // Setup Role
        Role managerRole = new Role();
        managerRole.setName("MANAGER-" + UUID.randomUUID());
        managerRole.setTenantId(tenantA.getId());
        managerRole.setPermissions(Collections.emptySet());
        managerRole = roleRepository.save(managerRole);

        // User 1: Has membership in Tenant A (all outlets in Tenant A accessible)
        userTenantAOnly = new User();
        userTenantAOnly.setEmail("user-a-" + UUID.randomUUID() + "@example.com");
        userTenantAOnly.setPasswordHash(passwordEncoder.encode(rawPassword));
        userTenantAOnly.setFirstName("Alice");
        userTenantAOnly.setLastName("TenantA");
        userTenantAOnly = userRepository.save(userTenantAOnly);

        TenantMembership tmA = new TenantMembership();
        tmA.setUser(userTenantAOnly);
        tmA.setTenant(tenantA);
        tmA.setRole(managerRole);
        tenantMembershipRepository.save(tmA);

        // User 2: Only has outlet membership in Outlet A1 (not A2, not B1)
        userOutletA1Only = new User();
        userOutletA1Only.setEmail("user-outlet-a1-" + UUID.randomUUID() + "@example.com");
        userOutletA1Only.setPasswordHash(passwordEncoder.encode(rawPassword));
        userOutletA1Only.setFirstName("Bob");
        userOutletA1Only.setLastName("OutletA1");
        userOutletA1Only = userRepository.save(userOutletA1Only);

        OutletMembership omA1 = new OutletMembership();
        omA1.setUser(userOutletA1Only);
        omA1.setOutlet(outletA1);
        omA1.setRole(managerRole);
        outletMembershipRepository.save(omA1);
    }

    @Test
    void unauthenticatedRequest_shouldBeRejectedWith401() throws Exception {
        mockMvc.perform(get("/api/v1/outlets"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void userWithTenantAMembership_whenAccessingWithTenantAHeader_shouldSucceed() throws Exception {
        mockMvc.perform(get("/api/v1/outlets")
                        .with(httpBasic(userTenantAOnly.getEmail(), rawPassword))
                        .header("X-Tenant-ID", tenantA.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void userWithTenantAMembership_whenSupplyingUnauthorizedTenantBHeader_shouldBeForbidden() throws Exception {
        // Server-side check verifies client-supplied tenant ID against memberships
        mockMvc.perform(get("/api/v1/outlets")
                        .with(httpBasic(userTenantAOnly.getEmail(), rawPassword))
                        .header("X-Tenant-ID", tenantB.getId().toString()))
                .andExpect(status().isForbidden());
    }

    @Test
    void userWithOutletA1Membership_canAccessOutletA1_butForbiddenFromOutletA2AndB1() throws Exception {
        // Can access Outlet A1
        mockMvc.perform(get("/api/v1/outlets/" + outletA1.getId())
                        .with(httpBasic(userOutletA1Only.getEmail(), rawPassword)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Outlet A1"));

        // Cannot access Outlet A2 (Forbidden)
        mockMvc.perform(get("/api/v1/outlets/" + outletA2.getId())
                        .with(httpBasic(userOutletA1Only.getEmail(), rawPassword)))
                .andExpect(status().isForbidden());

        // Cannot access Tenant B's Outlet B1 (Forbidden)
        mockMvc.perform(get("/api/v1/outlets/" + outletB1.getId())
                        .with(httpBasic(userOutletA1Only.getEmail(), rawPassword)))
                .andExpect(status().isForbidden());
    }
}

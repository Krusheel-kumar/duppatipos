package com.krunnex.restaurant;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.krunnex.restaurant.domain.*;
import com.krunnex.restaurant.repository.*;
import com.krunnex.restaurant.security.TenantContext;
import com.krunnex.restaurant.web.dto.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.math.BigDecimal;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
class CatalogManagementTest {

    @Autowired
    private WebApplicationContext context;

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
    private ProductCategoryRepository categoryRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private AddOnRepository addOnRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private MockMvc mockMvc;

    private Tenant tenant1;
    private Tenant tenant2;

    private Outlet outletT1;
    private Outlet outletT2;

    private User userT1;
    private User userT2;
    private String password = "password123";

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(context)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();

        // Create Tenant 1
        tenant1 = new Tenant();
        tenant1.setName("Boba House");
        tenant1.setDomain("boba-" + UUID.randomUUID() + ".local");
        tenant1 = tenantRepository.save(tenant1);

        // Create Tenant 2
        tenant2 = new Tenant();
        tenant2.setName("Coffee Corner");
        tenant2.setDomain("coffee-" + UUID.randomUUID() + ".local");
        tenant2 = tenantRepository.save(tenant2);

        // Outlets
        TenantContext.setTenantId(tenant1.getId());
        outletT1 = new Outlet();
        outletT1.setName("Boba House - Downtown");
        outletT1.setTenantId(tenant1.getId());
        outletT1 = outletRepository.saveAndFlush(outletT1);

        TenantContext.setTenantId(tenant2.getId());
        outletT2 = new Outlet();
        outletT2.setName("Coffee Corner - Uptown");
        outletT2.setTenantId(tenant2.getId());
        outletT2 = outletRepository.saveAndFlush(outletT2);
        TenantContext.clear();

        // Roles
        Role roleT1 = new Role();
        roleT1.setName("MANAGER-" + UUID.randomUUID());
        roleT1.setTenantId(tenant1.getId());
        roleT1.setPermissions(Collections.emptySet());
        roleT1 = roleRepository.save(roleT1);

        Role roleT2 = new Role();
        roleT2.setName("MANAGER-" + UUID.randomUUID());
        roleT2.setTenantId(tenant2.getId());
        roleT2.setPermissions(Collections.emptySet());
        roleT2 = roleRepository.save(roleT2);

        // Users
        userT1 = new User();
        userT1.setEmail("manager-t1-" + UUID.randomUUID() + "@example.com");
        userT1.setPasswordHash(passwordEncoder.encode(password));
        userT1.setFirstName("Alice");
        userT1.setLastName("Boba");
        userT1 = userRepository.save(userT1);

        TenantMembership tm1 = new TenantMembership();
        tm1.setUser(userT1);
        tm1.setTenant(tenant1);
        tm1.setRole(roleT1);
        tenantMembershipRepository.save(tm1);

        userT2 = new User();
        userT2.setEmail("manager-t2-" + UUID.randomUUID() + "@example.com");
        userT2.setPasswordHash(passwordEncoder.encode(password));
        userT2.setFirstName("Charlie");
        userT2.setLastName("Coffee");
        userT2 = userRepository.save(userT2);

        TenantMembership tm2 = new TenantMembership();
        tm2.setUser(userT2);
        tm2.setTenant(tenant2);
        tm2.setRole(roleT2);
        tenantMembershipRepository.save(tm2);
    }

    @Test
    void testCategoryCRUD_andDeactivation() throws Exception {
        CategoryRequest request = new CategoryRequest();
        request.setName("Boba Beverages");
        request.setDescription("Fresh tea with tapioca pearls");
        request.setDisplayOrder(1);

        // Create Category under Tenant 1
        String responseJson = mockMvc.perform(post("/api/v1/categories")
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Boba Beverages"))
                .andExpect(jsonPath("$.isActive").value(true))
                .andReturn().getResponse().getContentAsString();

        String createdId = objectMapper.readTree(responseJson).get("id").asText();

        // Update Category
        request.setName("Boba Teas & Beverages");
        mockMvc.perform(put("/api/v1/categories/" + createdId)
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Boba Teas & Beverages"));

        // Deactivate Category
        mockMvc.perform(patch("/api/v1/categories/" + createdId + "/deactivate")
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isActive").value(false));
    }

    @Test
    void testProductCreationWithVariantsAndAddons() throws Exception {
        // 1. Create Category under Tenant 1
        TenantContext.setTenantId(tenant1.getId());
        ProductCategory cat = new ProductCategory();
        cat.setName("Milk Tea " + UUID.randomUUID());
        cat.setTenantId(tenant1.getId());
        cat = categoryRepository.saveAndFlush(cat);

        // 2. Create Add-on under Tenant 1
        AddOn bobaPearl = new AddOn();
        bobaPearl.setName("Brown Sugar Boba Pearls");
        bobaPearl.setPrice(new BigDecimal("0.75"));
        bobaPearl.setTenantId(tenant1.getId());
        bobaPearl = addOnRepository.saveAndFlush(bobaPearl);
        TenantContext.clear();

        // 3. Build ProductRequest with variants (e.g. 300 ml, 475 ml)
        ProductRequest productReq = new ProductRequest();
        productReq.setCategoryId(cat.getId());
        productReq.setName("Classic Brown Sugar Boba");
        productReq.setDescription("Fresh milk, black tea, brown sugar pearls");
        productReq.setSku("BS-BOBA-01");
        productReq.setImageUrl("https://example.com/images/boba.png");
        productReq.setBasePrice(new BigDecimal("5.50"));
        productReq.setAddOnIds(Set.of(bobaPearl.getId()));

        VariantRequest variant300 = new VariantRequest();
        variant300.setName("Regular 300ml");
        variant300.setSizeLabel("300 ml");
        variant300.setSku("BS-BOBA-300");
        variant300.setPrice(new BigDecimal("5.50"));

        VariantRequest variant475 = new VariantRequest();
        variant475.setName("Large 475ml");
        variant475.setSizeLabel("475 ml");
        variant475.setSku("BS-BOBA-475");
        variant475.setPrice(new BigDecimal("6.50"));

        productReq.setVariants(List.of(variant300, variant475));

        // Create Product via REST API
        String productResponse = mockMvc.perform(post("/api/v1/products")
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(productReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Classic Brown Sugar Boba"))
                .andExpect(jsonPath("$.variants.length()").value(2))
                .andExpect(jsonPath("$.addOns.length()").value(1))
                .andReturn().getResponse().getContentAsString();

        String createdProductId = objectMapper.readTree(productResponse).get("id").asText();

        // Verify retrieval
        mockMvc.perform(get("/api/v1/products/" + createdProductId)
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sku").value("BS-BOBA-01"))
                .andExpect(jsonPath("$.basePrice").value(5.50));
    }

    @Test
    void testPriceValidation_rejectsNegativePrice() throws Exception {
        AddOnRequest addOnRequest = new AddOnRequest();
        addOnRequest.setName("Extra Syrup");
        addOnRequest.setPrice(new BigDecimal("-1.00")); // Negative price

        mockMvc.perform(post("/api/v1/addons")
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(addOnRequest)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testCrossTenantIsolation_cannotViewOrModifyOtherTenantCatalog() throws Exception {
        // Create Product under Tenant 1
        TenantContext.setTenantId(tenant1.getId());
        ProductCategory cat1 = new ProductCategory();
        cat1.setName("Coffee " + UUID.randomUUID());
        cat1.setTenantId(tenant1.getId());
        cat1 = categoryRepository.saveAndFlush(cat1);

        Product prod1 = new Product();
        prod1.setCategory(cat1);
        prod1.setName("Espresso Roast");
        prod1.setBasePrice(new BigDecimal("3.00"));
        prod1.setTenantId(tenant1.getId());
        prod1 = productRepository.saveAndFlush(prod1);
        TenantContext.clear();

        // User T2 (Tenant 2) accesses Tenant 2 - should NOT see Tenant 1's products
        mockMvc.perform(get("/api/v1/products/" + prod1.getId())
                        .with(httpBasic(userT2.getEmail(), password))
                        .header("X-Tenant-ID", tenant2.getId().toString()))
                .andExpect(status().isNotFound());

        // User T2 attempts to access Tenant 1 header - rejected with 403 Forbidden by TenantFilter
        mockMvc.perform(get("/api/v1/products/" + prod1.getId())
                        .with(httpBasic(userT2.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString()))
                .andExpect(status().isForbidden());
    }

    @Test
    void testOutletSpecificProductAvailabilityOverride() throws Exception {
        // Create Product under Tenant 1
        TenantContext.setTenantId(tenant1.getId());
        ProductCategory cat = new ProductCategory();
        cat.setName("Seasonal " + UUID.randomUUID());
        cat.setTenantId(tenant1.getId());
        cat = categoryRepository.saveAndFlush(cat);

        Product prod = new Product();
        prod.setCategory(cat);
        prod.setName("Pumpkin Spice Boba");
        prod.setBasePrice(new BigDecimal("6.00"));
        prod.setTenantId(tenant1.getId());
        prod = productRepository.saveAndFlush(prod);
        TenantContext.clear();

        AvailabilityRequest availReq = new AvailabilityRequest();
        availReq.setIsAvailable(false); // Mark out of stock at Outlet T1

        // User T1 has access to Outlet T1
        mockMvc.perform(put("/api/v1/products/" + prod.getId() + "/availability/" + outletT1.getId())
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(availReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isAvailable").value(false));

        // User T1 attempting to override availability for an outlet in Tenant 2 (Outlet T2) should be Forbidden (403)
        mockMvc.perform(put("/api/v1/products/" + prod.getId() + "/availability/" + outletT2.getId())
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(availReq)))
                .andExpect(status().isForbidden());
    }
}

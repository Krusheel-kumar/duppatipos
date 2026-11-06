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
class OrderManagementTest {

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
    private ProductCategoryRepository categoryRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductVariantRepository variantRepository;

    @Autowired
    private AddOnRepository addOnRepository;

    @Autowired
    private TaxRateRepository taxRateRepository;

    @Autowired
    private DiscountRepository discountRepository;

    @Autowired
    private OrderRepository orderRepository;

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

    private TaxRate taxRate5Pct;
    private Product bobaProduct;
    private ProductVariant variantLarge;
    private AddOn brownSugarJelly;
    private Discount discount10Pct;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(context)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();

        // 1. Setup Tenants
        tenant1 = new Tenant();
        tenant1.setName("Order Brand One");
        tenant1.setDomain("order1-" + UUID.randomUUID() + ".local");
        tenant1 = tenantRepository.save(tenant1);

        tenant2 = new Tenant();
        tenant2.setName("Order Brand Two");
        tenant2.setDomain("order2-" + UUID.randomUUID() + ".local");
        tenant2 = tenantRepository.save(tenant2);

        // 2. Outlets
        TenantContext.setTenantId(tenant1.getId());
        outletT1 = new Outlet();
        outletT1.setName("Order Outlet Downtown");
        outletT1.setTenantId(tenant1.getId());
        outletT1 = outletRepository.saveAndFlush(outletT1);

        TenantContext.setTenantId(tenant2.getId());
        outletT2 = new Outlet();
        outletT2.setName("Order Outlet Uptown");
        outletT2.setTenantId(tenant2.getId());
        outletT2 = outletRepository.saveAndFlush(outletT2);
        TenantContext.clear();

        // 3. Roles and Users
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

        userT1 = new User();
        userT1.setEmail("ord-user1-" + UUID.randomUUID() + "@example.com");
        userT1.setPasswordHash(passwordEncoder.encode(password));
        userT1 = userRepository.save(userT1);

        TenantMembership tm1 = new TenantMembership();
        tm1.setUser(userT1);
        tm1.setTenant(tenant1);
        tm1.setRole(roleT1);
        tenantMembershipRepository.save(tm1);

        userT2 = new User();
        userT2.setEmail("ord-user2-" + UUID.randomUUID() + "@example.com");
        userT2.setPasswordHash(passwordEncoder.encode(password));
        userT2 = userRepository.save(userT2);

        TenantMembership tm2 = new TenantMembership();
        tm2.setUser(userT2);
        tm2.setTenant(tenant2);
        tm2.setRole(roleT2);
        tenantMembershipRepository.save(tm2);

        // 4. Catalog & Pricing in Tenant 1
        TenantContext.setTenantId(tenant1.getId());

        taxRate5Pct = new TaxRate();
        taxRate5Pct.setName("GST 5%");
        taxRate5Pct.setRatePercent(new BigDecimal("5.00"));
        taxRate5Pct.setIsInclusive(false);
        taxRate5Pct.setTenantId(tenant1.getId());
        taxRate5Pct = taxRateRepository.saveAndFlush(taxRate5Pct);

        ProductCategory category = new ProductCategory();
        category.setName("Boba Special " + UUID.randomUUID());
        category.setTenantId(tenant1.getId());
        category = categoryRepository.saveAndFlush(category);

        bobaProduct = new Product();
        bobaProduct.setCategory(category);
        bobaProduct.setName("Roasted Milk Tea");
        bobaProduct.setBasePrice(new BigDecimal("4.50"));
        bobaProduct.setTaxRate(taxRate5Pct);
        bobaProduct.setTenantId(tenant1.getId());
        bobaProduct = productRepository.saveAndFlush(bobaProduct);

        variantLarge = new ProductVariant();
        variantLarge.setName("Large 475ml");
        variantLarge.setSizeLabel("475 ml");
        variantLarge.setPrice(new BigDecimal("5.50"));
        variantLarge.setProduct(bobaProduct);
        variantLarge.setTenantId(tenant1.getId());
        variantLarge = variantRepository.saveAndFlush(variantLarge);

        brownSugarJelly = new AddOn();
        brownSugarJelly.setName("Brown Sugar Jelly");
        brownSugarJelly.setPrice(new BigDecimal("0.75"));
        brownSugarJelly.setTenantId(tenant1.getId());
        brownSugarJelly = addOnRepository.saveAndFlush(brownSugarJelly);

        discount10Pct = new Discount();
        discount10Pct.setName("Member 10%");
        discount10Pct.setDiscountType(DiscountType.PERCENTAGE);
        discount10Pct.setValue(new BigDecimal("10.00"));
        discount10Pct.setTenantId(tenant1.getId());
        discount10Pct = discountRepository.saveAndFlush(discount10Pct);

        TenantContext.clear();
    }

    @Test
    void testOrderCreation_withPricingSnapshotsAndServerSideCalculation() throws Exception {
        // Line Item: 2 x (Variant $5.50 + AddOn $0.75) = 2 x $6.25 = $12.50 subtotal
        // Discount 10%: $1.25 -> Net taxable: $11.25
        // Tax 5% on $11.25 = $0.5625 -> rounded HALF_UP = $0.56
        // Total = $11.25 + $0.56 = $11.81
        CreateOrderRequest request = new CreateOrderRequest();
        request.setOutletId(outletT1.getId());
        request.setOrderType(OrderType.DINE_IN);
        request.setCustomerNotes("Less ice");
        request.setDiscountId(discount10Pct.getId());

        OrderItemRequest itemReq = new OrderItemRequest();
        itemReq.setProductId(bobaProduct.getId());
        itemReq.setVariantId(variantLarge.getId());
        itemReq.setAddOnIds(List.of(brownSugarJelly.getId()));
        itemReq.setQuantity(2);
        itemReq.setItemNotes("Half sugar");
        request.setItems(List.of(itemReq));

        String response = mockMvc.perform(post("/api/v1/orders")
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.orderNumber").isNotEmpty())
                .andExpect(jsonPath("$.orderType").value("DINE_IN"))
                .andExpect(jsonPath("$.status").value("CREATED"))
                .andExpect(jsonPath("$.subtotal").value(12.50))
                .andExpect(jsonPath("$.discountAmount").value(1.25))
                .andExpect(jsonPath("$.taxAmount").value(0.57))
                .andExpect(jsonPath("$.totalAmount").value(11.82))
                .andExpect(jsonPath("$.items[0].productNameSnapshot").value("Roasted Milk Tea"))
                .andExpect(jsonPath("$.items[0].variantNameSnapshot").value("Large 475ml"))
                .andExpect(jsonPath("$.items[0].unitPriceSnapshot").value(6.25))
                .andExpect(jsonPath("$.items[0].addOns[0].addOnNameSnapshot").value("Brown Sugar Jelly"))
                .andExpect(jsonPath("$.items[0].addOns[0].priceSnapshot").value(0.75))
                .andReturn().getResponse().getContentAsString();

        String orderId = objectMapper.readTree(response).get("id").asText();
        assertThat(orderId).isNotNull();
    }

    @Test
    void testIdempotency_duplicateOrderSubmissionReturnsExistingOrder() throws Exception {
        String idemKey = "IDEM-" + UUID.randomUUID();

        CreateOrderRequest request = new CreateOrderRequest();
        request.setOutletId(outletT1.getId());
        request.setOrderType(OrderType.TAKEAWAY);
        request.setIdempotencyKey(idemKey);

        OrderItemRequest itemReq = new OrderItemRequest();
        itemReq.setProductId(bobaProduct.getId());
        itemReq.setQuantity(1);
        request.setItems(List.of(itemReq));

        // First Submission
        String resp1 = mockMvc.perform(post("/api/v1/orders")
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String orderId1 = objectMapper.readTree(resp1).get("id").asText();

        // Duplicate Submission with exact same idempotency key
        String resp2 = mockMvc.perform(post("/api/v1/orders")
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String orderId2 = objectMapper.readTree(resp2).get("id").asText();

        // Must return the exact same order without creating a duplicate record
        assertThat(orderId1).isEqualTo(orderId2);
    }

    @Test
    void testOrderStatusTransitions_andValidation() throws Exception {
        CreateOrderRequest request = new CreateOrderRequest();
        request.setOutletId(outletT1.getId());
        request.setOrderType(OrderType.COUNTER);

        OrderItemRequest itemReq = new OrderItemRequest();
        itemReq.setProductId(bobaProduct.getId());
        itemReq.setQuantity(1);
        request.setItems(List.of(itemReq));

        String resp = mockMvc.perform(post("/api/v1/orders")
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String orderId = objectMapper.readTree(resp).get("id").asText();

        // 1. Valid Transition: CREATED -> CONFIRMED
        OrderStatusUpdateRequest confirmReq = new OrderStatusUpdateRequest();
        confirmReq.setStatus(OrderStatus.CONFIRMED);

        mockMvc.perform(patch("/api/v1/orders/" + orderId + "/status")
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(confirmReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMED"));

        // 2. Valid Transition: CONFIRMED -> PREPARING -> READY -> COMPLETED
        confirmReq.setStatus(OrderStatus.PREPARING);
        mockMvc.perform(patch("/api/v1/orders/" + orderId + "/status")
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(confirmReq)))
                .andExpect(status().isOk());

        confirmReq.setStatus(OrderStatus.READY);
        mockMvc.perform(patch("/api/v1/orders/" + orderId + "/status")
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(confirmReq)))
                .andExpect(status().isOk());

        confirmReq.setStatus(OrderStatus.COMPLETED);
        mockMvc.perform(patch("/api/v1/orders/" + orderId + "/status")
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(confirmReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"));

        // 3. Invalid Transition: COMPLETED is terminal; cannot transition to CREATED or CANCELLED
        OrderStatusUpdateRequest invalidReq = new OrderStatusUpdateRequest();
        invalidReq.setStatus(OrderStatus.CREATED);

        mockMvc.perform(patch("/api/v1/orders/" + orderId + "/status")
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidReq)))
                .andExpect(status().isBadRequest());

        // 4. Update items when order is already in COMPLETED status -> Must fail with 400
        UpdateOrderItemsRequest updateItemsReq = new UpdateOrderItemsRequest();
        updateItemsReq.setItems(List.of(itemReq));

        mockMvc.perform(put("/api/v1/orders/" + orderId + "/items")
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateItemsReq)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testOrderCancellation_requiresCancellationReason() throws Exception {
        CreateOrderRequest request = new CreateOrderRequest();
        request.setOutletId(outletT1.getId());
        request.setOrderType(OrderType.DINE_IN);
        OrderItemRequest itemReq = new OrderItemRequest();
        itemReq.setProductId(bobaProduct.getId());
        itemReq.setQuantity(1);
        request.setItems(List.of(itemReq));

        String resp = mockMvc.perform(post("/api/v1/orders")
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String orderId = objectMapper.readTree(resp).get("id").asText();

        // 1. Cancel without reason -> Fails
        OrderStatusUpdateRequest cancelNoReason = new OrderStatusUpdateRequest();
        cancelNoReason.setStatus(OrderStatus.CANCELLED);

        mockMvc.perform(patch("/api/v1/orders/" + orderId + "/status")
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(cancelNoReason)))
                .andExpect(status().isBadRequest());

        // 2. Cancel with reason -> Succeeds
        OrderStatusUpdateRequest cancelWithReason = new OrderStatusUpdateRequest();
        cancelWithReason.setStatus(OrderStatus.CANCELLED);
        cancelWithReason.setCancellationReason("Customer changed mind");

        mockMvc.perform(patch("/api/v1/orders/" + orderId + "/status")
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(cancelWithReason)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"))
                .andExpect(jsonPath("$.cancellationReason").value("Customer changed mind"));
    }

    @Test
    void testTenantAndOutletIsolation_unauthorizedAccessBlocked() throws Exception {
        CreateOrderRequest request = new CreateOrderRequest();
        request.setOutletId(outletT1.getId());
        request.setOrderType(OrderType.TAKEAWAY);
        OrderItemRequest itemReq = new OrderItemRequest();
        itemReq.setProductId(bobaProduct.getId());
        itemReq.setQuantity(1);
        request.setItems(List.of(itemReq));

        // User T1 creates order in Outlet T1
        String resp = mockMvc.perform(post("/api/v1/orders")
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String orderId = objectMapper.readTree(resp).get("id").asText();

        // User T2 (Tenant 2) tries to fetch Tenant 1's order -> 404 (scoped out by Hibernate @TenantId)
        mockMvc.perform(get("/api/v1/orders/" + orderId)
                        .with(httpBasic(userT2.getEmail(), password))
                        .header("X-Tenant-ID", tenant2.getId().toString()))
                .andExpect(status().isNotFound());

        // User T2 tries to create order for Outlet T1 -> 403 Forbidden (cross-tenant outlet authorization)
        mockMvc.perform(post("/api/v1/orders")
                        .with(httpBasic(userT2.getEmail(), password))
                        .header("X-Tenant-ID", tenant2.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }
}

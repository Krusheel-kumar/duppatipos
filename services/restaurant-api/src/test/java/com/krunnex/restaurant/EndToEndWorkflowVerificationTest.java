package com.krunnex.restaurant;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.krunnex.restaurant.domain.*;
import com.krunnex.restaurant.repository.*;
import com.krunnex.restaurant.security.TenantContext;
import com.krunnex.restaurant.web.dto.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Task 12: Comprehensive End-to-End Workflow Verification Test.
 * Tests:
 * 1. Admin creates Category, Product, Variant, and Add-on via real APIs.
 * 2. Cashier POS loads saved products and submits order with backend pricing.
 * 3. Persisted order appears in Admin Orders view.
 * 4. KOT is automatically generated and appears in Kitchen queue.
 * 5. Kitchen updates ticket status (QUEUED -> PREPARING -> READY) and verifies Order sync.
 * 6. Bill generation, partial payment, and final full payment settlement.
 * 7. Duplicate submission / idempotency check.
 * 8. Cross-tenant and cross-outlet authorization isolation check.
 */
@SpringBootTest
@ActiveProfiles("test")
class EndToEndWorkflowVerificationTest {

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
    private ProductVariantRepository variantRepository;

    @Autowired
    private AddOnRepository addOnRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private KitchenTicketRepository kitchenTicketRepository;

    @Autowired
    private BillRepository billRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private MockMvc mockMvc;

    private Tenant tenant;
    private Tenant otherTenant;
    private Outlet outlet;
    private Outlet otherOutlet;

    private User adminUser;
    private User otherUser;
    private final String rawPassword = "password123";

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(context)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();

        // Setup primary test tenant & outlet
        tenant = new Tenant();
        tenant.setName("E2E Test Café " + UUID.randomUUID());
        tenant.setDomain("e2e-" + UUID.randomUUID() + ".local");
        tenant = tenantRepository.save(tenant);

        TenantContext.setTenantId(tenant.getId());
        outlet = new Outlet();
        outlet.setName("Main Street Branch");
        outlet.setTenantId(tenant.getId());
        outlet = outletRepository.saveAndFlush(outlet);

        // Setup secondary tenant for security isolation tests
        otherTenant = new Tenant();
        otherTenant.setName("Attacker Café " + UUID.randomUUID());
        otherTenant.setDomain("attacker-" + UUID.randomUUID() + ".local");
        otherTenant = tenantRepository.save(otherTenant);

        TenantContext.setTenantId(otherTenant.getId());
        otherOutlet = new Outlet();
        otherOutlet.setName("Unauthorized Branch");
        otherOutlet.setTenantId(otherTenant.getId());
        otherOutlet = outletRepository.saveAndFlush(otherOutlet);
        TenantContext.clear();

        // Create Admin user with membership to tenant & outlet
        Role adminRole = new Role();
        adminRole.setName("OWNER-" + UUID.randomUUID());
        adminRole.setTenantId(tenant.getId());
        adminRole.setPermissions(Collections.emptySet());
        adminRole = roleRepository.save(adminRole);

        adminUser = new User();
        adminUser.setEmail("admin-" + UUID.randomUUID() + "@e2ecafe.com");
        adminUser.setPasswordHash(passwordEncoder.encode(rawPassword));
        adminUser = userRepository.save(adminUser);

        TenantMembership tm = new TenantMembership();
        tm.setUser(adminUser);
        tm.setTenant(tenant);
        tm.setRole(adminRole);
        tenantMembershipRepository.save(tm);

        OutletMembership om = new OutletMembership();
        om.setUser(adminUser);
        om.setOutlet(outlet);
        outletMembershipRepository.save(om);

        // Create Other User in other tenant
        Role otherRole = new Role();
        otherRole.setName("OTHER-" + UUID.randomUUID());
        otherRole.setTenantId(otherTenant.getId());
        otherRole.setPermissions(Collections.emptySet());
        otherRole = roleRepository.save(otherRole);

        otherUser = new User();
        otherUser.setEmail("attacker-" + UUID.randomUUID() + "@other.com");
        otherUser.setPasswordHash(passwordEncoder.encode(rawPassword));
        otherUser = userRepository.save(otherUser);

        TenantMembership otherTm = new TenantMembership();
        otherTm.setUser(otherUser);
        otherTm.setTenant(otherTenant);
        otherTm.setRole(otherRole);
        tenantMembershipRepository.save(otherTm);

        OutletMembership otherOm = new OutletMembership();
        otherOm.setUser(otherUser);
        otherOm.setOutlet(otherOutlet);
        outletMembershipRepository.save(otherOm);
    }

    @Test
    @DisplayName("Complete restaurant lifecycle: Catalog Setup -> Order Creation -> KOT Generation & Kitchen Prep -> Bill Settlement -> Security Check")
    void verifyCompleteRestaurantWorkflow() throws Exception {
        // =========================================================================
        // STEP 1: Admin Creates Category, Product, Variant, and Add-on via APIs
        // =========================================================================
        CategoryRequest catReq = new CategoryRequest();
        catReq.setName("Specialty Coffee");
        catReq.setDescription("Freshly brewed artisan coffee");
        catReq.setDisplayOrder(1);

        MvcResult catResult = mockMvc.perform(post("/api/v1/categories")
                        .with(httpBasic(adminUser.getEmail(), rawPassword))
                        .header("X-Tenant-ID", tenant.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(catReq)))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode catNode = objectMapper.readTree(catResult.getResponse().getContentAsString());
        UUID categoryId = UUID.fromString(catNode.get("id").asText());
        assertThat(categoryId).isNotNull();

        // Create Add-on
        AddOnRequest addOnReq = new AddOnRequest();
        addOnReq.setName("Extra Oat Milk");
        addOnReq.setPrice(new BigDecimal("0.75"));

        MvcResult addOnResult = mockMvc.perform(post("/api/v1/add-ons")
                        .with(httpBasic(adminUser.getEmail(), rawPassword))
                        .header("X-Tenant-ID", tenant.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(addOnReq)))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode addOnNode = objectMapper.readTree(addOnResult.getResponse().getContentAsString());
        UUID addOnId = UUID.fromString(addOnNode.get("id").asText());
        assertThat(addOnId).isNotNull();

        // Create Product with Variant
        ProductRequest prodReq = new ProductRequest();
        prodReq.setCategoryId(categoryId);
        prodReq.setName("Caramel Latte");
        prodReq.setDescription("Espresso with steamed milk and caramel");
        prodReq.setBasePrice(new BigDecimal("4.50"));
        prodReq.setSku("LATTE-CARAMEL");
        prodReq.setAddOnIds(Set.of(addOnId));

        VariantRequest varReq = new VariantRequest();
        varReq.setName("Large 16oz");
        varReq.setSizeLabel("Large");
        varReq.setPrice(new BigDecimal("5.50"));
        varReq.setSku("LATTE-CARAMEL-LG");
        varReq.setDisplayOrder(2);
        prodReq.setVariants(List.of(varReq));

        MvcResult prodResult = mockMvc.perform(post("/api/v1/products")
                        .with(httpBasic(adminUser.getEmail(), rawPassword))
                        .header("X-Tenant-ID", tenant.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(prodReq)))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode prodNode = objectMapper.readTree(prodResult.getResponse().getContentAsString());
        UUID productId = UUID.fromString(prodNode.get("id").asText());
        UUID variantId = UUID.fromString(prodNode.get("variants").get(0).get("id").asText());
        assertThat(productId).isNotNull();
        assertThat(variantId).isNotNull();

        // =========================================================================
        // STEP 2: Cashier Submits Order with Backend Pricing & Idempotency Key
        // =========================================================================
        String idempotencyKey = "E2E-IDEMP-" + UUID.randomUUID();
        CreateOrderRequest orderReq = new CreateOrderRequest();
        orderReq.setOutletId(outlet.getId());
        orderReq.setOrderType(OrderType.DINE_IN);
        orderReq.setCustomerNotes("Extra hot please");
        orderReq.setIdempotencyKey(idempotencyKey);

        OrderItemRequest itemReq = new OrderItemRequest();
        itemReq.setProductId(productId);
        itemReq.setVariantId(variantId);
        itemReq.setAddOnIds(List.of(addOnId));
        itemReq.setQuantity(2);
        itemReq.setItemNotes("With extra cinnamon");
        orderReq.setItems(List.of(itemReq));

        MvcResult orderResult = mockMvc.perform(post("/api/v1/orders")
                        .with(httpBasic(adminUser.getEmail(), rawPassword))
                        .header("X-Tenant-ID", tenant.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(orderReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.orderNumber").exists())
                .andExpect(jsonPath("$.status").value("CREATED"))
                .andReturn();

        JsonNode orderNode = objectMapper.readTree(orderResult.getResponse().getContentAsString());
        UUID orderId = UUID.fromString(orderNode.get("id").asText());
        String orderNumber = orderNode.get("orderNumber").asText();
        // Calculation check: 2 * (Variant 5.50 + AddOn 0.75) = 2 * 6.25 = 12.50
        BigDecimal totalAmount = new BigDecimal(orderNode.get("totalAmount").asText());
        assertThat(totalAmount).isEqualByComparingTo(new BigDecimal("12.50"));

        // Verify Duplicate Submission returns the identical order without duplication
        mockMvc.perform(post("/api/v1/orders")
                        .with(httpBasic(adminUser.getEmail(), rawPassword))
                        .header("X-Tenant-ID", tenant.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(orderReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(orderId.toString()));

        // =========================================================================
        // STEP 3: Verify Order Appears in Admin Orders View
        // =========================================================================
        mockMvc.perform(get("/api/v1/orders/outlet/" + outlet.getId())
                        .with(httpBasic(adminUser.getEmail(), rawPassword))
                        .header("X-Tenant-ID", tenant.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].orderNumber").value(orderNumber))
                .andExpect(jsonPath("$[0].totalAmount").value(12.50));

        // =========================================================================
        // STEP 4: Verify Order Auto-Generated Kitchen Ticket in /kitchen
        // =========================================================================
        MvcResult kotResult = mockMvc.perform(get("/api/v1/kitchen-tickets/order/" + orderId)
                        .with(httpBasic(adminUser.getEmail(), rawPassword))
                        .header("X-Tenant-ID", tenant.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("QUEUED"))
                .andExpect(jsonPath("$.orderNumberSnapshot").value(orderNumber))
                .andExpect(jsonPath("$.items[0].productNameSnapshot").value("Caramel Latte"))
                .andExpect(jsonPath("$.items[0].variantNameSnapshot").value("Large 16oz"))
                .andExpect(jsonPath("$.items[0].quantity").value(2))
                .andReturn();

        JsonNode kotNode = objectMapper.readTree(kotResult.getResponse().getContentAsString());
        UUID ticketId = UUID.fromString(kotNode.get("id").asText());

        // Also verify ticket appears in outlet tickets list
        mockMvc.perform(get("/api/v1/kitchen-tickets/outlet/" + outlet.getId())
                        .with(httpBasic(adminUser.getEmail(), rawPassword))
                        .header("X-Tenant-ID", tenant.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(ticketId.toString()));

        // =========================================================================
        // STEP 5: Kitchen Updates Ticket to PREPARING -> READY, verifies Order Sync
        // =========================================================================
        KitchenTicketStatusUpdateRequest prepUpdate = new KitchenTicketStatusUpdateRequest();
        prepUpdate.setStatus(KitchenTicketStatus.PREPARING);

        mockMvc.perform(patch("/api/v1/kitchen-tickets/" + ticketId + "/status")
                        .with(httpBasic(adminUser.getEmail(), rawPassword))
                        .header("X-Tenant-ID", tenant.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(prepUpdate)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PREPARING"));

        // Verify underlying order synced to PREPARING
        mockMvc.perform(get("/api/v1/orders/" + orderId)
                        .with(httpBasic(adminUser.getEmail(), rawPassword))
                        .header("X-Tenant-ID", tenant.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PREPARING"));

        // Transition Kitchen Ticket to READY
        KitchenTicketStatusUpdateRequest readyUpdate = new KitchenTicketStatusUpdateRequest();
        readyUpdate.setStatus(KitchenTicketStatus.READY);

        mockMvc.perform(patch("/api/v1/kitchen-tickets/" + ticketId + "/status")
                        .with(httpBasic(adminUser.getEmail(), rawPassword))
                        .header("X-Tenant-ID", tenant.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(readyUpdate)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("READY"));

        // Verify underlying order synced to READY
        mockMvc.perform(get("/api/v1/orders/" + orderId)
                        .with(httpBasic(adminUser.getEmail(), rawPassword))
                        .header("X-Tenant-ID", tenant.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("READY"));

        // =========================================================================
        // STEP 6: Bill Generation and Payments
        // =========================================================================
        CreateBillRequest billReq = new CreateBillRequest();
        billReq.setOrderId(orderId);

        MvcResult billResult = mockMvc.perform(post("/api/v1/bills")
                        .with(httpBasic(adminUser.getEmail(), rawPassword))
                        .header("X-Tenant-ID", tenant.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(billReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("ISSUED"))
                .andExpect(jsonPath("$.totalAmount").value(12.50))
                .andExpect(jsonPath("$.paidAmount").value(0.00))
                .andReturn();

        JsonNode billNode = objectMapper.readTree(billResult.getResponse().getContentAsString());
        UUID billId = UUID.fromString(billNode.get("id").asText());

        // 6a: Partial Payment of $5.00
        CreatePaymentRequest partialPaymentReq = new CreatePaymentRequest();
        partialPaymentReq.setBillId(billId);
        partialPaymentReq.setAmount(new BigDecimal("5.00"));
        partialPaymentReq.setPaymentMethod(PaymentMethod.CASH);
        partialPaymentReq.setIdempotencyKey("PAY-PARTIAL-" + UUID.randomUUID());

        MvcResult partialPayResult = mockMvc.perform(post("/api/v1/bills/payments")
                        .with(httpBasic(adminUser.getEmail(), rawPassword))
                        .header("X-Tenant-ID", tenant.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(partialPaymentReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.amount").value(5.00))
                .andReturn();

        UUID partialPayId = UUID.fromString(objectMapper.readTree(partialPayResult.getResponse().getContentAsString()).get("id").asText());

        // Confirm partial payment to SUCCESSFUL
        PaymentStatusUpdateRequest confirmPartial = new PaymentStatusUpdateRequest();
        confirmPartial.setStatus(PaymentStatus.SUCCESSFUL);

        mockMvc.perform(patch("/api/v1/bills/payments/" + partialPayId + "/status")
                        .with(httpBasic(adminUser.getEmail(), rawPassword))
                        .header("X-Tenant-ID", tenant.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(confirmPartial)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESSFUL"));

        // Verify bill is PARTIALLY_PAID
        mockMvc.perform(get("/api/v1/bills/" + billId)
                        .with(httpBasic(adminUser.getEmail(), rawPassword))
                        .header("X-Tenant-ID", tenant.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PARTIALLY_PAID"))
                .andExpect(jsonPath("$.paidAmount").value(5.00));

        // 6b: Settlement Payment of Remaining $7.50
        CreatePaymentRequest settlementReq = new CreatePaymentRequest();
        settlementReq.setBillId(billId);
        settlementReq.setAmount(new BigDecimal("7.50"));
        settlementReq.setPaymentMethod(PaymentMethod.CARD);
        settlementReq.setTransactionReference("CARD-REF-9988");
        settlementReq.setIdempotencyKey("PAY-SETTLE-" + UUID.randomUUID());

        MvcResult settlementResult = mockMvc.perform(post("/api/v1/bills/payments")
                        .with(httpBasic(adminUser.getEmail(), rawPassword))
                        .header("X-Tenant-ID", tenant.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(settlementReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.amount").value(7.50))
                .andReturn();

        UUID settlementId = UUID.fromString(objectMapper.readTree(settlementResult.getResponse().getContentAsString()).get("id").asText());

        // Confirm settlement payment
        PaymentStatusUpdateRequest confirmSettle = new PaymentStatusUpdateRequest();
        confirmSettle.setStatus(PaymentStatus.SUCCESSFUL);

        mockMvc.perform(patch("/api/v1/bills/payments/" + settlementId + "/status")
                        .with(httpBasic(adminUser.getEmail(), rawPassword))
                        .header("X-Tenant-ID", tenant.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(confirmSettle)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESSFUL"));

        // Verify Bill is PAID
        mockMvc.perform(get("/api/v1/bills/" + billId)
                        .with(httpBasic(adminUser.getEmail(), rawPassword))
                        .header("X-Tenant-ID", tenant.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PAID"))
                .andExpect(jsonPath("$.paidAmount").value(12.50));

        // Verify Order is now COMPLETED
        mockMvc.perform(get("/api/v1/orders/" + orderId)
                        .with(httpBasic(adminUser.getEmail(), rawPassword))
                        .header("X-Tenant-ID", tenant.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"));

        // =========================================================================
        // STEP 7: Security & Tenant Isolation Verification
        // =========================================================================
        // Attempting to access primary tenant's outlet orders using another tenant's user must return 403 Forbidden
        mockMvc.perform(get("/api/v1/orders/outlet/" + outlet.getId())
                        .with(httpBasic(otherUser.getEmail(), rawPassword))
                        .header("X-Tenant-ID", otherTenant.getId().toString()))
                .andExpect(status().isForbidden());

        // Attempting to access primary tenant's kitchen tickets using another tenant's user must return 403 Forbidden
        mockMvc.perform(get("/api/v1/kitchen-tickets/outlet/" + outlet.getId())
                        .with(httpBasic(otherUser.getEmail(), rawPassword))
                        .header("X-Tenant-ID", otherTenant.getId().toString()))
                .andExpect(status().isForbidden());
    }
}

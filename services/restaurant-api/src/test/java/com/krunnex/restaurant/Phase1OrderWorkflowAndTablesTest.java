package com.krunnex.restaurant;

import com.fasterxml.jackson.databind.JsonNode;
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
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("test")
class Phase1OrderWorkflowAndTablesTest {

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
    private OrderRepository orderRepository;

    @Autowired
    private RestaurantTableRepository tableRepository;

    @Autowired
    private KitchenTicketRepository ticketRepository;

    @Autowired
    private BillRepository billRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private MockMvc mockMvc;

    private Tenant tenant;
    private Outlet outletPayLater;
    private Outlet outletPayFirst;
    private User manager;
    private String password = "password123";
    private Product sampleProduct;
    private Product addOnProduct;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(context)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();

        // 1. Setup Tenant
        tenant = new Tenant();
        tenant.setName("Phase 1 Cafe Brand");
        tenant.setDomain("phase1-" + UUID.randomUUID() + ".local");
        tenant = tenantRepository.save(tenant);

        // 2. Setup Outlets (One PAY_LATER and one PAY_FIRST)
        TenantContext.setTenantId(tenant.getId());
        outletPayLater = new Outlet();
        outletPayLater.setName("Dine-In Bistro (Pay Later)");
        outletPayLater.setTenantId(tenant.getId());
        outletPayLater.setPaymentPolicy(PaymentPolicy.PAY_LATER);
        outletPayLater = outletRepository.saveAndFlush(outletPayLater);

        outletPayFirst = new Outlet();
        outletPayFirst.setName("Express Counter (Pay First)");
        outletPayFirst.setTenantId(tenant.getId());
        outletPayFirst.setPaymentPolicy(PaymentPolicy.PAY_FIRST);
        outletPayFirst = outletRepository.saveAndFlush(outletPayFirst);
        TenantContext.clear();

        // 3. User & Roles
        Role role = new Role();
        role.setName("MANAGER-" + UUID.randomUUID());
        role.setTenantId(tenant.getId());
        role.setPermissions(Collections.emptySet());
        role = roleRepository.save(role);

        manager = new User();
        manager.setEmail("manager-" + UUID.randomUUID() + "@krunnex.com");
        manager.setPasswordHash(passwordEncoder.encode(password));
        manager.setFirstName("General");
        manager.setLastName("Manager");
        manager = userRepository.save(manager);

        TenantMembership tm = new TenantMembership();
        tm.setTenant(tenant);
        tm.setUser(manager);
        tm.setRole(role);
        tenantMembershipRepository.save(tm);

        OutletMembership om1 = new OutletMembership();
        om1.setOutlet(outletPayLater);
        om1.setUser(manager);
        om1.setRole(role);
        outletMembershipRepository.save(om1);

        OutletMembership om2 = new OutletMembership();
        om2.setOutlet(outletPayFirst);
        om2.setUser(manager);
        om2.setRole(role);
        outletMembershipRepository.save(om2);

        // 4. Products
        TenantContext.setTenantId(tenant.getId());
        ProductCategory cat = new ProductCategory();
        cat.setName("Beverages");
        cat.setTenantId(tenant.getId());
        cat = categoryRepository.save(cat);

        sampleProduct = new Product();
        sampleProduct.setName("Signature Boba");
        sampleProduct.setBasePrice(new BigDecimal("100.00"));
        sampleProduct.setCategory(cat);
        sampleProduct.setTenantId(tenant.getId());
        sampleProduct.setIsActive(true);
        sampleProduct = productRepository.save(sampleProduct);

        addOnProduct = new Product();
        addOnProduct.setName("Garlic Fries");
        addOnProduct.setBasePrice(new BigDecimal("50.00"));
        addOnProduct.setCategory(cat);
        addOnProduct.setTenantId(tenant.getId());
        addOnProduct.setIsActive(true);
        addOnProduct = productRepository.save(addOnProduct);
        TenantContext.clear();
    }

    /**
     * Requirement: Under PAY_LATER, order creation immediately releases the Kitchen Ticket (KOT),
     * marks table as RUNNING, and keeps order unpaid.
     */
    @Test
    void testPayLater_CreatesOrder_ReleasesKotImmediately_OccupiesTable() throws Exception {
        // Create table
        TenantContext.setTenantId(tenant.getId());
        RestaurantTable table = new RestaurantTable();
        table.setOutlet(outletPayLater);
        table.setTableNumber("T-101");
        table.setCapacity(4);
        table.setStatus(TableStatus.AVAILABLE);
        table.setTenantId(tenant.getId());
        table = tableRepository.saveAndFlush(table);
        TenantContext.clear();

        CreateOrderRequest request = new CreateOrderRequest();
        request.setOutletId(outletPayLater.getId());
        request.setOrderType(OrderType.DINE_IN);
        request.setTableId(table.getId());
        request.setIdempotencyKey("KEY-" + UUID.randomUUID());

        OrderItemRequest itemReq = new OrderItemRequest();
        itemReq.setProductId(sampleProduct.getId());
        itemReq.setQuantity(2);
        request.setItems(List.of(itemReq));

        String responseBody = mockMvc.perform(post("/api/v1/orders")
                        .with(httpBasic(manager.getEmail(), password))
                        .header("X-Tenant-ID", tenant.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.orderNumber").isNotEmpty())
                .andExpect(jsonPath("$.totalAmount").value(200.00))
                .andReturn().getResponse().getContentAsString();

        JsonNode orderNode = objectMapper.readTree(responseBody);
        UUID orderId = UUID.fromString(orderNode.get("id").asText());

        // Verify KOT was immediately released and table updated
        try {
            TenantContext.setTenantId(tenant.getId());
            Optional<KitchenTicket> ticketOpt = ticketRepository.findByOrderId(orderId);
            assertThat(ticketOpt).isPresent();
            assertThat(ticketOpt.get().getStatus()).isEqualTo(KitchenTicketStatus.QUEUED);
            assertThat(ticketOpt.get().getItems()).hasSize(1);

            RestaurantTable updatedTable = tableRepository.findById(table.getId()).orElseThrow();
            assertThat(updatedTable.getStatus()).isEqualTo(TableStatus.RUNNING);
            assertThat(updatedTable.getCurrentOrder().getId()).isEqualTo(orderId);
        } finally {
            TenantContext.clear();
        }
    }

    /**
     * Requirement: Under PAY_FIRST, order creation holds the KOT until payment is verified and successful.
     */
    @Test
    void testPayFirst_CreatesOrder_HoldsKotUntilPaymentSuccessful() throws Exception {
        CreateOrderRequest request = new CreateOrderRequest();
        request.setOutletId(outletPayFirst.getId());
        request.setOrderType(OrderType.TAKEAWAY);
        request.setIdempotencyKey("KEY-" + UUID.randomUUID());

        OrderItemRequest itemReq = new OrderItemRequest();
        itemReq.setProductId(sampleProduct.getId());
        itemReq.setQuantity(1);
        request.setItems(List.of(itemReq));

        String responseBody = mockMvc.perform(post("/api/v1/orders")
                        .with(httpBasic(manager.getEmail(), password))
                        .header("X-Tenant-ID", tenant.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.totalAmount").value(100.00))
                .andReturn().getResponse().getContentAsString();

        JsonNode orderNode = objectMapper.readTree(responseBody);
        UUID orderId = UUID.fromString(orderNode.get("id").asText());

        // 1. Verify KOT is NOT released yet because outlet is PAY_FIRST
        Optional<KitchenTicket> ticketBeforePayment = ticketRepository.findByOrderId(orderId);
        assertThat(ticketBeforePayment).isEmpty();

        // 2. Issue Bill and record payment
        CreateBillRequest billReq = new CreateBillRequest();
        billReq.setOrderId(orderId);
        String billRes = mockMvc.perform(post("/api/v1/bills")
                        .with(httpBasic(manager.getEmail(), password))
                        .header("X-Tenant-ID", tenant.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(billReq)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        JsonNode billNode = objectMapper.readTree(billRes);
        UUID billId = UUID.fromString(billNode.get("id").asText());

        CreatePaymentRequest paymentReq = new CreatePaymentRequest();
        paymentReq.setBillId(billId);
        paymentReq.setAmount(new BigDecimal("100.00"));
        paymentReq.setPaymentMethod(PaymentMethod.UPI);
        paymentReq.setIdempotencyKey("PMT-" + UUID.randomUUID());

        String paymentRes = mockMvc.perform(post("/api/v1/bills/payments")
                        .with(httpBasic(manager.getEmail(), password))
                        .header("X-Tenant-ID", tenant.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(paymentReq)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        JsonNode pmtNode = objectMapper.readTree(paymentRes);
        UUID paymentId = UUID.fromString(pmtNode.get("id").asText());

        // Update payment status to SUCCESSFUL
        PaymentStatusUpdateRequest statusReq = new PaymentStatusUpdateRequest();
        statusReq.setStatus(PaymentStatus.SUCCESSFUL);

        mockMvc.perform(patch("/api/v1/bills/payments/" + paymentId + "/status")
                        .with(httpBasic(manager.getEmail(), password))
                        .header("X-Tenant-ID", tenant.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(statusReq)))
                .andExpect(status().isOk());

        // 3. Now verify KOT has been released to kitchen upon successful payment
        try {
            TenantContext.setTenantId(tenant.getId());
            Optional<KitchenTicket> ticketAfterPayment = ticketRepository.findByOrderId(orderId);
            assertThat(ticketAfterPayment).isPresent();
            assertThat(ticketAfterPayment.get().getStatus()).isEqualTo(KitchenTicketStatus.QUEUED);
        } finally {
            TenantContext.clear();
        }
    }

    /**
     * Requirement: Adding items to an existing running order preserves historical items,
     * updates totals, revises the bill, and dispatches add-on items to kitchen.
     */
    @Test
    void testRunningOrder_AddItems_CalculatesTotal_RevisesBill_AppendsToKitchenTicket() throws Exception {
        // 1. Create running dine-in order
        TenantContext.setTenantId(tenant.getId());
        RestaurantTable table = new RestaurantTable();
        table.setOutlet(outletPayLater);
        table.setTableNumber("T-102");
        table.setCapacity(2);
        table.setStatus(TableStatus.AVAILABLE);
        table.setTenantId(tenant.getId());
        table = tableRepository.saveAndFlush(table);
        TenantContext.clear();

        CreateOrderRequest request = new CreateOrderRequest();
        request.setOutletId(outletPayLater.getId());
        request.setOrderType(OrderType.DINE_IN);
        request.setTableId(table.getId());
        request.setIdempotencyKey("KEY-" + UUID.randomUUID());

        OrderItemRequest itemReq = new OrderItemRequest();
        itemReq.setProductId(sampleProduct.getId());
        itemReq.setQuantity(1); // 100.00
        request.setItems(List.of(itemReq));

        String orderRes = mockMvc.perform(post("/api/v1/orders")
                        .with(httpBasic(manager.getEmail(), password))
                        .header("X-Tenant-ID", tenant.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        JsonNode orderNode = objectMapper.readTree(orderRes);
        UUID orderId = UUID.fromString(orderNode.get("id").asText());
        assertThat(orderNode.get("totalAmount").asDouble()).isEqualTo(100.00);

        // Issue initial bill
        CreateBillRequest billReq = new CreateBillRequest();
        billReq.setOrderId(orderId);
        mockMvc.perform(post("/api/v1/bills")
                        .with(httpBasic(manager.getEmail(), password))
                        .header("X-Tenant-ID", tenant.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(billReq)))
                .andExpect(status().isCreated());

        // 2. Customer orders additional item: Garlic Fries (50.00)
        AddOrderItemsRequest addReq = new AddOrderItemsRequest();
        addReq.setIdempotencyKey("ADD-" + UUID.randomUUID());
        OrderItemRequest newItem = new OrderItemRequest();
        newItem.setProductId(addOnProduct.getId());
        newItem.setQuantity(1);
        addReq.setItems(List.of(newItem));

        String updatedRes = mockMvc.perform(post("/api/v1/orders/" + orderId + "/add-items")
                        .with(httpBasic(manager.getEmail(), password))
                        .header("X-Tenant-ID", tenant.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(addReq)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        JsonNode updatedNode = objectMapper.readTree(updatedRes);

        // Verify total updated correctly: 100 + 50 = 150.00
        assertThat(updatedNode.get("totalAmount").asDouble()).isEqualTo(150.00);
        assertThat(updatedNode.get("items").size()).isEqualTo(2);

        try {
            TenantContext.setTenantId(tenant.getId());
            // Verify bill was automatically revised to 150.00
            Bill revisedBill = billRepository.findByOrderId(orderId).orElseThrow();
            assertThat(revisedBill.getTotalAmount()).isEqualByComparingTo(new BigDecimal("150.00"));

            // Verify Kitchen Ticket: Items appended
            KitchenTicket ticket = ticketRepository.findByOrderId(orderId).orElseThrow();
            assertThat(ticket.getItems()).hasSize(2);
            assertThat(ticket.getItems().stream().anyMatch(i -> i.getProductNameSnapshot().equals("Garlic Fries"))).isTrue();
        } finally {
            TenantContext.clear();
        }
    }

    /**
     * Requirement: Table cannot be marked AVAILABLE while its order remains unpaid,
     * unless an authorized exception reason is provided.
     */
    @Test
    void testTableManagement_PreventsReleasingUnpaidTableWithoutReason() throws Exception {
        TenantContext.setTenantId(tenant.getId());
        RestaurantTable table = new RestaurantTable();
        table.setOutlet(outletPayLater);
        table.setTableNumber("T-103");
        table.setCapacity(6);
        table.setStatus(TableStatus.AVAILABLE);
        table.setTenantId(tenant.getId());
        table = tableRepository.saveAndFlush(table);
        TenantContext.clear();

        // Start order on table
        CreateOrderRequest request = new CreateOrderRequest();
        request.setOutletId(outletPayLater.getId());
        request.setOrderType(OrderType.DINE_IN);
        request.setTableId(table.getId());
        request.setIdempotencyKey("KEY-" + UUID.randomUUID());
        OrderItemRequest itemReq = new OrderItemRequest();
        itemReq.setProductId(sampleProduct.getId());
        itemReq.setQuantity(1);
        request.setItems(List.of(itemReq));

        mockMvc.perform(post("/api/v1/orders")
                        .with(httpBasic(manager.getEmail(), password))
                        .header("X-Tenant-ID", tenant.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        // Attempt to mark table AVAILABLE without reason while unpaid -> Must be rejected (400)
        TableStatusUpdateRequest invalidRelease = new TableStatusUpdateRequest();
        invalidRelease.setStatus(TableStatus.AVAILABLE);

        mockMvc.perform(patch("/api/v1/tables/" + table.getId() + "/status")
                        .with(httpBasic(manager.getEmail(), password))
                        .header("X-Tenant-ID", tenant.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRelease)))
                .andExpect(status().isBadRequest());

        // Attempt with authorized exception reason -> Allowed (200)
        TableStatusUpdateRequest auditedException = new TableStatusUpdateRequest();
        auditedException.setStatus(TableStatus.AVAILABLE);
        auditedException.setReason("Manager authorized guest transfer");

        mockMvc.perform(patch("/api/v1/tables/" + table.getId() + "/status")
                        .with(httpBasic(manager.getEmail(), password))
                        .header("X-Tenant-ID", tenant.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(auditedException)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("AVAILABLE"));
    }
}

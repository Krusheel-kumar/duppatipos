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
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("test")
class BillingAndPaymentTest {

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
    private TaxRateRepository taxRateRepository;

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
    private BillRepository billRepository;

    @Autowired
    private PaymentRepository paymentRepository;

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

    private Order sampleOrder;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(context)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();

        // 1. Tenants
        tenant1 = new Tenant();
        tenant1.setName("Boba House");
        tenant1.setDomain("boba-bill-" + UUID.randomUUID() + ".local");
        tenant1 = tenantRepository.save(tenant1);

        tenant2 = new Tenant();
        tenant2.setName("Coffee Corner");
        tenant2.setDomain("coffee-bill-" + UUID.randomUUID() + ".local");
        tenant2 = tenantRepository.save(tenant2);

        // 2. Outlets
        TenantContext.setTenantId(tenant1.getId());
        outletT1 = new Outlet();
        outletT1.setName("Boba House Downtown");
        outletT1.setTenantId(tenant1.getId());
        outletT1 = outletRepository.saveAndFlush(outletT1);

        TenantContext.setTenantId(tenant2.getId());
        outletT2 = new Outlet();
        outletT2.setName("Coffee Corner Uptown");
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
        userT1.setEmail("bill-user1-" + UUID.randomUUID() + "@example.com");
        userT1.setPasswordHash(passwordEncoder.encode(password));
        userT1 = userRepository.save(userT1);

        TenantMembership tm1 = new TenantMembership();
        tm1.setUser(userT1);
        tm1.setTenant(tenant1);
        tm1.setRole(roleT1);
        tenantMembershipRepository.save(tm1);

        OutletMembership om1 = new OutletMembership();
        om1.setUser(userT1);
        om1.setOutlet(outletT1);
        outletMembershipRepository.save(om1);

        userT2 = new User();
        userT2.setEmail("bill-user2-" + UUID.randomUUID() + "@example.com");
        userT2.setPasswordHash(passwordEncoder.encode(password));
        userT2 = userRepository.save(userT2);

        TenantMembership tm2 = new TenantMembership();
        tm2.setUser(userT2);
        tm2.setTenant(tenant2);
        tm2.setRole(roleT2);
        tenantMembershipRepository.save(tm2);

        OutletMembership om2 = new OutletMembership();
        om2.setUser(userT2);
        om2.setOutlet(outletT2);
        outletMembershipRepository.save(om2);

        // 4. Sample Order in Tenant 1
        TenantContext.setTenantId(tenant1.getId());
        sampleOrder = new Order();
        sampleOrder.setTenantId(tenant1.getId());
        sampleOrder.setOutlet(outletT1);
        sampleOrder.setOrderNumber("ORD-SAMPLE-" + UUID.randomUUID().toString().substring(0, 6));
        sampleOrder.setOrderType(OrderType.DINE_IN);
        sampleOrder.setStatus(OrderStatus.CONFIRMED);
        sampleOrder.setSubtotal(new BigDecimal("50.00"));
        sampleOrder.setDiscountAmount(new BigDecimal("5.00"));
        sampleOrder.setTaxableAmount(new BigDecimal("45.00"));
        sampleOrder.setTaxAmount(new BigDecimal("2.25"));
        sampleOrder.setTotalAmount(new BigDecimal("47.25"));
        sampleOrder = orderRepository.saveAndFlush(sampleOrder);

        TenantContext.clear();
    }

    @Test
    void testIssueBill_inheritsOrderSnapshots_andGeneratesUniqueInvoiceNumber() throws Exception {
        CreateBillRequest request = new CreateBillRequest();
        request.setOrderId(sampleOrder.getId());
        request.setNotes("First Dine-in Bill");

        String resp = mockMvc.perform(post("/api/v1/bills")
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.invoiceNumber").isNotEmpty())
                .andExpect(jsonPath("$.status").value("ISSUED"))
                .andExpect(jsonPath("$.subtotal").value(50.00))
                .andExpect(jsonPath("$.discountAmount").value(5.00))
                .andExpect(jsonPath("$.taxAmount").value(2.25))
                .andExpect(jsonPath("$.totalAmount").value(47.25))
                .andExpect(jsonPath("$.paidAmount").value(0.00))
                .andReturn().getResponse().getContentAsString();

        String billId = objectMapper.readTree(resp).get("id").asText();
        assertThat(billId).isNotNull();

        // Duplicate issue bill returns existing bill
        mockMvc.perform(post("/api/v1/bills")
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(billId));
    }

    @Test
    void testPartialAndMultiplePayments_progressBillToPaid() throws Exception {
        // 1. Issue bill
        CreateBillRequest billReq = new CreateBillRequest();
        billReq.setOrderId(sampleOrder.getId());
        String billResp = mockMvc.perform(post("/api/v1/bills")
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(billReq)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String billId = objectMapper.readTree(billResp).get("id").asText();

        // 2. First Partial Payment: $20.00 via CASH (PENDING)
        CreatePaymentRequest pay1Req = new CreatePaymentRequest();
        pay1Req.setBillId(UUID.fromString(billId));
        pay1Req.setPaymentMethod(PaymentMethod.CASH);
        pay1Req.setAmount(new BigDecimal("20.00"));
        pay1Req.setTransactionReference("CASH-REG-01");

        String pay1Resp = mockMvc.perform(post("/api/v1/bills/payments")
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(pay1Req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.amount").value(20.00))
                .andReturn().getResponse().getContentAsString();
        String pay1Id = objectMapper.readTree(pay1Resp).get("id").asText();

        // Bill must still be ISSUED with $0.00 paid (pending payment does not increase paidAmount)
        mockMvc.perform(get("/api/v1/bills/" + billId)
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ISSUED"))
                .andExpect(jsonPath("$.paidAmount").value(0.00));

        // 3. Confirm Pay1 as SUCCESSFUL -> Bill becomes PARTIALLY_PAID ($20.00 / $47.25)
        PaymentStatusUpdateRequest confirmPay = new PaymentStatusUpdateRequest();
        confirmPay.setStatus(PaymentStatus.SUCCESSFUL);

        mockMvc.perform(patch("/api/v1/bills/payments/" + pay1Id + "/status")
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(confirmPay)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESSFUL"));

        mockMvc.perform(get("/api/v1/bills/" + billId)
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PARTIALLY_PAID"))
                .andExpect(jsonPath("$.paidAmount").value(20.00));

        // 4. Second Partial Payment: $27.25 via UPI (PENDING -> SUCCESSFUL) -> Bill becomes PAID
        CreatePaymentRequest pay2Req = new CreatePaymentRequest();
        pay2Req.setBillId(UUID.fromString(billId));
        pay2Req.setPaymentMethod(PaymentMethod.UPI);
        pay2Req.setAmount(new BigDecimal("27.25"));
        pay2Req.setTransactionReference("UPI-TXN-123456");

        String pay2Resp = mockMvc.perform(post("/api/v1/bills/payments")
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(pay2Req)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String pay2Id = objectMapper.readTree(pay2Resp).get("id").asText();

        mockMvc.perform(patch("/api/v1/bills/payments/" + pay2Id + "/status")
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(confirmPay)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESSFUL"));

        mockMvc.perform(get("/api/v1/bills/" + billId)
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PAID"))
                .andExpect(jsonPath("$.paidAmount").value(47.25));
    }

    @Test
    void testOverpaymentPrevention_andPaymentFailureTracking() throws Exception {
        // 1. Issue bill of total $47.25
        CreateBillRequest billReq = new CreateBillRequest();
        billReq.setOrderId(sampleOrder.getId());
        String billResp = mockMvc.perform(post("/api/v1/bills")
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(billReq)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String billId = objectMapper.readTree(billResp).get("id").asText();

        // 2. Overpayment attempt: Try recording payment of $50.00 when balance is $47.25 -> Fails 400
        CreatePaymentRequest overpayReq = new CreatePaymentRequest();
        overpayReq.setBillId(UUID.fromString(billId));
        overpayReq.setPaymentMethod(PaymentMethod.CARD);
        overpayReq.setAmount(new BigDecimal("50.00"));

        mockMvc.perform(post("/api/v1/bills/payments")
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(overpayReq)))
                .andExpect(status().isBadRequest());

        // 3. Payment failure recording: Record $10.00 payment and transition to FAILED
        CreatePaymentRequest payReq = new CreatePaymentRequest();
        payReq.setBillId(UUID.fromString(billId));
        payReq.setPaymentMethod(PaymentMethod.CARD);
        payReq.setAmount(new BigDecimal("10.00"));

        String payResp = mockMvc.perform(post("/api/v1/bills/payments")
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payReq)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String payId = objectMapper.readTree(payResp).get("id").asText();

        // Fail without reason -> 400
        PaymentStatusUpdateRequest failNoReason = new PaymentStatusUpdateRequest();
        failNoReason.setStatus(PaymentStatus.FAILED);
        mockMvc.perform(patch("/api/v1/bills/payments/" + payId + "/status")
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(failNoReason)))
                .andExpect(status().isBadRequest());

        // Fail with reason -> Succeeds
        failNoReason.setFailureReason("Card declined by bank");
        mockMvc.perform(patch("/api/v1/bills/payments/" + payId + "/status")
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(failNoReason)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("FAILED"))
                .andExpect(jsonPath("$.failureReason").value("Card declined by bank"));

        // Bill remains ISSUED with paidAmount = 0
        mockMvc.perform(get("/api/v1/bills/" + billId)
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ISSUED"))
                .andExpect(jsonPath("$.paidAmount").value(0.00));
    }

    @Test
    void testIdempotency_duplicatePaymentSubmission() throws Exception {
        CreateBillRequest billReq = new CreateBillRequest();
        billReq.setOrderId(sampleOrder.getId());
        String billResp = mockMvc.perform(post("/api/v1/bills")
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(billReq)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String billId = objectMapper.readTree(billResp).get("id").asText();

        String idempotencyKey = "PAY-IDEM-" + UUID.randomUUID();

        CreatePaymentRequest payReq = new CreatePaymentRequest();
        payReq.setBillId(UUID.fromString(billId));
        payReq.setPaymentMethod(PaymentMethod.UPI);
        payReq.setAmount(new BigDecimal("15.00"));
        payReq.setIdempotencyKey(idempotencyKey);

        // First attempt
        String resp1 = mockMvc.perform(post("/api/v1/bills/payments")
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payReq)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String payId1 = objectMapper.readTree(resp1).get("id").asText();

        // Duplicate submission
        String resp2 = mockMvc.perform(post("/api/v1/bills/payments")
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payReq)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String payId2 = objectMapper.readTree(resp2).get("id").asText();

        // Must return the exact same payment ID
        assertThat(payId1).isEqualTo(payId2);
    }

    @Test
    void testTenantIsolation_userFromTenant2CannotAccessTenant1BillsOrPayments() throws Exception {
        // 1. Issue bill in Tenant 1
        CreateBillRequest billReq = new CreateBillRequest();
        billReq.setOrderId(sampleOrder.getId());
        String billResp = mockMvc.perform(post("/api/v1/bills")
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(billReq)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String billId = objectMapper.readTree(billResp).get("id").asText();

        // 2. User 2 from Tenant 2 querying Tenant 1 bill -> 404 (due to TenantId scoping)
        mockMvc.perform(get("/api/v1/bills/" + billId)
                        .with(httpBasic(userT2.getEmail(), password))
                        .header("X-Tenant-ID", tenant2.getId().toString()))
                .andExpect(status().isNotFound());

        // 3. User 2 querying Outlet T1's bills -> 403 Forbidden
        mockMvc.perform(get("/api/v1/bills/outlet/" + outletT1.getId())
                        .with(httpBasic(userT2.getEmail(), password))
                        .header("X-Tenant-ID", tenant2.getId().toString()))
                .andExpect(status().isForbidden());
    }
}

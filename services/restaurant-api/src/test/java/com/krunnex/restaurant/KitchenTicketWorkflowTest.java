package com.krunnex.restaurant;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.krunnex.restaurant.domain.*;
import com.krunnex.restaurant.repository.*;
import com.krunnex.restaurant.security.TenantContext;
import com.krunnex.restaurant.web.dto.KitchenTicketItemStatusUpdateRequest;
import com.krunnex.restaurant.web.dto.KitchenTicketStatusUpdateRequest;
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
class KitchenTicketWorkflowTest {

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
        tenant1.setDomain("boba-kot-" + UUID.randomUUID() + ".local");
        tenant1 = tenantRepository.save(tenant1);

        tenant2 = new Tenant();
        tenant2.setName("Coffee Corner");
        tenant2.setDomain("coffee-kot-" + UUID.randomUUID() + ".local");
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
        roleT1.setName("COOK-" + UUID.randomUUID());
        roleT1.setTenantId(tenant1.getId());
        roleT1.setPermissions(Collections.emptySet());
        roleT1 = roleRepository.save(roleT1);

        Role roleT2 = new Role();
        roleT2.setName("COOK-" + UUID.randomUUID());
        roleT2.setTenantId(tenant2.getId());
        roleT2.setPermissions(Collections.emptySet());
        roleT2 = roleRepository.save(roleT2);

        userT1 = new User();
        userT1.setEmail("kot-user1-" + UUID.randomUUID() + "@example.com");
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
        userT2.setEmail("kot-user2-" + UUID.randomUUID() + "@example.com");
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

        // 4. Products and Sample Order in Tenant 1
        TenantContext.setTenantId(tenant1.getId());

        ProductCategory category = new ProductCategory();
        category.setName("Teas");
        category.setTenantId(tenant1.getId());
        category = categoryRepository.saveAndFlush(category);

        Product tea = new Product();
        tea.setName("Jasmine Green Tea");
        tea.setCategory(category);
        tea.setBasePrice(new BigDecimal("4.00"));
        tea.setTenantId(tenant1.getId());
        tea = productRepository.saveAndFlush(tea);

        ProductVariant variant = new ProductVariant();
        variant.setName("Large 475ml");
        variant.setSizeLabel("475 ml");
        variant.setPrice(new BigDecimal("5.00"));
        variant.setProduct(tea);
        variant.setTenantId(tenant1.getId());
        variant = variantRepository.saveAndFlush(variant);

        AddOn bobaPearls = new AddOn();
        bobaPearls.setName("Boba Pearls");
        bobaPearls.setPrice(new BigDecimal("0.50"));
        bobaPearls.setTenantId(tenant1.getId());
        bobaPearls = addOnRepository.saveAndFlush(bobaPearls);

        sampleOrder = new Order();
        sampleOrder.setTenantId(tenant1.getId());
        sampleOrder.setOutlet(outletT1);
        sampleOrder.setOrderNumber("ORD-KOT-" + UUID.randomUUID().toString().substring(0, 6));
        sampleOrder.setOrderType(OrderType.DINE_IN);
        sampleOrder.setStatus(OrderStatus.CONFIRMED);
        sampleOrder.setCustomerNotes("No straw please");
        sampleOrder.setSubtotal(new BigDecimal("11.00"));
        sampleOrder.setTotalAmount(new BigDecimal("11.00"));

        OrderItem item1 = new OrderItem();
        item1.setTenantId(tenant1.getId());
        item1.setOrder(sampleOrder);
        item1.setProduct(tea);
        item1.setVariant(variant);
        item1.setProductNameSnapshot("Jasmine Green Tea");
        item1.setVariantNameSnapshot("Large 475ml");
        item1.setQuantity(2);
        item1.setUnitPriceSnapshot(new BigDecimal("5.50"));
        item1.setLineTotalSnapshot(new BigDecimal("11.00"));
        item1.setItemNotes("25% Sugar, Less Ice");

        OrderItemAddOn itemAddOn = new OrderItemAddOn();
        itemAddOn.setTenantId(tenant1.getId());
        itemAddOn.setAddOn(bobaPearls);
        itemAddOn.setAddOnNameSnapshot("Boba Pearls");
        itemAddOn.setPriceSnapshot(new BigDecimal("0.50"));
        item1.addAddOn(itemAddOn);

        sampleOrder.addItem(item1);
        sampleOrder = orderRepository.saveAndFlush(sampleOrder);

        TenantContext.clear();
    }

    @Test
    void testCreateKitchenTicket_withItemSnapshotsAndAddOns() throws Exception {
        String resp = mockMvc.perform(post("/api/v1/kitchen-tickets/orders/" + sampleOrder.getId())
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.ticketNumber").isNotEmpty())
                .andExpect(jsonPath("$.status").value("QUEUED"))
                .andExpect(jsonPath("$.orderNumberSnapshot").value(sampleOrder.getOrderNumber()))
                .andExpect(jsonPath("$.orderTypeSnapshot").value("DINE_IN"))
                .andExpect(jsonPath("$.customerNotesSnapshot").value("No straw please"))
                .andExpect(jsonPath("$.items[0].productNameSnapshot").value("Jasmine Green Tea"))
                .andExpect(jsonPath("$.items[0].variantNameSnapshot").value("Large 475ml"))
                .andExpect(jsonPath("$.items[0].quantity").value(2))
                .andExpect(jsonPath("$.items[0].itemNotesSnapshot").value("25% Sugar, Less Ice"))
                .andExpect(jsonPath("$.items[0].status").value("QUEUED"))
                .andExpect(jsonPath("$.items[0].addOns[0].addOnNameSnapshot").value("Boba Pearls"))
                .andReturn().getResponse().getContentAsString();

        String ticketId = objectMapper.readTree(resp).get("id").asText();
        assertThat(ticketId).isNotNull();

        // 2. Duplicate prevention: processing the same order returns the existing ticket
        mockMvc.perform(post("/api/v1/kitchen-tickets/orders/" + sampleOrder.getId())
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(ticketId));
    }

    @Test
    void testTicketStatusTransitions_andCancellationValidation() throws Exception {
        // Create ticket
        String resp = mockMvc.perform(post("/api/v1/kitchen-tickets/orders/" + sampleOrder.getId())
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString()))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String ticketId = objectMapper.readTree(resp).get("id").asText();

        // 1. Transition: QUEUED -> PREPARING
        KitchenTicketStatusUpdateRequest prepReq = new KitchenTicketStatusUpdateRequest();
        prepReq.setStatus(KitchenTicketStatus.PREPARING);

        mockMvc.perform(patch("/api/v1/kitchen-tickets/" + ticketId + "/status")
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(prepReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PREPARING"));

        // 2. Transition: PREPARING -> READY
        KitchenTicketStatusUpdateRequest readyReq = new KitchenTicketStatusUpdateRequest();
        readyReq.setStatus(KitchenTicketStatus.READY);

        mockMvc.perform(patch("/api/v1/kitchen-tickets/" + ticketId + "/status")
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(readyReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("READY"));

        // 3. READY is terminal -> Transition to QUEUED must fail with 400 Bad Request
        KitchenTicketStatusUpdateRequest invalidReq = new KitchenTicketStatusUpdateRequest();
        invalidReq.setStatus(KitchenTicketStatus.QUEUED);

        mockMvc.perform(patch("/api/v1/kitchen-tickets/" + ticketId + "/status")
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidReq)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testItemLevelPreparationStatusTracking() throws Exception {
        // Create ticket
        String resp = mockMvc.perform(post("/api/v1/kitchen-tickets/orders/" + sampleOrder.getId())
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString()))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String ticketId = objectMapper.readTree(resp).get("id").asText();
        String itemId = objectMapper.readTree(resp).get("items").get(0).get("id").asText();

        // 1. Update individual item to PREPARING -> updates parent ticket to PREPARING
        KitchenTicketItemStatusUpdateRequest itemPrepReq = new KitchenTicketItemStatusUpdateRequest();
        itemPrepReq.setStatus(KitchenTicketStatus.PREPARING);

        mockMvc.perform(patch("/api/v1/kitchen-tickets/items/" + itemId + "/status")
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(itemPrepReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PREPARING"));

        mockMvc.perform(get("/api/v1/kitchen-tickets/" + ticketId)
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PREPARING"));

        // 2. Update individual item to READY -> All items ready, updates parent ticket to READY
        KitchenTicketItemStatusUpdateRequest itemReadyReq = new KitchenTicketItemStatusUpdateRequest();
        itemReadyReq.setStatus(KitchenTicketStatus.READY);

        mockMvc.perform(patch("/api/v1/kitchen-tickets/items/" + itemId + "/status")
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(itemReadyReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("READY"));

        mockMvc.perform(get("/api/v1/kitchen-tickets/" + ticketId)
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("READY"));
    }

    @Test
    void testTicketCancellation_requiresReason() throws Exception {
        String resp = mockMvc.perform(post("/api/v1/kitchen-tickets/orders/" + sampleOrder.getId())
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString()))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String ticketId = objectMapper.readTree(resp).get("id").asText();

        // 1. Cancel without reason -> 400 Bad Request
        KitchenTicketStatusUpdateRequest cancelNoReason = new KitchenTicketStatusUpdateRequest();
        cancelNoReason.setStatus(KitchenTicketStatus.CANCELLED);

        mockMvc.perform(patch("/api/v1/kitchen-tickets/" + ticketId + "/status")
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(cancelNoReason)))
                .andExpect(status().isBadRequest());

        // 2. Cancel with reason -> Succeeds
        cancelNoReason.setCancellationReason("Customer cancelled beverage");
        mockMvc.perform(patch("/api/v1/kitchen-tickets/" + ticketId + "/status")
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(cancelNoReason)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"))
                .andExpect(jsonPath("$.cancellationReason").value("Customer cancelled beverage"));
    }

    @Test
    void testTenantAndOutletIsolation_andPaginationFiltering() throws Exception {
        // 1. Create ticket in Tenant 1
        String resp = mockMvc.perform(post("/api/v1/kitchen-tickets/orders/" + sampleOrder.getId())
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString()))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String ticketId = objectMapper.readTree(resp).get("id").asText();

        // 2. User 1 queries outlet tickets with pagination
        mockMvc.perform(get("/api/v1/kitchen-tickets/outlet/" + outletT1.getId() + "?page=0&size=10&status=QUEUED")
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(ticketId));

        // 3. User 2 from Tenant 2 querying Tenant 1 ticket by ID -> 404 (scoped out)
        mockMvc.perform(get("/api/v1/kitchen-tickets/" + ticketId)
                        .with(httpBasic(userT2.getEmail(), password))
                        .header("X-Tenant-ID", tenant2.getId().toString()))
                .andExpect(status().isNotFound());

        // 4. User 2 querying Outlet T1's tickets -> 403 Forbidden
        mockMvc.perform(get("/api/v1/kitchen-tickets/outlet/" + outletT1.getId())
                        .with(httpBasic(userT2.getEmail(), password))
                        .header("X-Tenant-ID", tenant2.getId().toString()))
                .andExpect(status().isForbidden());
    }
}

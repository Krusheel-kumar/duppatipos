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
class PricingAndTaxRulesTest {

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

    private TaxRate exclusiveTax;
    private TaxRate inclusiveTax;
    private Product bobaProduct;
    private ProductVariant regularVariant;
    private ProductVariant largeVariant;
    private AddOn tapiocaAddon;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(context)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();

        // 1. Tenants
        tenant1 = new Tenant();
        tenant1.setName("Boba Brand One");
        tenant1.setDomain("boba1-" + UUID.randomUUID() + ".local");
        tenant1 = tenantRepository.save(tenant1);

        tenant2 = new Tenant();
        tenant2.setName("Coffee Brand Two");
        tenant2.setDomain("coffee2-" + UUID.randomUUID() + ".local");
        tenant2 = tenantRepository.save(tenant2);

        // 2. Outlets
        TenantContext.setTenantId(tenant1.getId());
        outletT1 = new Outlet();
        outletT1.setName("Boba Outlet Downtown");
        outletT1.setTenantId(tenant1.getId());
        outletT1 = outletRepository.saveAndFlush(outletT1);

        TenantContext.setTenantId(tenant2.getId());
        outletT2 = new Outlet();
        outletT2.setName("Coffee Outlet Uptown");
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
        userT1.setEmail("user1-" + UUID.randomUUID() + "@example.com");
        userT1.setPasswordHash(passwordEncoder.encode(password));
        userT1 = userRepository.save(userT1);

        TenantMembership tm1 = new TenantMembership();
        tm1.setUser(userT1);
        tm1.setTenant(tenant1);
        tm1.setRole(roleT1);
        tenantMembershipRepository.save(tm1);

        userT2 = new User();
        userT2.setEmail("user2-" + UUID.randomUUID() + "@example.com");
        userT2.setPasswordHash(passwordEncoder.encode(password));
        userT2 = userRepository.save(userT2);

        TenantMembership tm2 = new TenantMembership();
        tm2.setUser(userT2);
        tm2.setTenant(tenant2);
        tm2.setRole(roleT2);
        tenantMembershipRepository.save(tm2);

        // 4. Tax rates in Tenant 1
        TenantContext.setTenantId(tenant1.getId());

        exclusiveTax = new TaxRate();
        exclusiveTax.setName("GST 5% Exclusive");
        exclusiveTax.setRatePercent(new BigDecimal("5.00"));
        exclusiveTax.setIsInclusive(false);
        exclusiveTax.setTenantId(tenant1.getId());
        exclusiveTax = taxRateRepository.saveAndFlush(exclusiveTax);

        inclusiveTax = new TaxRate();
        inclusiveTax.setName("VAT 10% Inclusive");
        inclusiveTax.setRatePercent(new BigDecimal("10.00"));
        inclusiveTax.setIsInclusive(true);
        inclusiveTax.setTenantId(tenant1.getId());
        inclusiveTax = taxRateRepository.saveAndFlush(inclusiveTax);

        // 5. Category, Product, Variants and Add-ons in Tenant 1
        ProductCategory cat = new ProductCategory();
        cat.setName("Beverages " + UUID.randomUUID());
        cat.setTenantId(tenant1.getId());
        cat = categoryRepository.saveAndFlush(cat);

        bobaProduct = new Product();
        bobaProduct.setCategory(cat);
        bobaProduct.setName("Brown Sugar Milk Tea");
        bobaProduct.setBasePrice(new BigDecimal("5.00"));
        bobaProduct.setTaxRate(exclusiveTax);
        bobaProduct.setTenantId(tenant1.getId());
        bobaProduct = productRepository.saveAndFlush(bobaProduct);

        regularVariant = new ProductVariant();
        regularVariant.setName("Regular 300ml");
        regularVariant.setSizeLabel("300 ml");
        regularVariant.setPrice(new BigDecimal("5.00"));
        regularVariant.setProduct(bobaProduct);
        regularVariant.setTenantId(tenant1.getId());
        regularVariant = variantRepository.saveAndFlush(regularVariant);

        largeVariant = new ProductVariant();
        largeVariant.setName("Large 475ml");
        largeVariant.setSizeLabel("475 ml");
        largeVariant.setPrice(new BigDecimal("6.50"));
        largeVariant.setProduct(bobaProduct);
        largeVariant.setTenantId(tenant1.getId());
        largeVariant = variantRepository.saveAndFlush(largeVariant);

        tapiocaAddon = new AddOn();
        tapiocaAddon.setName("Boba Pearls");
        tapiocaAddon.setPrice(new BigDecimal("0.75"));
        tapiocaAddon.setTenantId(tenant1.getId());
        tapiocaAddon = addOnRepository.saveAndFlush(tapiocaAddon);

        TenantContext.clear();
    }

    @Test
    void testExclusiveTaxCalculation_andRounding() throws Exception {
        // Line total: 1 x $5.00 (Regular) + $0.75 (Boba) = $5.75
        // Tax: 5.75 * 0.05 = 0.2875 -> rounded HALF_UP to 0.29
        // Final Total: 5.75 + 0.29 = 6.04
        CalculationRequest req = new CalculationRequest();
        req.setOutletId(outletT1.getId());

        CalculationRequest.ItemRequest item = new CalculationRequest.ItemRequest();
        item.setProductId(bobaProduct.getId());
        item.setVariantId(regularVariant.getId());
        item.setAddOnIds(List.of(tapiocaAddon.getId()));
        item.setQuantity(1);
        req.setItems(List.of(item));

        mockMvc.perform(post("/api/v1/pricing/calculate")
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.subtotal").value(5.75))
                .andExpect(jsonPath("$.discountAmount").value(0.00))
                .andExpect(jsonPath("$.taxAmount").value(0.29))
                .andExpect(jsonPath("$.totalAmount").value(6.04));
    }

    @Test
    void testInclusiveTaxCalculation() throws Exception {
        // Change product tax rate to inclusive 10%
        TenantContext.setTenantId(tenant1.getId());
        bobaProduct.setTaxRate(inclusiveTax);
        productRepository.saveAndFlush(bobaProduct);
        TenantContext.clear();

        // 2 x $5.00 = $10.00 inclusive total
        // Taxable base = 10.00 / 1.10 = 9.0909
        // Tax component = 10.00 - 9.0909 = 0.9091 -> rounded HALF_UP to 0.91
        // Total amount remains 10.00 (tax is inclusive)
        CalculationRequest req = new CalculationRequest();
        req.setOutletId(outletT1.getId());

        CalculationRequest.ItemRequest item = new CalculationRequest.ItemRequest();
        item.setProductId(bobaProduct.getId());
        item.setVariantId(regularVariant.getId());
        item.setQuantity(2);
        req.setItems(List.of(item));

        mockMvc.perform(post("/api/v1/pricing/calculate")
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.subtotal").value(10.00))
                .andExpect(jsonPath("$.taxAmount").value(0.91))
                .andExpect(jsonPath("$.totalAmount").value(10.00));
    }

    @Test
    void testConfigurableDiscounts_percentageAndFixedAmount() throws Exception {
        TenantContext.setTenantId(tenant1.getId());
        Discount pctDiscount = new Discount();
        pctDiscount.setName("Happy Hour 20%");
        pctDiscount.setDiscountType(DiscountType.PERCENTAGE);
        pctDiscount.setValue(new BigDecimal("20.00"));
        pctDiscount.setTenantId(tenant1.getId());
        pctDiscount = discountRepository.saveAndFlush(pctDiscount);

        Discount fixedDiscount = new Discount();
        fixedDiscount.setName("Coupon $50 Off");
        fixedDiscount.setDiscountType(DiscountType.FIXED_AMOUNT);
        fixedDiscount.setValue(new BigDecimal("50.00"));
        fixedDiscount.setTenantId(tenant1.getId());
        fixedDiscount = discountRepository.saveAndFlush(fixedDiscount);
        TenantContext.clear();

        // 1. Percentage discount: 2 x $5.00 = $10.00. 20% discount = $2.00. Net = $8.00
        // Exclusive tax 5% on $8.00 = $0.40. Total = $8.40
        CalculationRequest req1 = new CalculationRequest();
        req1.setOutletId(outletT1.getId());
        CalculationRequest.ItemRequest item = new CalculationRequest.ItemRequest();
        item.setProductId(bobaProduct.getId());
        item.setVariantId(regularVariant.getId());
        item.setQuantity(2);
        req1.setItems(List.of(item));
        req1.setDiscountId(pctDiscount.getId());

        mockMvc.perform(post("/api/v1/pricing/calculate")
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req1)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.subtotal").value(10.00))
                .andExpect(jsonPath("$.discountAmount").value(2.00))
                .andExpect(jsonPath("$.taxableAmount").value(8.00))
                .andExpect(jsonPath("$.totalAmount").value(8.40));

        // 2. Fixed discount exceeding subtotal: $50 off on $10.00 bill.
        // Discount must cap at $10.00, net total cannot be negative ($0.00).
        req1.setDiscountId(fixedDiscount.getId());
        mockMvc.perform(post("/api/v1/pricing/calculate")
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req1)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.subtotal").value(10.00))
                .andExpect(jsonPath("$.discountAmount").value(10.00))
                .andExpect(jsonPath("$.totalAmount").value(0.00));
    }

    @Test
    void testOutletSpecificPriceOverrides() throws Exception {
        // Large Variant base price is $6.50.
        // Apply outlet price override for Outlet T1 to $7.25.
        PriceOverrideRequest overrideReq = new PriceOverrideRequest();
        overrideReq.setPrice(new BigDecimal("7.25"));

        mockMvc.perform(put("/api/v1/pricing/outlets/" + outletT1.getId() + "/variants/" + largeVariant.getId())
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(overrideReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.price").value(7.25));

        // Calculate totals for Large Variant at Outlet T1:
        // Price used must be the overridden $7.25, NOT $6.50
        CalculationRequest calcReq = new CalculationRequest();
        calcReq.setOutletId(outletT1.getId());
        CalculationRequest.ItemRequest item = new CalculationRequest.ItemRequest();
        item.setProductId(bobaProduct.getId());
        item.setVariantId(largeVariant.getId());
        item.setQuantity(1);
        calcReq.setItems(List.of(item));

        mockMvc.perform(post("/api/v1/pricing/calculate")
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(calcReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.subtotal").value(7.25));
    }

    @Test
    void testValidation_andCrossTenantRestrictions() throws Exception {
        // 1. Validation: Negative tax rate rejected
        TaxRateRequest badTax = new TaxRateRequest();
        badTax.setName("Negative Tax");
        badTax.setRatePercent(new BigDecimal("-5.00"));

        mockMvc.perform(post("/api/v1/tax-rates")
                        .with(httpBasic(userT1.getEmail(), password))
                        .header("X-Tenant-ID", tenant1.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(badTax)))
                .andExpect(status().isBadRequest());

        // 2. Cross-tenant access: User T2 attempting to calculate or override pricing for Outlet T1 rejected with 403
        CalculationRequest calcReq = new CalculationRequest();
        calcReq.setOutletId(outletT1.getId()); // Belongs to Tenant 1
        CalculationRequest.ItemRequest item = new CalculationRequest.ItemRequest();
        item.setProductId(bobaProduct.getId());
        calcReq.setItems(List.of(item));

        mockMvc.perform(post("/api/v1/pricing/calculate")
                        .with(httpBasic(userT2.getEmail(), password))
                        .header("X-Tenant-ID", tenant2.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(calcReq)))
                .andExpect(status().isForbidden());
    }
}

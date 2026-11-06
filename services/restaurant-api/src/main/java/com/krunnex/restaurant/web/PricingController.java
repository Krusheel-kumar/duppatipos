package com.krunnex.restaurant.web;

import com.krunnex.restaurant.domain.Outlet;
import com.krunnex.restaurant.domain.OutletProductPrice;
import com.krunnex.restaurant.domain.OutletVariantPrice;
import com.krunnex.restaurant.domain.Product;
import com.krunnex.restaurant.domain.ProductVariant;
import com.krunnex.restaurant.repository.*;
import com.krunnex.restaurant.service.PricingCalculationService;
import com.krunnex.restaurant.web.dto.CalculationRequest;
import com.krunnex.restaurant.web.dto.CalculationResponse;
import com.krunnex.restaurant.web.dto.PriceOverrideRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/pricing")
public class PricingController {

    private final PricingCalculationService pricingCalculationService;
    private final OutletRepository outletRepository;
    private final ProductRepository productRepository;
    private final ProductVariantRepository variantRepository;
    private final OutletProductPriceRepository outletProductPriceRepository;
    private final OutletVariantPriceRepository outletVariantPriceRepository;

    public PricingController(
            PricingCalculationService pricingCalculationService,
            OutletRepository outletRepository,
            ProductRepository productRepository,
            ProductVariantRepository variantRepository,
            OutletProductPriceRepository outletProductPriceRepository,
            OutletVariantPriceRepository outletVariantPriceRepository) {
        this.pricingCalculationService = pricingCalculationService;
        this.outletRepository = outletRepository;
        this.productRepository = productRepository;
        this.variantRepository = variantRepository;
        this.outletProductPriceRepository = outletProductPriceRepository;
        this.outletVariantPriceRepository = outletVariantPriceRepository;
    }

    /**
     * Server-side calculation endpoint. Calculates subtotal, discounts, taxes (inclusive/exclusive), and totals.
     */
    @PostMapping("/calculate")
    @PreAuthorize("@tenantAuthorizationService.canAccessOutlet(#request.outletId)")
    public ResponseEntity<CalculationResponse> calculateTotals(@Valid @RequestBody CalculationRequest request) {
        CalculationResponse response = pricingCalculationService.calculateTotals(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Override product price for a specific outlet.
     */
    @PutMapping("/outlets/{outletId}/products/{productId}")
    @PreAuthorize("@tenantAuthorizationService.canAccessOutlet(#outletId)")
    public ResponseEntity<OutletProductPrice> setProductPriceOverride(
            @PathVariable UUID outletId,
            @PathVariable UUID productId,
            @Valid @RequestBody PriceOverrideRequest request) {
        Outlet outlet = outletRepository.findByIdWithoutTenantScope(outletId)
                .orElseThrow(() -> new IllegalArgumentException("Outlet not found: " + outletId));
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Product not found: " + productId));

        OutletProductPrice override = outletProductPriceRepository
                .findByOutletIdAndProductId(outletId, productId)
                .orElseGet(() -> {
                    OutletProductPrice newPrice = new OutletProductPrice();
                    newPrice.setOutlet(outlet);
                    newPrice.setProduct(product);
                    return newPrice;
                });

        override.setPrice(request.getPrice());
        return ResponseEntity.ok(outletProductPriceRepository.save(override));
    }

    /**
     * Override variant price for a specific outlet.
     */
    @PutMapping("/outlets/{outletId}/variants/{variantId}")
    @PreAuthorize("@tenantAuthorizationService.canAccessOutlet(#outletId)")
    public ResponseEntity<OutletVariantPrice> setVariantPriceOverride(
            @PathVariable UUID outletId,
            @PathVariable UUID variantId,
            @Valid @RequestBody PriceOverrideRequest request) {
        Outlet outlet = outletRepository.findByIdWithoutTenantScope(outletId)
                .orElseThrow(() -> new IllegalArgumentException("Outlet not found: " + outletId));
        ProductVariant variant = variantRepository.findById(variantId)
                .orElseThrow(() -> new IllegalArgumentException("Variant not found: " + variantId));

        OutletVariantPrice override = outletVariantPriceRepository
                .findByOutletIdAndVariantId(outletId, variantId)
                .orElseGet(() -> {
                    OutletVariantPrice newPrice = new OutletVariantPrice();
                    newPrice.setOutlet(outlet);
                    newPrice.setVariant(variant);
                    return newPrice;
                });

        override.setPrice(request.getPrice());
        return ResponseEntity.ok(outletVariantPriceRepository.save(override));
    }
}

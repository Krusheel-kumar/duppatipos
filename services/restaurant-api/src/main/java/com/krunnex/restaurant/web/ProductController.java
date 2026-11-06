package com.krunnex.restaurant.web;

import com.krunnex.restaurant.domain.*;
import com.krunnex.restaurant.repository.*;
import com.krunnex.restaurant.web.dto.AvailabilityRequest;
import com.krunnex.restaurant.web.dto.ProductRequest;
import com.krunnex.restaurant.web.dto.VariantRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/v1/products")
public class ProductController {

    private final ProductRepository productRepository;
    private final ProductCategoryRepository categoryRepository;
    private final AddOnRepository addOnRepository;
    private final OutletRepository outletRepository;
    private final OutletProductAvailabilityRepository availabilityRepository;

    public ProductController(
            ProductRepository productRepository,
            ProductCategoryRepository categoryRepository,
            AddOnRepository addOnRepository,
            OutletRepository outletRepository,
            OutletProductAvailabilityRepository availabilityRepository) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.addOnRepository = addOnRepository;
        this.outletRepository = outletRepository;
        this.availabilityRepository = availabilityRepository;
    }

    @GetMapping
    public List<Product> listProducts(@RequestParam(required = false) UUID categoryId) {
        if (categoryId != null) {
            return productRepository.findByCategoryId(categoryId);
        }
        return productRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Product> getProduct(@PathVariable UUID id) {
        return productRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Transactional
    public ResponseEntity<Product> createProduct(@Valid @RequestBody ProductRequest request) {
        ProductCategory category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new IllegalArgumentException("Category not found: " + request.getCategoryId()));

        Product product = new Product();
        product.setCategory(category);
        product.setName(request.getName());
        product.setDescription(request.getDescription());
        product.setSku(request.getSku());
        product.setImageUrl(request.getImageUrl());
        product.setBasePrice(request.getBasePrice());
        product.setIsActive(request.getIsActive() != null ? request.getIsActive() : true);

        // Map Add-ons
        if (request.getAddOnIds() != null && !request.getAddOnIds().isEmpty()) {
            List<AddOn> addOns = addOnRepository.findAllById(request.getAddOnIds());
            product.setAddOns(new HashSet<>(addOns));
        }

        // Map Variants / Sizes
        if (request.getVariants() != null) {
            for (VariantRequest vr : request.getVariants()) {
                ProductVariant variant = new ProductVariant();
                variant.setName(vr.getName());
                variant.setSizeLabel(vr.getSizeLabel());
                variant.setSku(vr.getSku());
                variant.setPrice(vr.getPrice());
                variant.setIsActive(vr.getIsActive() != null ? vr.getIsActive() : true);
                variant.setDisplayOrder(vr.getDisplayOrder() != null ? vr.getDisplayOrder() : 0);
                product.addVariant(variant);
            }
        }

        Product saved = productRepository.save(product);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<Product> updateProduct(
            @PathVariable UUID id,
            @Valid @RequestBody ProductRequest request) {
        return productRepository.findById(id)
                .map(product -> {
                    ProductCategory category = categoryRepository.findById(request.getCategoryId())
                            .orElseThrow(() -> new IllegalArgumentException("Category not found: " + request.getCategoryId()));

                    product.setCategory(category);
                    product.setName(request.getName());
                    product.setDescription(request.getDescription());
                    product.setSku(request.getSku());
                    product.setImageUrl(request.getImageUrl());
                    product.setBasePrice(request.getBasePrice());
                    if (request.getIsActive() != null) {
                        product.setIsActive(request.getIsActive());
                    }

                    // Update Add-ons
                    if (request.getAddOnIds() != null) {
                        List<AddOn> addOns = addOnRepository.findAllById(request.getAddOnIds());
                        product.setAddOns(new HashSet<>(addOns));
                    } else {
                        product.getAddOns().clear();
                    }

                    // Update Variants
                    product.getVariants().clear();
                    if (request.getVariants() != null) {
                        for (VariantRequest vr : request.getVariants()) {
                            ProductVariant variant = new ProductVariant();
                            variant.setName(vr.getName());
                            variant.setSizeLabel(vr.getSizeLabel());
                            variant.setSku(vr.getSku());
                            variant.setPrice(vr.getPrice());
                            variant.setIsActive(vr.getIsActive() != null ? vr.getIsActive() : true);
                            variant.setDisplayOrder(vr.getDisplayOrder() != null ? vr.getDisplayOrder() : 0);
                            product.addVariant(variant);
                        }
                    }

                    return ResponseEntity.ok(productRepository.save(product));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<Product> deactivateProduct(@PathVariable UUID id) {
        return productRepository.findById(id)
                .map(product -> {
                    product.setIsActive(false);
                    return ResponseEntity.ok(productRepository.save(product));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Outlet-specific availability override (with Task 02 outlet-level authorization)
    @PutMapping("/{id}/availability/{outletId}")
    @PreAuthorize("@tenantAuthorizationService.canAccessOutlet(#outletId)")
    public ResponseEntity<OutletProductAvailability> updateOutletAvailability(
            @PathVariable UUID id,
            @PathVariable UUID outletId,
            @Valid @RequestBody AvailabilityRequest request) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Product not found: " + id));
        Outlet outlet = outletRepository.findByIdWithoutTenantScope(outletId)
                .orElseThrow(() -> new IllegalArgumentException("Outlet not found: " + outletId));

        OutletProductAvailability availability = availabilityRepository
                .findByOutletIdAndProductId(outletId, id)
                .orElseGet(() -> {
                    OutletProductAvailability newAvail = new OutletProductAvailability();
                    newAvail.setOutlet(outlet);
                    newAvail.setProduct(product);
                    return newAvail;
                });

        availability.setIsAvailable(request.getIsAvailable());
        OutletProductAvailability saved = availabilityRepository.save(availability);
        return ResponseEntity.ok(saved);
    }
}

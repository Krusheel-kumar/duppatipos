package com.krunnex.restaurant.service;

import com.krunnex.restaurant.domain.*;
import com.krunnex.restaurant.repository.*;
import com.krunnex.restaurant.web.dto.CalculationRequest;
import com.krunnex.restaurant.web.dto.CalculationResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

@Service
public class PricingCalculationService {

    public static final RoundingMode DEFAULT_ROUNDING = RoundingMode.HALF_UP;
    public static final int MONEY_SCALE = 2;
    public static final int CALCULATION_SCALE = 4;

    private final ProductRepository productRepository;
    private final ProductVariantRepository variantRepository;
    private final AddOnRepository addOnRepository;
    private final OutletProductPriceRepository outletProductPriceRepository;
    private final OutletVariantPriceRepository outletVariantPriceRepository;
    private final DiscountRepository discountRepository;

    public PricingCalculationService(
            ProductRepository productRepository,
            ProductVariantRepository variantRepository,
            AddOnRepository addOnRepository,
            OutletProductPriceRepository outletProductPriceRepository,
            OutletVariantPriceRepository outletVariantPriceRepository,
            DiscountRepository discountRepository) {
        this.productRepository = productRepository;
        this.variantRepository = variantRepository;
        this.addOnRepository = addOnRepository;
        this.outletProductPriceRepository = outletProductPriceRepository;
        this.outletVariantPriceRepository = outletVariantPriceRepository;
        this.discountRepository = discountRepository;
    }

    /**
     * Resolves effective price for a product/variant at a given outlet.
     */
    public BigDecimal resolveEffectiveUnitPrice(UUID outletId, Product product, ProductVariant variant) {
        if (variant != null) {
            Optional<OutletVariantPrice> override = outletVariantPriceRepository.findByOutletIdAndVariantId(outletId, variant.getId());
            if (override.isPresent()) {
                return override.get().getPrice().setScale(MONEY_SCALE, DEFAULT_ROUNDING);
            }
            return variant.getPrice().setScale(MONEY_SCALE, DEFAULT_ROUNDING);
        } else {
            Optional<OutletProductPrice> override = outletProductPriceRepository.findByOutletIdAndProductId(outletId, product.getId());
            if (override.isPresent()) {
                return override.get().getPrice().setScale(MONEY_SCALE, DEFAULT_ROUNDING);
            }
            return product.getBasePrice().setScale(MONEY_SCALE, DEFAULT_ROUNDING);
        }
    }

    /**
     * Performs pure, server-side monetary calculation with rounding rules.
     */
    @Transactional(readOnly = true)
    public CalculationResponse calculateTotals(CalculationRequest request) {
        UUID outletId = request.getOutletId();

        BigDecimal subtotal = BigDecimal.ZERO.setScale(MONEY_SCALE, DEFAULT_ROUNDING);
        List<CalculationResponse.ItemDetail> itemDetails = new ArrayList<>();

        for (CalculationRequest.ItemRequest itemReq : request.getItems()) {
            Product product = productRepository.findById(itemReq.getProductId())
                    .orElseThrow(() -> new IllegalArgumentException("Product not found: " + itemReq.getProductId()));

            ProductVariant variant = null;
            if (itemReq.getVariantId() != null) {
                variant = variantRepository.findById(itemReq.getVariantId())
                        .orElseThrow(() -> new IllegalArgumentException("Variant not found: " + itemReq.getVariantId()));
            }

            BigDecimal unitPrice = resolveEffectiveUnitPrice(outletId, product, variant);

            // Add-ons
            if (itemReq.getAddOnIds() != null && !itemReq.getAddOnIds().isEmpty()) {
                List<AddOn> addOns = addOnRepository.findAllById(itemReq.getAddOnIds());
                for (AddOn addOn : addOns) {
                    unitPrice = unitPrice.add(addOn.getPrice());
                }
            }

            int qty = itemReq.getQuantity() != null ? itemReq.getQuantity() : 1;
            BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(qty)).setScale(MONEY_SCALE, DEFAULT_ROUNDING);
            subtotal = subtotal.add(lineTotal);

            CalculationResponse.ItemDetail detail = new CalculationResponse.ItemDetail();
            detail.setProductName(product.getName() + (variant != null ? " (" + variant.getName() + ")" : ""));
            detail.setQuantity(qty);
            detail.setUnitPrice(unitPrice.setScale(MONEY_SCALE, DEFAULT_ROUNDING));
            detail.setLineTotal(lineTotal);

            TaxRate taxRate = product.getTaxRate();
            if (taxRate != null && Boolean.TRUE.equals(taxRate.getIsActive())) {
                detail.setTaxRatePercent(taxRate.getRatePercent());
                detail.setIsTaxInclusive(taxRate.getIsInclusive());

                BigDecimal rate = taxRate.getRatePercent().divide(BigDecimal.valueOf(100), CALCULATION_SCALE, DEFAULT_ROUNDING);
                BigDecimal itemTax;
                if (Boolean.TRUE.equals(taxRate.getIsInclusive())) {
                    // tax = lineTotal - (lineTotal / (1 + rate))
                    BigDecimal baseWithoutTax = lineTotal.divide(BigDecimal.ONE.add(rate), CALCULATION_SCALE, DEFAULT_ROUNDING);
                    itemTax = lineTotal.subtract(baseWithoutTax).setScale(MONEY_SCALE, DEFAULT_ROUNDING);
                } else {
                    // tax = lineTotal * rate
                    itemTax = lineTotal.multiply(rate).setScale(MONEY_SCALE, DEFAULT_ROUNDING);
                }
                detail.setItemTax(itemTax);
            } else {
                detail.setTaxRatePercent(BigDecimal.ZERO);
                detail.setIsTaxInclusive(false);
                detail.setItemTax(BigDecimal.ZERO.setScale(MONEY_SCALE, DEFAULT_ROUNDING));
            }

            itemDetails.add(detail);
        }

        // Apply discount if provided
        BigDecimal discountAmount = BigDecimal.ZERO.setScale(MONEY_SCALE, DEFAULT_ROUNDING);
        if (request.getDiscountId() != null) {
            Discount discount = discountRepository.findById(request.getDiscountId())
                    .orElseThrow(() -> new IllegalArgumentException("Discount not found: " + request.getDiscountId()));

            if (Boolean.TRUE.equals(discount.getIsActive())) {
                if (discount.getDiscountType() == DiscountType.PERCENTAGE) {
                    BigDecimal pct = discount.getValue().divide(BigDecimal.valueOf(100), CALCULATION_SCALE, DEFAULT_ROUNDING);
                    discountAmount = subtotal.multiply(pct).setScale(MONEY_SCALE, DEFAULT_ROUNDING);
                } else if (discount.getDiscountType() == DiscountType.FIXED_AMOUNT) {
                    discountAmount = discount.getValue().setScale(MONEY_SCALE, DEFAULT_ROUNDING);
                }
                // Validation: discount cannot exceed subtotal, total cannot become negative
                if (discountAmount.compareTo(subtotal) > 0) {
                    discountAmount = subtotal;
                }
            }
        }

        BigDecimal netSubtotal = subtotal.subtract(discountAmount).setScale(MONEY_SCALE, DEFAULT_ROUNDING);
        if (netSubtotal.compareTo(BigDecimal.ZERO) < 0) {
            netSubtotal = BigDecimal.ZERO.setScale(MONEY_SCALE, DEFAULT_ROUNDING);
        }

        // Proportionally scale taxes if a bill-level discount is applied
        BigDecimal totalTax = BigDecimal.ZERO.setScale(MONEY_SCALE, DEFAULT_ROUNDING);
        BigDecimal discountRatio = subtotal.compareTo(BigDecimal.ZERO) > 0
                ? netSubtotal.divide(subtotal, CALCULATION_SCALE, DEFAULT_ROUNDING)
                : BigDecimal.ONE;

        BigDecimal exclusiveTaxSum = BigDecimal.ZERO.setScale(MONEY_SCALE, DEFAULT_ROUNDING);

        for (CalculationResponse.ItemDetail item : itemDetails) {
            BigDecimal adjustedItemTax = item.getItemTax().multiply(discountRatio).setScale(MONEY_SCALE, DEFAULT_ROUNDING);
            item.setItemTax(adjustedItemTax);
            totalTax = totalTax.add(adjustedItemTax);

            if (!Boolean.TRUE.equals(item.getIsTaxInclusive())) {
                exclusiveTaxSum = exclusiveTaxSum.add(adjustedItemTax);
            }
        }

        BigDecimal finalTotal = netSubtotal.add(exclusiveTaxSum).setScale(MONEY_SCALE, DEFAULT_ROUNDING);

        CalculationResponse response = new CalculationResponse();
        response.setSubtotal(subtotal);
        response.setDiscountAmount(discountAmount);
        response.setTaxableAmount(netSubtotal);
        response.setTaxAmount(totalTax);
        response.setTotalAmount(finalTotal);
        response.setItems(itemDetails);

        return response;
    }
}

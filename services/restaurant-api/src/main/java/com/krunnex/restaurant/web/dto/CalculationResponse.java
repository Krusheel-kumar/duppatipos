package com.krunnex.restaurant.web.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class CalculationResponse {

    private BigDecimal subtotal; // sum of (item unit price * qty)
    private BigDecimal discountAmount;
    private BigDecimal taxableAmount;
    private BigDecimal taxAmount;
    private BigDecimal totalAmount;

    private List<ItemDetail> items = new ArrayList<>();

    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }
    public BigDecimal getDiscountAmount() { return discountAmount; }
    public void setDiscountAmount(BigDecimal discountAmount) { this.discountAmount = discountAmount; }
    public BigDecimal getTaxableAmount() { return taxableAmount; }
    public void setTaxableAmount(BigDecimal taxableAmount) { this.taxableAmount = taxableAmount; }
    public BigDecimal getTaxAmount() { return taxAmount; }
    public void setTaxAmount(BigDecimal taxAmount) { this.taxAmount = taxAmount; }
    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }
    public List<ItemDetail> getItems() { return items; }
    public void setItems(List<ItemDetail> items) { this.items = items; }

    public static class ItemDetail {
        private String productName;
        private Integer quantity;
        private BigDecimal unitPrice;
        private BigDecimal lineTotal;
        private BigDecimal taxRatePercent;
        private Boolean isTaxInclusive;
        private BigDecimal itemTax;

        public String getProductName() { return productName; }
        public void setProductName(String productName) { this.productName = productName; }
        public Integer getQuantity() { return quantity; }
        public void setQuantity(Integer quantity) { this.quantity = quantity; }
        public BigDecimal getUnitPrice() { return unitPrice; }
        public void setUnitPrice(BigDecimal unitPrice) { this.unitPrice = unitPrice; }
        public BigDecimal getLineTotal() { return lineTotal; }
        public void setLineTotal(BigDecimal lineTotal) { this.lineTotal = lineTotal; }
        public BigDecimal getTaxRatePercent() { return taxRatePercent; }
        public void setTaxRatePercent(BigDecimal taxRatePercent) { this.taxRatePercent = taxRatePercent; }
        public Boolean getIsTaxInclusive() { return isTaxInclusive; }
        public void setIsTaxInclusive(Boolean isTaxInclusive) { this.isTaxInclusive = isTaxInclusive; }
        public BigDecimal getItemTax() { return itemTax; }
        public void setItemTax(BigDecimal itemTax) { this.itemTax = itemTax; }
    }
}

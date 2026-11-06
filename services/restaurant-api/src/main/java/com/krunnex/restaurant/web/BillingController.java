package com.krunnex.restaurant.web;

import com.krunnex.restaurant.domain.Bill;
import com.krunnex.restaurant.domain.BillStatus;
import com.krunnex.restaurant.domain.Payment;
import com.krunnex.restaurant.domain.PaymentStatus;
import com.krunnex.restaurant.repository.BillRepository;
import com.krunnex.restaurant.repository.PaymentRepository;
import com.krunnex.restaurant.service.BillingAndPaymentService;
import com.krunnex.restaurant.web.dto.CreateBillRequest;
import com.krunnex.restaurant.web.dto.CreatePaymentRequest;
import com.krunnex.restaurant.web.dto.PaymentStatusUpdateRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/bills")
public class BillingController {

    private final BillingAndPaymentService billingService;
    private final BillRepository billRepository;
    private final PaymentRepository paymentRepository;

    public BillingController(
            BillingAndPaymentService billingService,
            BillRepository billRepository,
            PaymentRepository paymentRepository) {
        this.billingService = billingService;
        this.billRepository = billRepository;
        this.paymentRepository = paymentRepository;
    }

    /**
     * Issues an invoice/bill for an order.
     */
    @PostMapping
    public ResponseEntity<Bill> issueBill(@Valid @RequestBody CreateBillRequest request) {
        Bill bill = billingService.issueBill(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(bill);
    }

    /**
     * Get bill details by ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<Bill> getBill(@PathVariable UUID id) {
        return billRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Get bill by order ID.
     */
    @GetMapping("/order/{orderId}")
    public ResponseEntity<Bill> getBillByOrderId(@PathVariable UUID orderId) {
        return billRepository.findByOrderId(orderId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * List bills for an outlet with optional status filtering.
     */
    @GetMapping("/outlet/{outletId}")
    @PreAuthorize("@tenantAuthorizationService.canAccessOutlet(#outletId)")
    public List<Bill> listOutletBills(
            @PathVariable UUID outletId,
            @RequestParam(required = false) BillStatus status) {
        if (status != null) {
            return billRepository.findByOutletIdAndStatus(outletId, status);
        }
        return billRepository.findByOutletIdOrderByCreatedAtDesc(outletId);
    }

    /**
     * Records a payment attempt for a bill.
     */
    @PostMapping("/payments")
    public ResponseEntity<Payment> recordPayment(@Valid @RequestBody CreatePaymentRequest request) {
        Payment payment = billingService.recordPayment(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(payment);
    }

    /**
     * Get payments for a bill.
     */
    @GetMapping("/{id}/payments")
    public List<Payment> getBillPayments(@PathVariable UUID id) {
        return paymentRepository.findByBillIdOrderByCreatedAtAsc(id);
    }

    /**
     * Transition payment status (e.g. SUCCESSFUL, FAILED, REFUNDED).
     */
    @PatchMapping("/payments/{paymentId}/status")
    public ResponseEntity<Payment> updatePaymentStatus(
            @PathVariable UUID paymentId,
            @Valid @RequestBody PaymentStatusUpdateRequest request) {
        Payment updated = billingService.updatePaymentStatus(
                paymentId, request.getStatus(), request.getFailureReason(), request.getRefundReason());
        return ResponseEntity.ok(updated);
    }

    /**
     * Cancel an unpaid bill.
     */
    @PatchMapping("/{id}/cancel")
    public ResponseEntity<Bill> cancelBill(
            @PathVariable UUID id,
            @RequestParam(required = false) String reason) {
        Bill cancelled = billingService.cancelBill(id, reason);
        return ResponseEntity.ok(cancelled);
    }
}

package com.krunnex.restaurant.service;

import com.krunnex.restaurant.domain.*;
import com.krunnex.restaurant.repository.BillRepository;
import com.krunnex.restaurant.repository.OrderRepository;
import com.krunnex.restaurant.repository.PaymentRepository;
import com.krunnex.restaurant.repository.RestaurantTableRepository;
import com.krunnex.restaurant.web.dto.CreateBillRequest;
import com.krunnex.restaurant.web.dto.CreatePaymentRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Optional;
import java.util.UUID;

@Service
public class BillingAndPaymentService {

    private static final int MONEY_SCALE = 2;
    private static final RoundingMode DEFAULT_ROUNDING = RoundingMode.HALF_UP;

    private final BillRepository billRepository;
    private final PaymentRepository paymentRepository;
    private final OrderRepository orderRepository;
    private final KitchenTicketService kitchenTicketService;
    private final RestaurantTableRepository tableRepository;

    public BillingAndPaymentService(
            BillRepository billRepository,
            PaymentRepository paymentRepository,
            OrderRepository orderRepository,
            KitchenTicketService kitchenTicketService,
            RestaurantTableRepository tableRepository) {
        this.billRepository = billRepository;
        this.paymentRepository = paymentRepository;
        this.orderRepository = orderRepository;
        this.kitchenTicketService = kitchenTicketService;
        this.tableRepository = tableRepository;
    }

    /**
     * Issues a Bill/Invoice linked to an Order.
     * Totals are populated directly from the existing Order snapshots (never client-submitted).
     */
    @Transactional
    public Bill issueBill(CreateBillRequest request) {
        Order order = orderRepository.findById(request.getOrderId())
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + request.getOrderId()));

        if (order.getStatus() == OrderStatus.CANCELLED) {
            throw new IllegalStateException("Cannot issue bill for a cancelled order");
        }

        // Check if bill already exists for this order
        Optional<Bill> existing = billRepository.findByOrderId(order.getId());
        if (existing.isPresent()) {
            return existing.get();
        }

        Bill bill = new Bill();
        bill.setTenantId(order.getTenantId());
        bill.setOutlet(order.getOutlet());
        bill.setOrder(order);
        bill.setInvoiceNumber(generateInvoiceNumber(order.getOutlet()));
        bill.setStatus(BillStatus.ISSUED);
        bill.setSubtotal(order.getSubtotal());
        bill.setDiscountAmount(order.getDiscountAmount());
        bill.setTaxableAmount(order.getTaxableAmount());
        bill.setTaxAmount(order.getTaxAmount());
        bill.setTotalAmount(order.getTotalAmount());
        bill.setPaidAmount(BigDecimal.ZERO.setScale(MONEY_SCALE, DEFAULT_ROUNDING));
        bill.setNotes(request.getNotes());

        Bill saved = billRepository.save(bill);

        // Transition linked table to BILL_REQUESTED
        if (order.getTable() != null) {
            RestaurantTable table = order.getTable();
            if (table.getStatus() == TableStatus.RUNNING) {
                table.setStatus(TableStatus.BILL_REQUESTED);
                tableRepository.save(table);
            }
        }

        return saved;
    }

    /**
     * Records an initial payment attempt in PENDING state (or directly processes confirmation if verified).
     * Prevents overpayment and duplicate payments with the same idempotency key.
     */
    @Transactional
    public Payment recordPayment(CreatePaymentRequest request) {
        Bill bill = billRepository.findById(request.getBillId())
                .orElseThrow(() -> new IllegalArgumentException("Bill not found: " + request.getBillId()));

        if (bill.getStatus() == BillStatus.CANCELLED) {
            throw new IllegalStateException("Cannot process payment for a cancelled bill");
        }

        if (bill.getStatus() == BillStatus.PAID) {
            throw new IllegalStateException("Bill is already fully paid");
        }

        // Idempotency check
        if (request.getIdempotencyKey() != null && !request.getIdempotencyKey().isBlank()) {
            Optional<Payment> existing = paymentRepository
                    .findByOutletIdAndIdempotencyKey(bill.getOutlet().getId(), request.getIdempotencyKey());
            if (existing.isPresent()) {
                return existing.get();
            }
        }

        BigDecimal paymentAmount = request.getAmount().setScale(MONEY_SCALE, DEFAULT_ROUNDING);
        BigDecimal remainingAmount = bill.getTotalAmount().subtract(bill.getPaidAmount()).setScale(MONEY_SCALE, DEFAULT_ROUNDING);

        // Overpayment prevention: payment amount cannot exceed remaining balance
        if (paymentAmount.compareTo(remainingAmount) > 0) {
            throw new IllegalArgumentException(
                    String.format("Payment amount %s exceeds remaining bill balance %s", paymentAmount, remainingAmount));
        }

        Payment payment = new Payment();
        payment.setTenantId(bill.getTenantId());
        payment.setOutlet(bill.getOutlet());
        payment.setBill(bill);
        payment.setPaymentMethod(request.getPaymentMethod());
        payment.setStatus(PaymentStatus.PENDING);
        payment.setAmount(paymentAmount);
        payment.setIdempotencyKey(request.getIdempotencyKey());
        payment.setTransactionReference(request.getTransactionReference());

        return paymentRepository.save(payment);
    }

    /**
     * Confirms or updates the state of a payment.
     * When marked SUCCESSFUL, bill paidAmount is updated and status transitioned (PARTIALLY_PAID or PAID).
     */
    @Transactional
    public Payment updatePaymentStatus(UUID paymentId, PaymentStatus newStatus, String failureReason, String refundReason) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found: " + paymentId));

        if (!payment.getStatus().canTransitionTo(newStatus)) {
            throw new IllegalStateException(
                    String.format("Invalid payment status transition from %s to %s", payment.getStatus(), newStatus));
        }

        Bill bill = payment.getBill();

        if (newStatus == PaymentStatus.FAILED) {
            if (failureReason == null || failureReason.isBlank()) {
                throw new IllegalArgumentException("Failure reason is required when failing a payment");
            }
            payment.setFailureReason(failureReason);
        } else if (newStatus == PaymentStatus.REFUNDED) {
            if (refundReason == null || refundReason.isBlank()) {
                throw new IllegalArgumentException("Refund reason is required when refunding a payment");
            }
            payment.setRefundReason(refundReason);
            // Deduct paid amount from bill
            BigDecimal newPaid = bill.getPaidAmount().subtract(payment.getAmount()).setScale(MONEY_SCALE, DEFAULT_ROUNDING);
            if (newPaid.compareTo(BigDecimal.ZERO) < 0) {
                newPaid = BigDecimal.ZERO.setScale(MONEY_SCALE, DEFAULT_ROUNDING);
            }
            bill.setPaidAmount(newPaid);
            if (newPaid.compareTo(BigDecimal.ZERO) == 0) {
                bill.setStatus(BillStatus.ISSUED);
            } else if (newPaid.compareTo(bill.getTotalAmount()) < 0) {
                bill.setStatus(BillStatus.PARTIALLY_PAID);
            }
            billRepository.save(bill);
        } else if (newStatus == PaymentStatus.SUCCESSFUL) {
            // Re-check overpayment before confirming
            BigDecimal remaining = bill.getTotalAmount().subtract(bill.getPaidAmount()).setScale(MONEY_SCALE, DEFAULT_ROUNDING);
            if (payment.getAmount().compareTo(remaining) > 0) {
                throw new IllegalStateException("Confirming payment would result in overpayment");
            }

            BigDecimal newPaid = bill.getPaidAmount().add(payment.getAmount()).setScale(MONEY_SCALE, DEFAULT_ROUNDING);
            bill.setPaidAmount(newPaid);

            if (newPaid.compareTo(bill.getTotalAmount()) >= 0) {
                bill.setStatus(BillStatus.PAID);
                if (bill.getOrder() != null) {
                    Order order = bill.getOrder();
                    if (order.getStatus().canTransitionTo(OrderStatus.COMPLETED)) {
                        order.setStatus(OrderStatus.COMPLETED);
                        orderRepository.save(order);
                    }
                    // If table is linked and bill is paid, transition table to PAID_CLEARING
                    if (order.getTable() != null) {
                        RestaurantTable table = order.getTable();
                        if (table.getStatus() == TableStatus.BILL_REQUESTED || table.getStatus() == TableStatus.PAYMENT_DUE || table.getStatus() == TableStatus.RUNNING) {
                            table.setStatus(TableStatus.PAID_CLEARING);
                            tableRepository.save(table);
                        }
                    }
                }
            } else {
                bill.setStatus(BillStatus.PARTIALLY_PAID);
                if (bill.getOrder() != null && bill.getOrder().getTable() != null) {
                    RestaurantTable table = bill.getOrder().getTable();
                    if (table.getStatus() == TableStatus.BILL_REQUESTED || table.getStatus() == TableStatus.RUNNING) {
                        table.setStatus(TableStatus.PAYMENT_DUE);
                        tableRepository.save(table);
                    }
                }
            }
            billRepository.save(bill);

            // KOT Release Rule for PAY_FIRST:
            // Release KOT now that bill is fully or partially paid (if ticket was held)
            if (bill.getOrder() != null) {
                try {
                    kitchenTicketService.createTicketFromOrder(bill.getOrder().getId());
                } catch (Exception ignored) {
                }
            }
        }

        payment.setStatus(newStatus);
        return paymentRepository.save(payment);
    }

    /**
     * Revises an existing issued bill when additional items are added to a running order.
     * Preserves recorded payments and recalculates subtotal, taxes, and balance due.
     */
    @Transactional
    public Optional<Bill> reviseBillForOrder(Order order) {
        Optional<Bill> billOpt = billRepository.findByOrderId(order.getId());
        if (billOpt.isEmpty()) {
            return Optional.empty();
        }

        Bill bill = billOpt.get();
        if (bill.getStatus() == BillStatus.PAID) {
            // Already paid: do not alter paid bill
            return Optional.of(bill);
        }

        bill.setSubtotal(order.getSubtotal());
        bill.setDiscountAmount(order.getDiscountAmount());
        bill.setTaxableAmount(order.getTaxableAmount());
        bill.setTaxAmount(order.getTaxAmount());
        bill.setTotalAmount(order.getTotalAmount());
        bill.setNotes((bill.getNotes() != null ? bill.getNotes() + " | " : "") + "Revised after item additions at " + java.time.ZonedDateTime.now());

        if (bill.getPaidAmount().compareTo(BigDecimal.ZERO) > 0) {
            bill.setStatus(bill.getPaidAmount().compareTo(bill.getTotalAmount()) >= 0 ? BillStatus.PAID : BillStatus.PARTIALLY_PAID);
        } else {
            bill.setStatus(BillStatus.ISSUED);
        }

        return Optional.of(billRepository.save(bill));
    }

    /**
     * Cancels a bill if no successful payments have been recorded.
     */
    @Transactional
    public Bill cancelBill(UUID billId, String cancellationReason) {
        Bill bill = billRepository.findById(billId)
                .orElseThrow(() -> new IllegalArgumentException("Bill not found: " + billId));

        if (bill.getStatus() == BillStatus.PAID) {
            throw new IllegalStateException("Cannot cancel a fully paid bill");
        }

        if (bill.getPaidAmount().compareTo(BigDecimal.ZERO) > 0) {
            throw new IllegalStateException("Cannot cancel a bill with recorded payments without refunding them first");
        }

        bill.setStatus(BillStatus.CANCELLED);
        if (cancellationReason != null) {
            bill.setNotes((bill.getNotes() != null ? bill.getNotes() + " | " : "") + "Cancelled: " + cancellationReason);
        }
        return billRepository.save(bill);
    }

    private String generateInvoiceNumber(Outlet outlet) {
        String dateStr = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
        String randomSuffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        return String.format("INV-%s-%s", dateStr, randomSuffix);
    }
}

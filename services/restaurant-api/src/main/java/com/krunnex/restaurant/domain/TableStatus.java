package com.krunnex.restaurant.domain;

public enum TableStatus {
    AVAILABLE,
    RUNNING,
    BILL_REQUESTED,
    PAYMENT_DUE,
    PAID_CLEARING,
    CLOSED;

    public boolean canTransitionTo(TableStatus next) {
        if (this == next) {
            return true;
        }
        return switch (this) {
            case AVAILABLE -> next == RUNNING || next == CLOSED;
            case RUNNING -> next == BILL_REQUESTED || next == PAYMENT_DUE || next == PAID_CLEARING || next == AVAILABLE || next == CLOSED;
            case BILL_REQUESTED -> next == PAYMENT_DUE || next == RUNNING || next == PAID_CLEARING || next == AVAILABLE || next == CLOSED;
            case PAYMENT_DUE -> next == PAID_CLEARING || next == BILL_REQUESTED || next == RUNNING || next == AVAILABLE || next == CLOSED;
            case PAID_CLEARING -> next == AVAILABLE || next == CLOSED;
            case CLOSED -> next == AVAILABLE;
        };
    }
}

package com.krunnex.restaurant.domain;

import java.util.Set;

public enum PaymentStatus {
    PENDING,
    SUCCESSFUL,
    FAILED,
    REFUNDED;

    public boolean canTransitionTo(PaymentStatus next) {
        if (this == next) {
            return true;
        }
        return switch (this) {
            case PENDING -> Set.of(SUCCESSFUL, FAILED).contains(next);
            case SUCCESSFUL -> Set.of(REFUNDED).contains(next);
            case FAILED, REFUNDED -> false; // Terminal states
        };
    }
}

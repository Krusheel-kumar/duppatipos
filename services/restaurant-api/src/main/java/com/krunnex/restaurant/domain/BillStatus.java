package com.krunnex.restaurant.domain;

import java.util.Set;

public enum BillStatus {
    ISSUED,
    PARTIALLY_PAID,
    PAID,
    CANCELLED;

    public boolean canTransitionTo(BillStatus next) {
        if (this == next) {
            return true;
        }
        return switch (this) {
            case ISSUED -> Set.of(PARTIALLY_PAID, PAID, CANCELLED).contains(next);
            case PARTIALLY_PAID -> Set.of(PAID, CANCELLED).contains(next);
            case PAID, CANCELLED -> false; // Terminal
        };
    }
}

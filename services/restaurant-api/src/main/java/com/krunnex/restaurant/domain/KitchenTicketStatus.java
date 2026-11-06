package com.krunnex.restaurant.domain;

import java.util.Set;

public enum KitchenTicketStatus {
    QUEUED,
    PREPARING,
    READY,
    CANCELLED;

    public boolean canTransitionTo(KitchenTicketStatus next) {
        if (this == next) {
            return true;
        }
        return switch (this) {
            case QUEUED -> Set.of(PREPARING, CANCELLED).contains(next);
            case PREPARING -> Set.of(READY, CANCELLED).contains(next);
            case READY, CANCELLED -> false; // Terminal states
        };
    }
}

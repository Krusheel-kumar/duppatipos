package com.krunnex.restaurant.domain;

import java.util.Set;

public enum OrderStatus {
    CREATED,
    CONFIRMED,
    PREPARING,
    READY,
    COMPLETED,
    CANCELLED;

    public boolean canTransitionTo(OrderStatus next) {
        if (this == next) {
            return true;
        }
        return switch (this) {
            case CREATED -> Set.of(CONFIRMED, CANCELLED).contains(next);
            case CONFIRMED -> Set.of(PREPARING, CANCELLED).contains(next);
            case PREPARING -> Set.of(READY, CANCELLED).contains(next);
            case READY -> Set.of(COMPLETED, CANCELLED).contains(next);
            case COMPLETED, CANCELLED -> false; // Terminal states
        };
    }
}

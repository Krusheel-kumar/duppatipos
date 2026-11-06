package com.krunnex.restaurant.config;

import com.krunnex.restaurant.security.TenantContext;
import org.hibernate.context.spi.CurrentTenantIdentifierResolver;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class TenantIdentifierResolver implements CurrentTenantIdentifierResolver<UUID> {

    @Override
    public UUID resolveCurrentTenantIdentifier() {
        UUID tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            // For cases where no tenant is selected or system operations.
            // Using a dummy UUID or throwing exception depends on strategy.
            // Here we return a default known system UUID or allow null if Hibernate supports it.
            // Hibernate 6 requires a non-null tenant id or we can disable tenant filtering.
            // Returning a zero UUID when no tenant is set.
            return new UUID(0, 0); 
        }
        return tenantId;
    }

    @Override
    public boolean validateExistingCurrentSessions() {
        return true;
    }
}

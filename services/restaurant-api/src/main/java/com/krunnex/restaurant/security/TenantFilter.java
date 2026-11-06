package com.krunnex.restaurant.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

public class TenantFilter extends OncePerRequestFilter {

    private final TenantAuthorizationService tenantAuthorizationService;

    public TenantFilter(TenantAuthorizationService tenantAuthorizationService) {
        this.tenantAuthorizationService = tenantAuthorizationService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String tenantHeader = request.getHeader("X-Tenant-ID");

        if (tenantHeader != null && !tenantHeader.isBlank()) {
            UUID tenantId;
            try {
                tenantId = UUID.fromString(tenantHeader.trim());
            } catch (IllegalArgumentException e) {
                response.sendError(HttpStatus.BAD_REQUEST.value(), "Invalid X-Tenant-ID header format");
                return;
            }

            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            // If user is authenticated, strictly verify tenant membership before setting context!
            if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof UserPrincipal) {
                if (!tenantAuthorizationService.canAccessTenant(tenantId)) {
                    response.sendError(HttpStatus.FORBIDDEN.value(), "User is not authorized for tenant: " + tenantId);
                    return;
                }
            }

            TenantContext.setTenantId(tenantId);
        }

        try {
            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }
}

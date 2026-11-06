package com.krunnex.restaurant.security;

import com.krunnex.restaurant.domain.User;
import com.krunnex.restaurant.repository.UserRepository;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.stream.Collectors;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));

        var authorities = user.getTenantMemberships().stream()
                .filter(tm -> tm.getRole() != null)
                .flatMap(tm -> tm.getRole().getPermissions().stream())
                .map(perm -> new SimpleGrantedAuthority(perm.getId()))
                .collect(Collectors.toSet());

        return new UserPrincipal(user.getId(), user.getEmail(), user.getPasswordHash(), authorities);
    }
}

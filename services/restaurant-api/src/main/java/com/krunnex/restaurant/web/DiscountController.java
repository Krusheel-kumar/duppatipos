package com.krunnex.restaurant.web;

import com.krunnex.restaurant.domain.Discount;
import com.krunnex.restaurant.repository.DiscountRepository;
import com.krunnex.restaurant.web.dto.DiscountRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/discounts")
public class DiscountController {

    private final DiscountRepository discountRepository;

    public DiscountController(DiscountRepository discountRepository) {
        this.discountRepository = discountRepository;
    }

    @GetMapping
    public List<Discount> listDiscounts() {
        return discountRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Discount> getDiscount(@PathVariable UUID id) {
        return discountRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Discount> createDiscount(@Valid @RequestBody DiscountRequest request) {
        Discount discount = new Discount();
        discount.setName(request.getName());
        discount.setDiscountType(request.getDiscountType());
        discount.setValue(request.getValue());
        discount.setIsActive(request.getIsActive() != null ? request.getIsActive() : true);

        Discount saved = discountRepository.save(discount);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Discount> updateDiscount(
            @PathVariable UUID id,
            @Valid @RequestBody DiscountRequest request) {
        return discountRepository.findById(id)
                .map(discount -> {
                    discount.setName(request.getName());
                    discount.setDiscountType(request.getDiscountType());
                    discount.setValue(request.getValue());
                    if (request.getIsActive() != null) {
                        discount.setIsActive(request.getIsActive());
                    }
                    return ResponseEntity.ok(discountRepository.save(discount));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<Discount> deactivateDiscount(@PathVariable UUID id) {
        return discountRepository.findById(id)
                .map(discount -> {
                    discount.setIsActive(false);
                    return ResponseEntity.ok(discountRepository.save(discount));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}

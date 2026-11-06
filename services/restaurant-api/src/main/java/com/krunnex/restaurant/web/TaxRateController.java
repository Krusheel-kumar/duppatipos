package com.krunnex.restaurant.web;

import com.krunnex.restaurant.domain.TaxRate;
import com.krunnex.restaurant.repository.TaxRateRepository;
import com.krunnex.restaurant.web.dto.TaxRateRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/tax-rates")
public class TaxRateController {

    private final TaxRateRepository taxRateRepository;

    public TaxRateController(TaxRateRepository taxRateRepository) {
        this.taxRateRepository = taxRateRepository;
    }

    @GetMapping
    public List<TaxRate> listTaxRates() {
        return taxRateRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<TaxRate> getTaxRate(@PathVariable UUID id) {
        return taxRateRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<TaxRate> createTaxRate(@Valid @RequestBody TaxRateRequest request) {
        TaxRate taxRate = new TaxRate();
        taxRate.setName(request.getName());
        taxRate.setRatePercent(request.getRatePercent());
        taxRate.setIsInclusive(request.getIsInclusive() != null ? request.getIsInclusive() : false);
        taxRate.setIsActive(request.getIsActive() != null ? request.getIsActive() : true);

        TaxRate saved = taxRateRepository.save(taxRate);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<TaxRate> updateTaxRate(
            @PathVariable UUID id,
            @Valid @RequestBody TaxRateRequest request) {
        return taxRateRepository.findById(id)
                .map(taxRate -> {
                    taxRate.setName(request.getName());
                    taxRate.setRatePercent(request.getRatePercent());
                    if (request.getIsInclusive() != null) {
                        taxRate.setIsInclusive(request.getIsInclusive());
                    }
                    if (request.getIsActive() != null) {
                        taxRate.setIsActive(request.getIsActive());
                    }
                    return ResponseEntity.ok(taxRateRepository.save(taxRate));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<TaxRate> deactivateTaxRate(@PathVariable UUID id) {
        return taxRateRepository.findById(id)
                .map(taxRate -> {
                    taxRate.setIsActive(false);
                    return ResponseEntity.ok(taxRateRepository.save(taxRate));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}

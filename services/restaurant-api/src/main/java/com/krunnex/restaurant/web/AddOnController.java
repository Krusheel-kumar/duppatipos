package com.krunnex.restaurant.web;

import com.krunnex.restaurant.domain.AddOn;
import com.krunnex.restaurant.repository.AddOnRepository;
import com.krunnex.restaurant.web.dto.AddOnRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping({"/api/v1/addons", "/api/v1/add-ons"})
public class AddOnController {

    private final AddOnRepository addOnRepository;

    public AddOnController(AddOnRepository addOnRepository) {
        this.addOnRepository = addOnRepository;
    }

    @GetMapping
    public List<AddOn> listAddOns() {
        return addOnRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<AddOn> getAddOn(@PathVariable UUID id) {
        return addOnRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<AddOn> createAddOn(@Valid @RequestBody AddOnRequest request) {
        AddOn addOn = new AddOn();
        addOn.setName(request.getName());
        addOn.setPrice(request.getPrice());
        addOn.setIsActive(request.getIsActive() != null ? request.getIsActive() : true);

        AddOn saved = addOnRepository.save(addOn);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<AddOn> updateAddOn(
            @PathVariable UUID id,
            @Valid @RequestBody AddOnRequest request) {
        return addOnRepository.findById(id)
                .map(addOn -> {
                    addOn.setName(request.getName());
                    addOn.setPrice(request.getPrice());
                    if (request.getIsActive() != null) {
                        addOn.setIsActive(request.getIsActive());
                    }
                    return ResponseEntity.ok(addOnRepository.save(addOn));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<AddOn> deactivateAddOn(@PathVariable UUID id) {
        return addOnRepository.findById(id)
                .map(addOn -> {
                    addOn.setIsActive(false);
                    return ResponseEntity.ok(addOnRepository.save(addOn));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}

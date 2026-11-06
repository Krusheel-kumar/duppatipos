package com.krunnex.restaurant.web;

import com.krunnex.restaurant.domain.ProductCategory;
import com.krunnex.restaurant.repository.ProductCategoryRepository;
import com.krunnex.restaurant.web.dto.CategoryRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/categories")
public class CategoryController {

    private final ProductCategoryRepository categoryRepository;

    public CategoryController(ProductCategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    @GetMapping
    public List<ProductCategory> listCategories() {
        return categoryRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductCategory> getCategory(@PathVariable UUID id) {
        return categoryRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<ProductCategory> createCategory(@Valid @RequestBody CategoryRequest request) {
        ProductCategory category = new ProductCategory();
        category.setName(request.getName());
        category.setDescription(request.getDescription());
        category.setDisplayOrder(request.getDisplayOrder());
        category.setIsActive(request.getIsActive() != null ? request.getIsActive() : true);

        ProductCategory saved = categoryRepository.save(category);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProductCategory> updateCategory(
            @PathVariable UUID id,
            @Valid @RequestBody CategoryRequest request) {
        return categoryRepository.findById(id)
                .map(category -> {
                    category.setName(request.getName());
                    category.setDescription(request.getDescription());
                    category.setDisplayOrder(request.getDisplayOrder());
                    if (request.getIsActive() != null) {
                        category.setIsActive(request.getIsActive());
                    }
                    return ResponseEntity.ok(categoryRepository.save(category));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<ProductCategory> deactivateCategory(@PathVariable UUID id) {
        return categoryRepository.findById(id)
                .map(category -> {
                    category.setIsActive(false);
                    return ResponseEntity.ok(categoryRepository.save(category));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}

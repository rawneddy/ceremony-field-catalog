package com.ceremony.catalog.api.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class CatalogSearchRequest {
    private String pathType;
    private String formCode;
    private String formVersion;
    private String action;
    private String productCode;
    private String productSubCode;
    private String loanProductCode;
    private String xpathContains;
    
    @Min(value = 0, message = "Page must be non-negative")
    private int page = 0;
    
    @Min(value = 1, message = "Size must be at least 1")
    @Max(value = 1000, message = "Size cannot exceed 1000")
    private int size = 50;
    
    public CatalogSearchCriteria toCriteria() {
        return new CatalogSearchCriteria(
            pathType,
            formCode,
            formVersion,
            action,
            productCode,
            productSubCode,
            loanProductCode,
            xpathContains
        );
    }
}
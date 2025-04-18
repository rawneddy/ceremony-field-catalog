package com.ceremony.catalog.domain;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document("catalog_fields")
public class CatalogEntry {
    @Id
    private String id;
    // Universal Key Parts
    private String pathType;
    private String formCode;
    private String formVersion;
    // Deposits-Only Key Parts
    private String action;
    private String productCode;
    private String productSubCode;
    // Loans-Only Key Parts
    private String loanProductCode;
    // Field Location Properties
    private String xpath;
    // Field Metadata
    private String dataType;
    private int maxOccurs;
    private int minOccurs;
    private boolean allowsNull;
    private boolean allowsEmpty;
}

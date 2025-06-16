package com.ceremony.catalog.domain;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document("catalog_fields")
public class CatalogEntry {
    @Id
    private String id;
    
    private String contextId;
    private Map<String, String> metadata;
    
    private String xpath;
    private String dataType;
    private int maxOccurs;
    private int minOccurs;
    private boolean allowsNull;
    private boolean allowsEmpty;
}

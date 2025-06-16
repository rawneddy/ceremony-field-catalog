package com.ceremony.catalog.domain;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document("contexts")
public class Context {
    @Id
    private String contextId;
    
    private String displayName;
    private String description;
    private List<String> requiredMetadata;
    private List<String> optionalMetadata;
    private boolean active;
    
    @Builder.Default
    private Instant createdAt = Instant.now();
    
    private Instant updatedAt;
}
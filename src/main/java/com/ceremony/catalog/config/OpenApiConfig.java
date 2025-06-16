package com.ceremony.catalog.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI catalogApiOpenAPI() {
        return new OpenAPI()
            .info(new Info()
                .title("Ceremony Field Catalog API")
                .description("""
                    **Field Observation Catalog System**
                    
                    This API manages field observation catalogs that track XML field usage patterns across different business contexts.
                    
                    ## Key Features
                    - **Context Management**: Define metadata requirements for different business domains
                    - **Field Observations**: Submit and merge field usage statistics
                    - **Dynamic Search**: Cross-context and metadata-based field discovery
                    - **Usage Statistics**: Track field occurrence patterns, null/empty allowances
                    
                    ## Business Domains
                    - **Deposits**: Action-based with productCode/productSubCode (Fulfillment, DDA, 4S)
                    - **Loans**: Loan product code-based (HEQF, HMTG, etc.)
                    - **OnDemand**: Form-based with formCode/formVersion (ACK123, v1.0)
                    
                    ## Usage Patterns
                    1. Create contexts with metadata requirements
                    2. Submit field observations for processing
                    3. Search catalog for field patterns and statistics
                    4. Analyze field usage across contexts and metadata combinations
                    """)
                .version("1.0.0")
                .contact(new Contact()
                    .name("API Support")
                    .email("support@ceremony.catalog"))
                .license(new License()
                    .name("MIT License")
                    .url("https://opensource.org/licenses/MIT")))
            .servers(List.of(
                new Server()
                    .url("http://localhost:8080")
                    .description("Development server"),
                new Server()
                    .url("https://api.ceremony.catalog")
                    .description("Production server")
            ));
    }
}
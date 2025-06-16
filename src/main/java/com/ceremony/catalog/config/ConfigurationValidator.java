package com.ceremony.catalog.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
@RequiredArgsConstructor
@Slf4j
public class ConfigurationValidator implements CommandLineRunner {

    private final CatalogProperties catalogProperties;
    private final Environment environment;

    @Override
    public void run(String... args) {
        log.info("Validating application configuration...");
        
        validateDatabaseConfiguration();
        validateBatchConfiguration();
        validateSearchConfiguration();
        validateValidationConfiguration();
        validateCacheConfiguration();
        
        logConfigurationSummary();
        
        log.info("Configuration validation completed successfully");
    }

    private void validateDatabaseConfiguration() {
        CatalogProperties.Database db = catalogProperties.getDatabase();
        
        if (db.getMongoUri() == null || db.getMongoUri().trim().isEmpty()) {
            throw new IllegalStateException("MongoDB URI cannot be empty");
        }
        
        if (!db.getMongoUri().startsWith("mongodb://") && !db.getMongoUri().startsWith("mongodb+srv://")) {
            throw new IllegalStateException("Invalid MongoDB URI format: " + db.getMongoUri());
        }
        
        if (db.getConnectionTimeoutSeconds() < 1 || db.getConnectionTimeoutSeconds() > 300) {
            throw new IllegalStateException("Database connection timeout must be between 1 and 300 seconds");
        }
        
        if (db.getMaxConnections() < 1 || db.getMaxConnections() > 1000) {
            throw new IllegalStateException("Database max connections must be between 1 and 1000");
        }
        
        log.debug("Database configuration validated successfully");
    }

    private void validateBatchConfiguration() {
        CatalogProperties.Batch batch = catalogProperties.getBatch();
        
        if (batch.getMaxSize() < 1 || batch.getMaxSize() > 10000) {
            throw new IllegalStateException("Batch max size must be between 1 and 10000");
        }
        
        if (batch.getTimeout() == null || batch.getTimeout().isNegative() || batch.getTimeout().isZero()) {
            throw new IllegalStateException("Batch timeout must be positive");
        }
        
        if (batch.getTimeout().compareTo(Duration.ofMinutes(30)) > 0) {
            log.warn("Batch timeout is very long ({}), consider reducing it for better responsiveness", batch.getTimeout());
        }
        
        log.debug("Batch configuration validated successfully");
    }

    private void validateSearchConfiguration() {
        CatalogProperties.Search search = catalogProperties.getSearch();
        
        if (search.getMaxResults() < 1 || search.getMaxResults() > 100000) {
            throw new IllegalStateException("Search max results must be between 1 and 100000");
        }
        
        if (search.getDefaultPageSize() < 1 || search.getDefaultPageSize() > search.getMaxPageSize()) {
            throw new IllegalStateException("Search default page size must be between 1 and max page size");
        }
        
        if (search.getMaxPageSize() < 1 || search.getMaxPageSize() > 5000) {
            throw new IllegalStateException("Search max page size must be between 1 and 5000");
        }
        
        if (search.getTimeout() == null || search.getTimeout().isNegative() || search.getTimeout().isZero()) {
            throw new IllegalStateException("Search timeout must be positive");
        }
        
        log.debug("Search configuration validated successfully");
    }

    private void validateValidationConfiguration() {
        CatalogProperties.Validation validation = catalogProperties.getValidation();
        
        if (validation.getMaxXpathLength() < 10 || validation.getMaxXpathLength() > 10000) {
            throw new IllegalStateException("Max XPath length must be between 10 and 10000");
        }
        
        if (validation.getMaxContextIdLength() < 1 || validation.getMaxContextIdLength() > 500) {
            throw new IllegalStateException("Max context ID length must be between 1 and 500");
        }
        
        if (validation.getMaxMetadataKeyLength() < 1 || validation.getMaxMetadataKeyLength() > 200) {
            throw new IllegalStateException("Max metadata key length must be between 1 and 200");
        }
        
        if (validation.getMaxMetadataValueLength() < 1 || validation.getMaxMetadataValueLength() > 2000) {
            throw new IllegalStateException("Max metadata value length must be between 1 and 2000");
        }
        
        log.debug("Validation configuration validated successfully");
    }

    private void validateCacheConfiguration() {
        CatalogProperties.Cache cache = catalogProperties.getCache();
        
        if (cache.isEnabled()) {
            if (cache.getTtl() == null || cache.getTtl().isNegative() || cache.getTtl().isZero()) {
                throw new IllegalStateException("Cache TTL must be positive when caching is enabled");
            }
            
            if (cache.getMaxSize() < 0 || cache.getMaxSize() > 100000) {
                throw new IllegalStateException("Cache max size must be between 0 and 100000");
            }
        }
        
        log.debug("Cache configuration validated successfully");
    }

    private void logConfigurationSummary() {
        String activeProfiles = String.join(",", environment.getActiveProfiles());
        if (activeProfiles.isEmpty()) {
            activeProfiles = "default";
        }
        
        log.info("Configuration Summary:");
        log.info("  Active Profiles: {}", activeProfiles);
        log.info("  Database: {}", maskSensitiveInfo(catalogProperties.getDatabase().getMongoUri()));
        log.info("  Batch Max Size: {}", catalogProperties.getBatch().getMaxSize());
        log.info("  Search Max Results: {}", catalogProperties.getSearch().getMaxResults());
        log.info("  Search Default Page Size: {}", catalogProperties.getSearch().getDefaultPageSize());
        log.info("  Cache Enabled: {}", catalogProperties.getCache().isEnabled());
        
        if (catalogProperties.getCache().isEnabled()) {
            log.info("  Cache TTL: {}", catalogProperties.getCache().getTtl());
            log.info("  Cache Max Size: {}", catalogProperties.getCache().getMaxSize());
        }
    }

    private String maskSensitiveInfo(String uri) {
        if (uri == null) return "null";
        
        // Mask credentials in MongoDB URI if present
        return uri.replaceAll("://([^:]+):([^@]+)@", "://$1:***@");
    }
}
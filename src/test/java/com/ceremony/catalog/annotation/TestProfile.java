package com.ceremony.catalog.annotation;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Meta-annotation that applies consistent test configuration across all test types.
 * 
 * This annotation combines common test annotations and properties to ensure
 * all tests use standardized configuration without duplication.
 * 
 * Provides:
 * - Test profile activation
 * - Disabled performance logging for clean test output
 * - Standardized SpringBootTest configuration
 * 
 * Usage:
 * <pre>
 * @TestProfile
 * @Testcontainers
 * class MyIntegrationTest {
 *     // Test implementation
 * }
 * 
 * @TestProfile
 * @ExtendWith(MockitoExtension.class)
 * class MyUnitTest {
 *     // Test implementation  
 * }
 * </pre>
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@SpringBootTest
@TestPropertySource(properties = {
    "spring.profiles.active=test",
    "app.catalog.performance.enable-query-logging=false",
    "logging.level.org.testcontainers=WARN",
    "logging.level.com.github.dockerjava=WARN"
})
public @interface TestProfile {
    
    /**
     * Override the default SpringBootTest web environment if needed
     */
    SpringBootTest.WebEnvironment webEnvironment() default SpringBootTest.WebEnvironment.MOCK;
}
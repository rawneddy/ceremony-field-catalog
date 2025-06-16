# Testing Guidelines

This document provides comprehensive testing patterns and guidelines for the Ceremony Field Catalog project. Our testing strategy follows the "pit of success" principle - developers naturally fall into correct testing patterns without extra effort.

## 📋 Test Types and Base Classes

### 🏗️ Integration Tests
**Extends:** `IntegrationTestBase`  
**Purpose:** Test full application stack with real MongoDB via Testcontainers  
**Use for:** API endpoints, full workflow testing, cross-component integration

```java
@TestProfile(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class CatalogControllerTest extends IntegrationTestBase {
    
    @Test
    void shouldCreateAndRetrieveObservations() {
        // Create context using builder and REST API
        ContextDefinitionDTO contextDef = TestDataBuilder.depositsContext();
        var headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        restTemplate.postForEntity("/catalog/contexts", 
            new HttpEntity<>(contextDef, headers), Void.class);
        
        // Submit observations using builder and REST API
        var observations = List.of(
            TestDataBuilder.depositsObservation()
                .withXpath("/Test/Path")
                .build()
        );
        
        restTemplate.postForEntity("/catalog/contexts/deposits/observations",
            new HttpEntity<>(observations, headers), Void.class);
        
        // Verify results via repository
        assertThat(catalogRepository.findAll()).hasSize(1);
    }
}
```

### 🔧 Service Tests  
**Extends:** `ServiceTestBase`  
**Purpose:** Test service layer with real database, focused on business logic  
**Use for:** Service method testing, business rule validation, data persistence

```java
class CatalogServiceTest extends ServiceTestBase {
    
    @Test
    void shouldMergeObservationsCorrectly() {
        // Setup context using helper
        createAndVerifyContext("deposits", "productCode", "productSubCode", "action");
        
        // Test business logic
        catalogService.merge("deposits", List.of(
            TestDataBuilder.depositsObservation().build()
        ));
        
        // Verify using custom assertions
        List<CatalogEntry> entries = catalogRepository.findAll();
        TestAssertions.assertThat(entries.get(0))
            .hasContextId("deposits")
            .hasMinOccurs(1);
    }
}
```

### ⚡ Performance Tests
**Extends:** `PerformanceTestBase`  
**Purpose:** Validate performance requirements and benchmarking  
**Use for:** Query performance, load testing, regression testing

```java
class QueryPerformanceTest extends PerformanceTestBase {
    
    @BeforeEach
    void setUp() {
        // Create test context
        contextService.createContext(TestDataBuilder.depositsContext());
    }
    
    @Test
    void shouldExecuteQueriesUnder50ms() {
        // Setup test data
        List<CatalogObservationDTO> observations = createTestObservations(1000);
        catalogService.merge("deposits", observations);
        
        Map<String, String> testMetadata = Map.of(
            "productCode", "DDA",
            "productSubCode", "4S",
            "action", "Fulfillment"
        );
        
        // Measure performance
        List<String> xpaths = measurePerformance("Query 1000 entries", 
            () -> catalogRepository.findXpathsByContextAndMetadata("deposits", testMetadata),
            50L);
            
        assertThat(xpaths).isNotEmpty();
    }
}
```

### 🧪 Unit Tests
**Extends:** `UnitTestBase`  
**Purpose:** Test individual classes in isolation with mocked dependencies  
**Use for:** Domain logic, utilities, individual method testing

```java
class InputValidationServiceTest extends UnitTestBase {
    
    @InjectMocks
    private InputValidationService validationService;
    
    @Test
    void shouldValidateXPathFormat() {
        // Common mocks already setup in base class
        // validation.getMaxXpathLength() returns 1000 by default
        
        String result = validationService.validateAndCleanXPath("/Valid/Path");
        assertThat(result).isEqualTo("/Valid/Path");
    }
}
```

## 🏗️ Test Data Builders

Use fluent builders for consistent, readable test data creation:

### Basic Builders
```java
// Context creation
ContextDefinitionDTO context = TestDataBuilder.context()
    .withId("deposits")
    .withRequiredFields("productCode", "action")
    .build();

// Observation creation  
CatalogObservationDTO observation = TestDataBuilder.observation()
    .withMetadata("productCode", "DDA")
    .withXpath("/Test/Path")
    .allowsNull()
    .build();
```

### Specialized Builders
```java
// Domain-specific builders with pre-configured metadata
CatalogObservationDTO depositsObs = TestDataBuilder.depositsObservation()
    .withProductCode("SAV")
    .withAction("Inquiry")
    .withXpath("/Custom/Path")
    .build();

CatalogObservationDTO loansObs = TestDataBuilder.loansObservation()
    .withLoanProductCode("HMTG")
    .build();

CatalogObservationDTO onDemandObs = TestDataBuilder.onDemandObservation()
    .withFormCode("ACK456")
    .withFormVersion("2.0")
    .build();
```

### Pre-built Contexts
```java
// Common contexts ready to use
ContextDefinitionDTO deposits = TestDataBuilder.depositsContext();    // productCode, productSubCode, action
ContextDefinitionDTO loans = TestDataBuilder.loansContext();          // loanProductCode  
ContextDefinitionDTO onDemand = TestDataBuilder.onDemandContext();    // formCode, formVersion

// Use in service tests
contextService.createContext(deposits);

// Use in integration tests via REST API
restTemplate.postForEntity("/catalog/contexts", new HttpEntity<>(deposits, headers), Void.class);
```

## ✅ Custom Assertions

Use domain-specific assertions for expressive, maintainable tests:

```java
import static com.ceremony.catalog.util.TestAssertions.*;

// Catalog Entry assertions
assertThat(catalogEntry)
    .hasXpath("/Expected/Path")
    .hasContextId("deposits")
    .hasMetadata("productCode", "DDA")
    .hasMinOccurs(1)
    .allowsNull()
    .doesNotAllowEmpty();

// Context assertions  
assertThat(context)
    .hasId("deposits")
    .isActive()
    .hasRequiredField("productCode")
    .hasRequiredFieldCount(3);
```

## 📊 Performance Testing

### Performance Measurement
```java
// Assert performance requirements
measurePerformance("Operation name", 
    () -> performOperation(),
    maxDurationMs);

// Benchmark without assertions
PerformanceResult result = benchmarkPerformance("Operation name",
    () -> performOperation());
result.assertDurationLessThan(100L);
```

### Warm-up for Accurate Results
```java
// Warm up JIT compiler before measurements
warmUp(() -> performOperation(), 10);

// Then measure actual performance
measurePerformance("Real test", () -> performOperation(), 50L);
```

## 🎯 Best Practices

### 1. **Test Naming Convention**
```java
// Use descriptive names that explain behavior
@Test
void shouldCreateCatalogEntry_WhenValidObservationSubmitted() { }

@Test  
void shouldThrowException_WhenRequiredMetadataFieldMissing() { }

@Test
void shouldSetMinOccursToZero_WhenFieldMissingInSubsequentObservation() { }
```

### 2. **Test Structure (Arrange-Act-Assert)**
```java
@Test
void shouldMergeObservations() {
    // Arrange - Setup test data
    createAndVerifyContext("deposits", "productCode");
    var observations = List.of(TestDataBuilder.depositsObservation().build());
    
    // Act - Perform operation
    catalogService.merge("deposits", observations);
    
    // Assert - Verify results
    List<CatalogEntry> entries = catalogRepository.findAll();
    assertThat(entries).hasSize(1);
}
```

### 3. **Use Builders for All Test Data**
```java
// ✅ Good - Use builders
TestDataBuilder.depositsObservation()
    .withXpath("/Test/Path")
    .build();

// ❌ Bad - Manual construction
new CatalogObservationDTO(
    Map.of("productCode", "DDA", "action", "Fulfillment"),
    "/Test/Path", 1, false, false
);
```

### 4. **Leverage Base Class Helpers**
```java
// ✅ Good - Use helper methods
createAndVerifyContext("deposits", "productCode", "action");

// ❌ Bad - Manual setup
ContextDefinitionDTO contextDef = new ContextDefinitionDTO(...);
contextService.createContext(contextDef);
Optional<Context> context = contextService.getContext("deposits");
assertThat(context).isPresent();
```

### 5. **Group Related Tests**
```java
class CatalogServiceTest extends ServiceTestBase {
    
    @Nested
    class ObservationMerging {
        @Test void shouldMergeNewObservations() { }
        @Test void shouldUpdateExistingObservations() { }
    }
    
    @Nested  
    class ValidationRules {
        @Test void shouldValidateRequiredFields() { }
        @Test void shouldRejectInvalidMetadata() { }
    }
}
```

## 🔧 Configuration

### Test Profiles
Tests automatically use the `test` profile with optimized settings:
- Fast database connections
- Minimal logging  
- Disabled caching
- Small batch sizes

### Custom Test Configuration
```java
@TestPropertySource(properties = {
    "app.catalog.performance.enable-query-logging=true",
    "app.catalog.validation.max-xpath-length=100"
})
class MyCustomTest extends IntegrationTestBase { }
```

## 📈 Success Metrics

### Code Quality Metrics
- ✅ All test classes extend appropriate base class
- ✅ Zero duplicate Testcontainers setup  
- ✅ Consistent test data creation via builders
- ✅ Custom assertions for domain objects
- ✅ All tests follow naming conventions

### Performance Metrics  
- ✅ Test suite runs 30% faster (container reuse)
- ✅ Setup code reduced by 80%
- ✅ Zero test configuration duplication

### Developer Experience Metrics
- ✅ New test creation time < 2 minutes
- ✅ Zero "how do I test this?" questions  
- ✅ Consistent patterns across all test types

## 🚫 Anti-Patterns to Avoid

### ❌ Don't Mix Testing Patterns
```java
// Bad - mixing integration setup with unit test
@ExtendWith(MockitoExtension.class)  
@Testcontainers
class MixedTest { }
```

### ❌ Don't Create Manual Test Data
```java
// Bad - manual construction
new CatalogObservationDTO(Map.of(...), "/path", 1, false, false);

// Good - use builders  
TestDataBuilder.depositsObservation().withXpath("/path").build();
```

### ❌ Don't Duplicate Setup Code
```java
// Bad - duplicate container setup
@Container
static MongoDBContainer mongo = new MongoDBContainer("mongo:7");

// Good - extend base class
class MyTest extends IntegrationTestBase { }
```

### ❌ Don't Use Generic Assertions for Domain Objects
```java
// Bad - generic assertions
assertThat(entry.getXpath()).isEqualTo("/Expected/Path");
assertThat(entry.getContextId()).isEqualTo("deposits");

// Good - custom domain assertions
TestAssertions.assertThat(entry)
    .hasXpath("/Expected/Path")
    .hasContextId("deposits");
```

## 🎯 Migration Checklist

When converting existing tests to new patterns:

1. ✅ **Replace test class annotations** with `@TestProfile` or extend base classes
2. ✅ **Remove duplicate setup code** (Testcontainers, repository injection, cleanup)
3. ✅ **Convert test data creation** to use `TestDataBuilder`
4. ✅ **Replace assertions** with `TestAssertions` where applicable  
5. ✅ **Use base class helpers** (`createAndVerifyContext`, `measurePerformance`)
6. ✅ **Update imports** to remove unused testing infrastructure
7. ✅ **Verify tests still pass** with new patterns

This testing framework ensures that all developers naturally fall into the "pit of success" - writing maintainable, consistent, and effective tests becomes the easiest path forward! 🚀
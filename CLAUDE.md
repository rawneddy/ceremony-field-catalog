# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Build & Run
```bash
# Compile project
mvn clean compile

# Run application locally (requires MongoDB on localhost:27017)
mvn spring-boot:run

# Package for deployment
mvn clean package

# Run with Docker Compose (includes MongoDB)
docker-compose up --build
```

### Testing
```bash
# Run all tests (requires Docker to be running for Testcontainers)
mvn clean test

# Run specific test class
mvn test -Dtest=CatalogServiceTest

# Compile only (useful when Docker is not available)
mvn clean compile
mvn test-compile
```

**Note:** Tests use Testcontainers to spin up real MongoDB instances, so Docker must be running.

### Local MongoDB Setup
```bash
# Start MongoDB container for local development
docker run --name ceremony-mongo -p 27017:27017 -d mongo:7

# Clear all catalog data (development only)
docker exec -it ceremony-mongo mongosh
> use ceremony_catalog
> db.dropDatabase()
> exit
```

### API Testing
Use `CatalogSmokeTests.http` with VS Code REST Client extension for manual API testing.

## Architecture Overview

This is a **field observation catalog system** that tracks XML field usage patterns across three business paths:

### Business Domain
- **Deposits**: Action-based with productCode/productSubCode (Fulfillment, DDA, 4S)
- **Loans**: Loan product code-based (HEQF, HMTG, etc.)
- **OnDemand**: Form-based with formCode/formVersion (ACK123, v1.0)

### Core Components

**Domain Models** (`src/main/java/com/ceremony/catalog/domain/`)
- `CatalogEntry`: Main MongoDB document representing observed fields
- `FieldKey`: Composite key for unique field identification
- `ContextKey`: Business context identifier for grouping observations

**API Layer** (`src/main/java/com/ceremony/catalog/api/`)
- `CatalogController`: REST endpoints for field submission and search
- `CatalogObservationDTO`: Input contract for field observations
- `CatalogSearchCriteria`: Search filter parameters

**Service Layer** (`src/main/java/com/ceremony/catalog/service/`)
- `CatalogService`: Core business logic for field merging and querying
- Implements intelligent merge logic: updates occurrence stats for existing fields, creates new entries

**Persistence Layer** (`src/main/java/com/ceremony/catalog/persistence/`)
- `CatalogRepository`: Standard MongoDB repository
- `CatalogCustomRepository`: Interface for dynamic queries
- `CatalogCustomRepositoryImpl`: Custom query implementation using MongoTemplate and Criteria API

### Key Patterns

**Field Merging Logic**: The system merges field observations rather than simple inserts:
- New fields create catalog entries
- Existing fields update occurrence statistics (minOccurs, maxOccurs, null/empty allowances)
- Single-context processing sets `minOccurs=0` for absent fields

**MongoDB Integration**:
- Uses `@Document("catalog_fields")` collection mapping
- String-based IDs from concatenated field keys
- Compound indexes for optimal query performance
- MongoTemplate for complex dynamic queries

**Testing Philosophy**:
- Integration-first using Testcontainers
- Real MongoDB containers for test confidence
- Focus on business logic over unit testing

## Development Guidelines

### Making Changes
- Follow existing Lombok patterns (`@Data`, `@Builder`, `@RequiredArgsConstructor`)
- Extend `CatalogCustomRepository` for new query methods
- Add search criteria to `CatalogSearchCriteria` for new filters
- Use `CatalogService` for business logic extensions

### Index Management
Custom indexes are created in `CatalogCustomRepositoryImpl.createIndexes()`:
- Compound indexes for search patterns
- Partial indexes for path-specific fields
- Add new indexes here for performance optimization

### Configuration
- `application.yml`: MongoDB connection settings
- Environment-specific overrides supported
- Docker Compose provides complete stack setup

### VS Code Setup
Required extensions:
- Java Extension Pack
- Spring Boot Extension Pack
- Lombok Support
- REST Client (for .http testing)
- Test Explorer UI

The codebase uses Java 17, Spring Boot 3.2.5, and follows modern Spring Data MongoDB patterns with Testcontainers for reliable integration testing.
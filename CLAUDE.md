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
Use `tests/CatalogSmokeTests.http` with VS Code REST Client extension for manual API testing.

## Architecture Overview

This is a **dynamic field observation catalog system** that tracks XML field usage patterns across unlimited business contexts:

### Dynamic Context System
- **Context-driven**: Each business domain defines its own metadata schema
- **Self-service**: Developers create contexts with required/optional metadata
- **Unlimited contexts**: Supports any number of business domains (Deposits, Loans, RenderData, etc.)
- **Schema enforcement**: Validates observations against context-defined metadata requirements
- **Schema evolution**: Allows adding/removing optional metadata; requires new contexts for required metadata changes

### Core Components

**Domain Models** (`src/main/java/com/ceremony/catalog/domain/`)
- `Context`: Defines business domain metadata schemas (required/optional fields)
- `CatalogEntry`: Main MongoDB document representing observed fields
- `FieldKey`: Hash-based unique field identification (contextId + requiredMetadata + xpath)
- `ContextKey`: Business context identifier for grouping observations

**API Layer** (`src/main/java/com/ceremony/catalog/api/`)
- `ContextController`: REST endpoints for context management (CRUD operations)
- `CatalogController`: REST endpoints for field submission and search
- `CatalogObservationDTO`: Input contract for field observations (no dataType - XPath provides differentiation)
- `CatalogSearchCriteria`: Dynamic search filter parameters
- `DynamicSearchParameterResolver`: Converts any query parameter to metadata search criteria

**Service Layer** (`src/main/java/com/ceremony/catalog/service/`)
- `ContextService`: Context lifecycle management with schema evolution protection
- `CatalogService`: Core business logic for field merging and querying using required-metadata-only field identity
- Implements intelligent merge logic: updates occurrence stats for existing fields, creates new entries

**Persistence Layer** (`src/main/java/com/ceremony/catalog/persistence/`)
- `ContextRepository`: Standard MongoDB repository for contexts
- `CatalogRepository`: Standard MongoDB repository for field observations
- `CatalogCustomRepository`: Interface for dynamic queries
- `CatalogCustomRepositoryImpl`: Custom query implementation using MongoTemplate and Criteria API

### Key Patterns

**Dynamic Context Management**: 
- Contexts define metadata schemas for business domains
- Required metadata changes blocked after creation (prevents field ID conflicts)
- Optional metadata evolution allowed (adding/removing optional fields)
- Cross-context collision prevention through contextId in field identity

**Field Identity & Merging Logic**: 
- Field identity: `hash(contextId + requiredMetadata + xpath)` - no dataType needed
- Field merging: observations with same identity update occurrence statistics
- Optional metadata ignored for field identity (same required metadata + xpath = same field)
- Single-context processing sets `minOccurs=0` for absent fields

**MongoDB Integration**:
- Uses `@Document("catalog_fields")` and `@Document("contexts")` collection mapping
- Hash-based field IDs (e.g., `field_12345678`) for clean, collision-resistant identification
- Compound indexes for optimal query performance
- MongoTemplate for complex dynamic queries with any metadata field

**Testing Philosophy**:
- Integration-first using Testcontainers
- Real MongoDB containers for test confidence
- Focus on business logic over unit testing

### API Usage Patterns

**Context Management**:
```bash
# Create context
POST /catalog/contexts
{"contextId": "deposits", "requiredMetadata": ["productCode"], "optionalMetadata": ["channel"]}

# Update context (optional metadata only)
PUT /catalog/contexts/deposits
{"requiredMetadata": ["productCode"], "optionalMetadata": ["channel", "region"]}
```

**Field Observations**:
```bash
# Submit observations to specific context
POST /catalog/contexts/deposits/observations
[{"metadata": {"productCode": "DDA", "channel": "Online"}, "xpath": "/Ceremony/Amount", "count": 1, "hasNull": false, "hasEmpty": false}]
```

**Dynamic Search**:
```bash
# Search within context
GET /catalog/fields?contextId=deposits&page=0&size=10

# Cross-context search by any metadata
GET /catalog/fields?productCode=DDA&page=0&size=10

# XPath pattern search
GET /catalog/fields?xpath=/Ceremony/Amount
```

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

The codebase uses Java 21, Spring Boot 3.2.5, and follows modern Spring Data MongoDB patterns with Testcontainers for reliable integration testing.
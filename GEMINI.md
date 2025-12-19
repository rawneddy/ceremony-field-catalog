# Ceremony Field Catalog

## Project Overview

The **Ceremony Field Catalog** is a comprehensive system designed to "reverse engineer" and catalog XML field usage patterns across legacy applications. It enables organizations to track which XML fields are actually being used in production across different business contexts, even when no formal schema exists.

**Core Components:**

1.  **Catalog API (Java/Spring Boot):** The central brain of the system. A RESTful API backed by MongoDB that accepts field observations, merges them intelligently, and provides powerful search capabilities.
2.  **SDKs (Python & .NET):** Lightweight, "fire-and-forget" client libraries designed to be embedded in legacy applications with zero impact on performance or stability.

**Key Features:**

*   **Dynamic Contexts:** Supports unlimited business domains (e.g., "Loans", "Deposits") with self-service schema definition.
*   **Field Discovery:** Automatically discovers and indexes XML paths (XPaths) as they are observed.
*   **Zero-Impact Telemetry:** SDKs use background processing and safe failure modes to ensure the main application is never affected.
*   **Data Persistence:** Uses MongoDB for flexible, schema-less storage of observed fields.

## Building and Running

### Prerequisites

*   **Docker:** Essential for running the full stack (API + MongoDB) easily.
*   **Java 21:** Required for local API development.
*   **Maven:** Build tool for the Java API.

### Quick Start (Docker Compose)

The recommended way to run the application is using Docker Compose, which spins up both the API and the MongoDB database.

```bash
# Start API and MongoDB
docker-compose up --build

# Run in background
docker-compose up -d --build

# Stop everything
docker-compose down
```

*   **API URL:** `http://localhost:8080`
*   **Swagger UI:** `http://localhost:8080/swagger-ui.html`
*   **MongoDB:** `localhost:27017`

### Local Development (Java API)

To run the API locally while keeping MongoDB in a container:

1.  **Start MongoDB:**
    ```bash
    docker-compose up mongodb
    ```

2.  **Run API:**
    ```bash
    mvn spring-boot:run
    ```

### Testing

The project uses **Testcontainers** to run integration tests against a real MongoDB instance. **Docker must be running.**

```bash
# Run all tests
mvn clean test

# Run a specific test
mvn test -Dtest=CatalogServiceTest
```

## Development Conventions

### Code Structure

*   `src/main/java/`: Main Spring Boot application code.
    *   `api/`: REST Controllers and DTOs.
    *   `domain/`: Core business entities (`Context`, `CatalogEntry`).
    *   `service/`: Business logic (`CatalogService`, `ContextService`).
    *   `persistence/`: MongoDB repositories and custom query implementations.
*   `sdks/`: Client SDKs for different languages.
    *   `python/`: Python SDK.
    *   `dotnet/`: .NET SDK.

### Standards

*   **Language:** Java 21.
*   **Framework:** Spring Boot 3.4.1.
*   **Database:** MongoDB.
*   **Lombok:** Used extensively for boilerplate reduction (`@Data`, `@Builder`, etc.).
*   **Testing:** Integration-first approach using JUnit 5 and Testcontainers.

## SDKs

### Python SDK (`sdks/python`)
A fire-and-forget library for Python 3.11+ applications.
*   **Install:** `pip install .` (from the python directory)
*   **Tests:** `pytest`

### .NET SDK (`sdks/dotnet`)
A thread-safe, non-blocking SDK for .NET applications (targeted at .NET Framework 4.8 for legacy support).
*   **Features:** Background worker thread, bounded blocking collection, exception swallowing for safety.

## Useful References

*   `CLAUDE.md`: Contains detailed instructions for AI agents and specific commands.
*   `docs/ARCHITECTURE.md`: Deep dive into the system design and data model.
*   `docs/api/API_SPECIFICATION.md`: Full REST API documentation.
*   `tests/CatalogSmokeTests.http`: VS Code REST Client file for manual API testing.

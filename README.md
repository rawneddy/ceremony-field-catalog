# Ceremony Field Catalog API

A Spring Boot + MongoDB API for tracking and cataloging observed XML fields across different business contexts. Designed for legacy applications that rely on XML data but have no schema defined. This application allows you to "reverse engineer" the XML schema for a given situation.

## Features
---
- RESTful API for submitting and querying observed field data
- MongoDB persistence with dynamic search and pagination
- Testcontainers-based integration tests for reliable CI/CD
- Built with Java 21, Spring Boot 3, and Lombok

## Prerequisites
---
### Just Running the App

If you only want to run the application, you just need **Docker**:

**macOS:**
```sh
brew install --cask docker
```

**Windows:**
```powershell
winget install Docker.DockerDesktop
```

That's it! Docker Compose handles everything else.

### For Development

If you want to develop, run tests, or build locally, you'll also need Java and Maven:

**macOS:**
```sh
brew install --cask temurin@21
brew install maven
```

**Windows:**
```powershell
winget install EclipseAdoptium.Temurin.21.JDK
winget install Apache.Maven
```

## See Also
---
| Document | Description |
|----------|-------------|
| [docs/MOTIVATION.md](docs/MOTIVATION.md) | Business context explaining why the catalog is needed |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Technical architecture, components, and data model |
| [docs/api/API_SPECIFICATION.md](docs/api/API_SPECIFICATION.md) | Complete REST API reference |
| [docs/api/TESTING.md](docs/api/TESTING.md) | Testing guide and patterns |
| [docs/sdk/README.md](docs/sdk/README.md) | Client SDK documentation (.NET, Python) |
| [plans/releases/01/](plans/releases/01/) | UI requirements and implementation plan |
| [tests/CatalogSmokeTests.http](tests/CatalogSmokeTests.http) | REST Client test file for manual API testing |

## Full Stack Quick Start
---

The Ceremony Field Catalog consists of a **Java/Spring Boot API**, a **MongoDB database**, and a **React/TypeScript UI**.

### 1. Start the Backend (API & MongoDB)

The easiest way to run the backend infrastructure is using Docker Compose.

**First-time start / Rebuild everything:**
Use this command the first time you run the project or whenever you pull changes to the backend code.
```sh
docker-compose up -d --build
```

**Subsequent starts:**
If you haven't changed the backend code and just want to start the containers.
```sh
docker-compose up -d
```

**Force Rebuild & Restart:**
If you want to ensure a clean slate and rebuild the API image from source.
```sh
docker-compose down && docker-compose up -d --build
```

- **API URL:** [http://localhost:8080](http://localhost:8080)
- **Swagger UI:** [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)
- **MongoDB:** `localhost:27017`

---

### 2. Start the UI (React Dev Server)

The UI is built with Vite and runs locally for the best development experience.

```sh
# Navigate to the UI directory
cd ui

# Install dependencies (first time only)
npm install

# Start the development server
npm run dev
```

- **UI URL:** [http://localhost:5173](http://localhost:5173)

---

### 3. Verification

Once everything is running:
1. Open the **UI** in your browser.
2. Navigate to the **Manage Contexts** tab to verify the API connection.
3. Use the **Submit Data** tab to ingest sample XMLs from `docs/samples/`.

## Alternative Development Workflows
---
### Running API Locally (without Docker)

If you are developing the Java API and want hot-reload/debugger support:

1. **Start ONLY MongoDB via Docker:**
   ```sh
   docker-compose up -d mongodb
   ```

2. **Run the API with Maven:**
   ```sh
   mvn spring-boot:run
   ```

### UI Production Build

To test the production build of the UI:
```sh
cd ui
npm run build
npm run preview
```

## API Endpoints
---
### Contexts
```
GET    /catalog/contexts              # List all contexts
POST   /catalog/contexts              # Create a context
GET    /catalog/contexts/{contextId}  # Get a specific context
PUT    /catalog/contexts/{contextId}  # Update a context
DELETE /catalog/contexts/{contextId}  # Delete a context
```

### Field Observations
```
POST   /catalog/contexts/{contextId}/observations  # Submit observations
GET    /catalog/fields                             # Search catalog fields
```

### API Documentation
Swagger UI is available at [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)

## Connecting External Tools
---
MongoDB is exposed on port 27017. Connect with:

```
mongodb://localhost:27017/ceremony_catalog
```

This works for:
- MCP MongoDB plugin in Claude Code
- MongoDB Compass
- Any MongoDB client

## Pre-Push Verification
---

**Before pushing changes or creating a PR, always verify your code compiles:**

```sh
# Backend - verify Java compilation
mvn clean compile

# Frontend - verify TypeScript types
cd ui && npm run typecheck && npm run build
```

This catches compilation errors before they fail in GitHub Actions CI.

---

## Testing
---

### Run All Tests

To run both backend and frontend tests:
```sh
# Backend tests (requires Docker for Testcontainers)
mvn clean test

# Frontend tests
cd ui && npm run test
```

### Backend Tests (Java/Spring)

```sh
mvn clean test
```

Integration tests use Testcontainers to spin up a temporary MongoDB instance. Docker must be running.

For detailed testing patterns and guidelines, see [docs/api/TESTING.md](docs/api/TESTING.md).

### Frontend Tests (React/TypeScript)

```sh
cd ui

# Run tests once
npm run test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

The UI tests cover schema generation (XSD, JSON Schema), field tree building, and export validation.

## Project Structure
---
- `src/main/java/com/ceremony/catalog/` — Main application code
- `src/test/java/com/ceremony/catalog/` — Test code
- `src/main/resources/application.yml` — Spring Boot configuration
- `docker-compose.yml` — Docker Compose configuration
- `Dockerfile` — Multi-stage build for the Spring Boot app

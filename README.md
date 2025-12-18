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

## Getting Started
---
### Option A: Docker Compose (Recommended)

Start everything with a single command:

```sh
docker-compose up --build
```

This starts both:
- **MongoDB** on port 27017
- **API** on port 8080

The API will be available at [http://localhost:8080](http://localhost:8080).

Data is persisted in a Docker volume (`mongodb-data`), so it survives restarts.

#### Docker Compose Commands

```sh
# Start everything
docker-compose up --build

# Start in background
docker-compose up -d --build

# Stop everything
docker-compose down

# Stop and remove data volume
docker-compose down -v

# View logs
docker-compose logs -f

# View API logs only
docker-compose logs -f app
```

### Option B: Run Locally with Maven (Development)

For local development with hot-reload:

**1. Start MongoDB via Docker Compose:**
```sh
docker-compose up mongodb
```

**2. Run the API locally:**
```sh
mvn spring-boot:run
```

The API will be available at [http://localhost:8080](http://localhost:8080).

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

## Testing
---
```sh
mvn clean test
```

Integration tests use Testcontainers to spin up a temporary MongoDB instance. Docker must be running.

## Project Structure
---
- `src/main/java/com/ceremony/catalog/` — Main application code
- `src/test/java/com/ceremony/catalog/` — Test code
- `src/main/resources/application.yml` — Spring Boot configuration
- `docker-compose.yml` — Docker Compose configuration
- `Dockerfile` — Multi-stage build for the Spring Boot app

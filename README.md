# Ceremony Field Catalog API

A Spring Boot + MongoDB API for tracking and cataloging observed XML fields across different business paths (deposits, loans, ondemand) for use in a legacy application that relies on XML data but has no schema defined for that data. Designed for extensibility, integration testing, and modern development workflows.  This application will allow you to then "reverse engineer" the XML schema for a given situation.

## Features
- RESTful API for submitting and querying observed field data
- MongoDB persistence with dynamic search and pagination
- Testcontainers-based integration tests for reliable CI/CD
- Built with Java 17, Spring Boot 3, and Lombok for reduced boilerplate

## Prerequisites
- Java 17+
- Maven 3.9+
- MongoDB (local or Docker)
- Docker (for integration tests and/or local MongoDB)

## Getting Started

### 1. Build the Project
```sh
mvn clean compile
```

### 2. Start MongoDB (if not already running)
```sh
docker run --name ceremony-mongo -p 27017:27017 -d mongo:7
```

### 3. Run the API
```sh
mvn spring-boot:run
```
The API will be available at [http://localhost:8080](http://localhost:8080).

### 4. Test the API with HTTP Requests
- Open the [`CatalogSmokeTests.http`](./CatalogSmokeTests.http) file in the project root.
- Use the REST Client extension in VS Code to send requests (click "Send Request" above any block).
- This will let you quickly verify the API is working for both POST and GET endpoints.

#### (Optional) Clear All Data from MongoDB
If you want to start over with a clean database:
1. Make sure your MongoDB Docker container is running (`docker ps` should show `ceremony-mongo`).
2. Open a terminal and run:
   ```sh
   docker exec -it ceremony-mongo mongosh
   ```
3. At the `>` prompt, run:
   ```js
   use ceremony_catalog
   db.dropDatabase()
   exit
   ```
- This will permanently delete all data in the `ceremony_catalog` database.

## API Endpoints

### Submit Observed Fields
```
POST /catalog/observed-fields
Content-Type: application/json
Body: [ { ...CatalogObservationDTO... } ]
```

### Search Catalog Fields
```
GET /catalog/fields
Query params: pathType, formCode, formVersion, action, productCode, productSubCode, loanProductCode, xpathContains, page, size
```

## Testing

### Run All Tests
```sh
mvn clean test
```
- Integration tests use Testcontainers to spin up a temporary MongoDB instance in Docker.

## Project Structure
- `src/main/java/com/ceremony/catalog/` — Main application code
- `src/test/java/com/ceremony/catalog/` — Test code
- `src/main/resources/application.yml` — Spring Boot configuration

## Useful Commands
- Stop MongoDB Docker container:
  ```sh
  docker stop ceremony-mongo
  ```
- Remove all data from MongoDB:
  ```sh
  docker exec -it ceremony-mongo mongosh
  use ceremony_catalog
  db.dropDatabase()
  exit
  ```

## License
MIT or your organization’s standard license.

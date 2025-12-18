# Repository Guidelines

## Project Structure & Module Organization
- `src/main/java/com/ceremony/catalog/` holds the Spring Boot app, split into `api/`, `service/`, `domain/`, `persistence/`, and `config/`.
- `src/test/java/com/ceremony/catalog/` mirrors production packages plus `base/` (shared test fixtures) and `util/`.
- `src/main/resources/` contains `application.yml` and env variants (`application-dev.yml`, `application-test.yml`, `application-prod.yml`).
- `tests/` contains manual REST Client files like `CatalogSmokeTests.http`.
- `docs/` contains architecture, API, and testing guides; `sdks/` holds the .NET and Python clients.
- Root-level `docker-compose.yml` and `Dockerfile` define containerized runtime/builds.

## Build, Test, and Development Commands
```sh
docker-compose up --build   # Run API + MongoDB with Docker
docker-compose up mongodb   # Start MongoDB only (for local app runs)
mvn spring-boot:run         # Run API locally (expects MongoDB on :27017)
mvn clean compile           # Compile the project
mvn clean package           # Build the runnable JAR
mvn test                    # Run all tests (requires Docker for Testcontainers)
mvn test -Dtest=CatalogServiceTest  # Run a single test class
```

## Coding Style & Naming Conventions
- Java 21, Spring Boot 3.x, Lombok annotations (`@Data`, `@Builder`, `@RequiredArgsConstructor`) are standard here.
- Follow existing patterns: packages are lowercase, classes are `PascalCase`, fields/methods are `camelCase`.
- Indentation is 4 spaces; keep DTOs in `api/dto/` and repository logic in `persistence/`.

## Testing Guidelines
- JUnit 5 + Spring Boot Test + Testcontainers (MongoDB) are the primary tools.
- Use base classes in `src/test/java/com/ceremony/catalog/base/` (`ServiceTestBase`, `IntegrationTestBase`, etc.).
- Test names follow `*Test` with targeted methods (see `CatalogServiceTest`).
- Manual API checks live in `tests/*.http` and can be run with the VS Code REST Client.

## Commit & Pull Request Guidelines
- Commit messages in history are short, imperative, and sentence case (no strict prefixes).
- PRs should include a clear description, relevant issue links, and test notes.
- When changing endpoints or contracts, update `docs/api/API_SPECIFICATION.md` and add/adjust tests.

## Configuration & Runtime Notes
- Default MongoDB connection is `mongodb://localhost:27017/ceremony_catalog` (see `application.yml`).
- Docker must be running for Testcontainers-based tests.

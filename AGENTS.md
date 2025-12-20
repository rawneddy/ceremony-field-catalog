# Repository Guidelines

## Project Structure & Module Organization
- `src/main/java/com/ceremony/catalog/` contains the Spring Boot app organized by `api/`, `service/`, `domain/`, `persistence/`, and `config/`.
- `src/test/java/com/ceremony/catalog/` mirrors production packages and adds shared helpers in `base/` and `util/`.
- `src/main/resources/` holds `application.yml` plus env overrides like `application-dev.yml`.
- `docs/` includes architecture, API, testing, and SDK guidance; `sdks/` contains .NET and Python clients.
- `tests/` stores manual REST Client scripts such as `CatalogSmokeTests.http`.
- `ui/src/index.css` `@theme` block defines all colors, fonts, and shadows (Tailwind v4 central palette).
- Root `docker-compose.yml` and `Dockerfile` define containerized builds and local runtime.

## Build, Test, and Development Commands
```sh
docker-compose up --build    # Run API + MongoDB in Docker
docker-compose up mongodb    # Start MongoDB only (for local app runs)
mvn spring-boot:run          # Run API locally (expects MongoDB on :27017)
mvn clean package            # Build the runnable JAR
mvn clean test               # Run unit + integration tests (uses Testcontainers)
mvn test -Dtest=CatalogServiceTest  # Run a single test class
```

## Coding Style & Naming Conventions
- Java 21, Spring Boot 3, and Lombok are standard; follow existing annotation usage.
- Indentation is 4 spaces; packages are lowercase; classes are `PascalCase`; fields/methods are `camelCase`.
- Keep DTOs in `api/dto/` and persistence logic in `persistence/` to match the current layering.

## Testing Guidelines
- JUnit 5 + Spring Boot Test + Testcontainers (MongoDB) are the primary tools.
- Base classes live in `src/test/java/com/ceremony/catalog/base/` and should be reused for new tests.
- Test names follow `*Test`; prefer targeted service or controller tests for new behavior.
- Manual API checks live in `tests/*.http` and can be run with the VS Code REST Client.

## Commit & Pull Request Guidelines
- Commit messages are short, imperative, and sentence case (examples: "Fix MongoDB connection in Docker", "Add Docker configuration for full-stack local development").
- PRs should include a clear description, linked issues, and test notes.
- If you change endpoints or contracts, update `docs/api/API_SPECIFICATION.md` and relevant tests.

## Configuration & Runtime Notes
- Default MongoDB connection is `mongodb://localhost:27017/ceremony_catalog` (see `src/main/resources/application.yml`).
- Docker must be running for Testcontainers-based tests and for `docker-compose` workflows.

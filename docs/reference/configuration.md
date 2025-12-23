# Configuration Reference

**Purpose:** Complete reference for environment variables, profiles, and runtime configuration
**Use when:** Deployment, debugging, ops changes
**Source of truth:** `src/main/resources/application*.yml`, `docker-compose.yml`

---

## Environment Variables

### Backend

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGODB_URI` | `mongodb://localhost:27017/ceremony_catalog` | MongoDB connection string |
| `SERVER_PORT` | `8080` | HTTP server port |

### UI

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8080` | Backend API URL |

---

## Application Profiles

### default

Base configuration in `application.yml`:

```yaml
spring:
  data:
    mongodb:
      uri: ${MONGODB_URI:mongodb://localhost:27017/ceremony_catalog}

server:
  port: ${SERVER_PORT:8080}

catalog:
  max-field-path-length: 500
  max-metadata-key-length: 100
  max-metadata-value-length: 500
```

### dev

Development overrides in `application-dev.yml`:

```yaml
spring:
  data:
    mongodb:
      uri: mongodb://localhost:27017/ceremony_catalog_dev

logging:
  level:
    com.ceremony: DEBUG
```

Activate: `mvn spring-boot:run -Dspring.profiles.active=dev`

---

## Catalog Properties

Defined in `CatalogProperties.java`:

| Property | Default | Description |
|----------|---------|-------------|
| `catalog.max-field-path-length` | 500 | Maximum field path length |
| `catalog.max-metadata-key-length` | 100 | Maximum metadata key length |
| `catalog.max-metadata-value-length` | 500 | Maximum metadata value length |

---

## Docker Compose

### docker-compose.yml

```yaml
services:
  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db

  api:
    build: .
    ports:
      - "8080:8080"
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/ceremony_catalog
    depends_on:
      - mongodb

  ui:
    build: ./ui
    ports:
      - "5173:80"
    environment:
      - VITE_API_URL=http://api:8080

volumes:
  mongo-data:
```

### Running

```bash
# Full stack
docker-compose up --build

# MongoDB only (for local development)
docker-compose up mongodb

# Rebuild specific service
docker-compose up --build api
```

---

## MongoDB Configuration

### Connection String Format

```
mongodb://[username:password@]host[:port]/database[?options]
```

### Examples

```bash
# Local development
MONGODB_URI=mongodb://localhost:27017/ceremony_catalog

# Docker network
MONGODB_URI=mongodb://mongodb:27017/ceremony_catalog

# Atlas (cloud)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/ceremony_catalog
```

### Indexes

Created on startup by `CatalogCustomRepositoryImpl.createIndexes()`:

| Collection | Index | Fields |
|------------|-------|--------|
| catalog_fields | contextId | `{ contextId: 1 }` |
| catalog_fields | fieldPath | `{ fieldPath: 1 }` |
| catalog_fields | metadata | `{ "metadata.$**": 1 }` |

---

## UI Configuration

### config.ts

```typescript
export const config = {
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
  DEBOUNCE_MS: 300,
  MAX_RESULTS_PER_PAGE: 100,
};
```

### Vite Environment

Create `.env.local` for local overrides:

```
VITE_API_URL=http://localhost:8080
```

---

## CORS Configuration

Configured in `WebConfig.java`:

```java
@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
            .allowedOrigins("http://localhost:5173")
            .allowedMethods("GET", "POST", "PUT", "DELETE");
    }
}
```

For production, update allowed origins.

---

## Logging

### Backend

Configure in `application.yml`:

```yaml
logging:
  level:
    root: INFO
    com.ceremony: DEBUG
    org.springframework.data.mongodb: DEBUG
```

### Log Levels

| Level | Use |
|-------|-----|
| ERROR | Errors requiring attention |
| WARN | Potential issues |
| INFO | Normal operations |
| DEBUG | Development diagnostics |
| TRACE | Detailed tracing |

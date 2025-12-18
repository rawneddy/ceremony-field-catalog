# React UI Implementation Guide

This directory contains comprehensive documentation for building a React-based user interface for the Ceremony Field Catalog API.

## Core Concept: Dynamic Context System

The Ceremony Field Catalog uses a **dynamic Context system** where observation points are defined via API, not hardcoded. Each Context:
- Has a unique `contextId` (e.g., "deposits", "renderdata", "ondemand")
- Defines `requiredMetadata` fields that determine field identity
- May include `optionalMetadata` fields for additional categorization
- Contains `CatalogEntry` records representing observed XML fields

The UI must support this dynamic model by fetching Contexts from the API and rendering appropriate metadata filters based on the selected Context.

## Documents Overview

### [API_SPECIFICATION.md](./API_SPECIFICATION.md)
Complete API documentation including:
- Context management endpoints (CRUD operations)
- Field observation submission endpoint
- Dynamic field search with metadata filtering
- Paginated response formats
- Error handling patterns

### [UI_REQUIREMENTS.md](./UI_REQUIREMENTS.md)
Detailed product requirements including:
- User personas and user stories
- Context management and dynamic filtering requirements
- Complete acceptance criteria
- UI mockups with Context selector and dynamic metadata filters
- Performance and accessibility requirements

### [TECHNICAL_ARCHITECTURE.md](./TECHNICAL_ARCHITECTURE.md)
Technical implementation guide covering:
- Recommended technology stack (React 18, TypeScript, Tailwind CSS)
- TypeScript interfaces for Context, CatalogEntry, and API responses
- React Query patterns for data fetching
- Dynamic metadata filter component architecture
- Performance optimization strategies

### [DEVELOPMENT_SETUP.md](./DEVELOPMENT_SETUP.md)
Step-by-step development environment setup:
- Project initialization with Vite and TypeScript
- Development tools and configuration
- Environment variables and build setup
- Testing configuration with Vitest
- Code quality tools (ESLint, Prettier)

### [SAMPLE_COMPONENTS.md](./SAMPLE_COMPONENTS.md)
Ready-to-use component implementations:
- **CatalogSearch**: Main search page with Context-aware filtering
- **SearchForm**: Dynamic form that adapts to selected Context
- **FieldTable**: Display for CatalogEntry results with metadata
- **ContextList**: Browse and select available Contexts
- Custom hooks: `useContexts`, `useCatalogSearch`, `useDebounce`
- API service layer with full Context and field operations

## Quick Start for New Claude Code Session

To begin implementing the React UI in a new repository:

1. **Read the documents in order:**
   - Start with `UI_REQUIREMENTS.md` to understand what you're building
   - Review `API_SPECIFICATION.md` to understand the Context-based API
   - Study `TECHNICAL_ARCHITECTURE.md` for TypeScript types and patterns
   - Follow `DEVELOPMENT_SETUP.md` for environment configuration
   - Use `SAMPLE_COMPONENTS.md` as implementation examples

2. **Create the project:**
   ```bash
   npm create vite@latest ceremony-field-catalog-ui -- --template react-ts
   cd ceremony-field-catalog-ui
   ```

3. **Install dependencies** as specified in Development Setup

4. **Implement components** using the provided samples as starting points

5. **Test integration** with the Spring Boot API running on `http://localhost:8080`

## Key Implementation Notes

### Dynamic Context Integration
- Fetch Contexts on app load via `GET /catalog/contexts`
- Populate Context dropdown from API response
- Render metadata filters dynamically based on selected Context's `requiredMetadata` and `optionalMetadata`
- Support cross-context search when no Context is selected

### API Integration
- The Spring Boot API is configured with CORS for `http://localhost:3000`
- Context management: `GET/POST/PUT/DELETE /catalog/contexts`
- Field observations: `POST /catalog/contexts/{contextId}/observations`
- Field search: `GET /catalog/fields` with dynamic query parameters

### Data Model
```typescript
// Context defines an observation point
interface Context {
  contextId: string;
  displayName: string;
  requiredMetadata: string[];  // e.g., ["productCode", "action"]
  optionalMetadata?: string[]; // e.g., ["channel"]
  active: boolean;
}

// CatalogEntry represents an observed field
interface CatalogEntry {
  id: string;
  contextId: string;
  metadata: Record<string, string>;  // Dynamic key-value pairs
  fieldPath: string;                 // XPath
  minOccurs: number;
  maxOccurs: number;
  allowsNull: boolean;
  allowsEmpty: boolean;
}
```

### State Management Strategy
- **Server State:** React Query for Contexts and field data
- **Client State:** React hooks for UI state (expanded rows, form values)
- **URL State:** React Router search params for shareable, bookmarkable searches

### Performance Considerations
- Implement debounced search (500ms) to avoid excessive API calls
- Cache Contexts for 10 minutes (they rarely change)
- Use React Query's `keepPreviousData` for smooth pagination
- Code splitting for optimal bundle sizes

## Testing Strategy

### Component Testing
- Use Vitest + React Testing Library for component tests
- Test dynamic filter rendering based on Context selection
- Mock API calls for predictable testing

### Integration Testing
- Test with real API responses using Mock Service Worker
- Verify cross-context search behavior
- Test responsive design across different screen sizes

## Deployment Considerations

### Development
- React dev server on `http://localhost:3000`
- API proxy configuration for CORS-free local development
- Hot module replacement for fast development cycles

### Production
- Static file deployment (can use any CDN or static hosting)
- Environment-specific API URLs via `VITE_API_BASE_URL`
- Optimized bundle splitting and compression

## Future Enhancement Opportunities

The architecture supports easy addition of:
- Context management UI (create/edit/delete Contexts)
- Authentication and authorization
- Export results to CSV/Excel
- Save search queries/bookmarks
- Field usage analytics/charts
- Real-time updates via WebSocket

## Support and Resources

### Spring Boot API
- API repository: `ceremony-field-catalog`
- Swagger UI: `http://localhost:8080/swagger-ui.html`
- OpenAPI Spec: `http://localhost:8080/v3/api-docs`

### React Ecosystem
- React 18+ documentation: https://react.dev/
- TypeScript handbook: https://www.typescriptlang.org/docs/
- Tailwind CSS: https://tailwindcss.com/docs
- React Query: https://tanstack.com/query/latest/docs/react/overview

This documentation package provides everything needed for a new Claude Code session to successfully implement a professional, production-ready React UI for the Ceremony Field Catalog system.

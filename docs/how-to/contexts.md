# How To: Context Lifecycle

**Purpose:** Understand and modify context creation, updates, and deletion
**Use when:** Changing context schema, metadata rules, or the Manage Contexts UI
**Don't use when:** Changing search behavior → see `search.md`
**Source of truth:**
- `Context.java` - domain model
- `ContextService.java` - business logic
- `ContextController.java` - REST endpoints
- `ui/src/pages/ManageContextsPage.tsx` - context management UI

---

## Context Model

```java
@Document("contexts")
public class Context {
    String contextId;           // Unique identifier (normalized to lowercase)
    String displayName;         // Human-readable name
    String description;         // Optional description
    List<String> requiredMetadata;  // Immutable after creation
    List<String> optionalMetadata;  // Can be modified
    Map<String, String> metadataRules;  // XPath extraction patterns
    boolean active;             // Controls visibility in UI
}
```

---

## API Operations

### Create Context
```http
POST /catalog/contexts
Content-Type: application/json

{
  "contextId": "deposits",
  "displayName": "Deposits",
  "description": "Deposit processing fields",
  "requiredMetadata": ["productCode"],
  "optionalMetadata": ["channel", "region"],
  "active": true
}
```

**Validation:**
- `contextId` required, normalized to lowercase
- `requiredMetadata` immutable after creation (enforced on update)
- `active` flag required

### Update Context
```http
PUT /catalog/contexts/{contextId}
```

**Allowed changes:**
- `displayName`, `description`
- `optionalMetadata` (add/remove fields)
- `metadataRules`
- `active` status

**Blocked changes:**
- `requiredMetadata` - throws error if different from existing

### Delete Context
```http
DELETE /catalog/contexts/{contextId}
```

**Behavior:** Deletes context AND all associated catalog entries. Irreversible.

### List Contexts
```http
GET /catalog/contexts              # Active contexts only
GET /catalog/contexts?all=true     # Include inactive
```

---

## Required Metadata Immutability

**Why:** Required metadata is part of field identity hash. Changing it would:
- Break existing field identity lookups
- Cause duplicate entries for same logical field
- Make merge algorithm unpredictable

**Solution:** To change required metadata, create a new context and migrate data.

---

## Metadata Rules

XPath patterns for auto-extracting metadata during XML upload:

```json
{
  "metadataRules": {
    "productCode": "/Document/Header/ProductCode",
    "channel": "/Document/Header/@channel"
  }
}
```

**Behavior:**
- UI upload extracts values using these XPaths
- Values are attached to observations before submission
- Missing values default to empty string

---

## UI Implementation

### Manage Contexts Page (`/contexts`)

- **Context grid:** Cards showing all contexts with field counts
- **Create button:** Opens modal for new context
- **Edit:** Click card to modify (respects immutability rules)
- **Delete:** Confirmation required, shows affected field count

**Key files:**
- `ManageContextsPage.tsx` - page component
- `ContextCard.tsx` - individual context display
- `ContextFormModal.tsx` - create/edit form
- `useContexts.ts` - data fetching hook
- `useContextMutations.ts` - create/update/delete

### Context Selector (Shared Component)

Used in Discover Fields, Explore Schema, and Submit Data pages:
- `ContextSelector.tsx` - dropdown component
- `required` prop controls placeholder behavior

---

## Modifying Context Behavior

### Add New Context Field

1. Add to `Context.java` domain model
2. Add to `ContextDTO.java` if exposed via API
3. Update `ContextService.java` validation if needed
4. Update `ContextFormModal.tsx` for UI editing

### Change Delete Behavior

Current: Hard delete of context and all entries
Location: `ContextService.deleteContext()`

To implement soft delete:
1. Change to set `active = false`
2. Keep entries but exclude from queries
3. Add cleanup job for old inactive contexts

### Add Metadata Validation

Edit `ContextService.validateContext()` to add rules like:
- Required metadata field name patterns
- Maximum metadata fields
- Reserved field names

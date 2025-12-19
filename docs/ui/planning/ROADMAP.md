# UI Roadmap - Future Enhancements

This document captures potential future enhancements that are **not part of the initial UI buildout**. These ideas inform architectural decisions but should not be implemented until after the first release.

---

## XML Explorer Enhancement

This enhancement would transform the Upload page from a simple submission form into an **XML Explorer + Optional Catalog Submission** tool.

### The Insight

Users upload XML files for two distinct reasons:

1. **Exploration**: "What fields are in this XML?" - Developer debugging a production file, analyst understanding document structure
2. **Contribution**: "Add these observations to the catalog" - QA tester feeding real-world data into the system

The current design only addresses #2. This enhancement addresses both.

### Proposed Flow

```
┌─ Upload ─────────────────────────────────────────────────────┐
│                                                              │
│  PHASE 1: EXPLORE (no server interaction)                    │
│  ┌──────────────────────────────────────────────────────┐    │
│  │        Drag XML files here to explore                │    │
│  │              their field structure                   │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│                    ↓ (parse client-side)                     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ 156 fields found across 3 files           [Export ▼] │    │
│  ├──────────────────────────────────────────────────────┤    │
│  │ fieldPath              │ Count │ Null? │ Empty?      │    │
│  │ /Ceremony/Account/...  │   3   │  No   │  No         │    │
│  │ /Ceremony/Customer/... │   1   │  Yes  │  No         │    │
│  │ ... (same results view as Search page)               │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  PHASE 2: SUBMIT TO CATALOG (optional)                       │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ Add these observations to the catalog?               │    │
│  │                                                       │    │
│  │ Context: [deposits ▼]                                │    │
│  │ productCode: [DDA____]  action: [FULFILLMENT_]       │    │
│  │                                                       │    │
│  │                              [Submit to Catalog]      │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

### Key Benefits

| Benefit | Description |
|---------|-------------|
| **Immediate value** | User sees field structure without any server interaction |
| **"What's in this file?"** | Answers the question directly, no catalog pollution |
| **Preview before commit** | Verify observations look correct before submitting |
| **Reuses existing components** | Same `FieldTable`, `FieldDetailPanel`, `ResultsFilter` as Search page |

### Implementation Considerations

**Phase 1 (Explore):**
- `xmlParser.ts` already produces observations client-side
- Display observations using existing results components
- No API calls needed - pure client-side exploration
- Export to CSV/JSON works on parsed data (no submission required)

**Phase 2 (Submit):**
- Only shown after files are parsed
- Context + metadata selection (same as current design)
- Submits the already-parsed observations to API
- Shows success/error feedback

**Component reuse:**
- `FieldTable` / `FieldRow` / `FieldDetailPanel` - identical to Search page
- `ResultsFilter` - client-side filtering of parsed fields
- New: `ParsedFieldsView` wrapper that displays observations before submission

---

## Document Provenance

A natural extension of the XML Explorer feature is **tracking which documents contributed to each catalog entry**.

### The Idea

- Store original XML documents in blob storage (S3, Azure Blob)
- Link each observation to its source document ID
- Enable: "Click a field → see documents containing this field → download example"

### Current Architecture Compatibility

| Aspect | Current State | Future-Ready? |
|--------|---------------|---------------|
| Field identity (FieldKey) | Stable hash of contextId + requiredMetadata + fieldPath | ✅ Yes - can add source tracking without changing identity |
| Observation merge | Multiple uploads update same entry's statistics | ⚠️ Would need separate `ObservationSources` collection to track document origins |
| Backend storage | MongoDB only | ✅ Can add blob storage integration (Spring Boot supports S3/Azure easily) |
| API contracts | No document reference fields | ✅ Can extend response DTOs without breaking existing clients |

**No major architectural blockers.** The key requirements for future compatibility:
1. Keep FieldKey stable (already done)
2. Don't assume observations are untraceable
3. Consider adding `uploadBatchId` to observations for grouping (optional, would help track which files were uploaded together)

---

## Other Future Enhancements

From REQUIREMENTS.md "Future Enhancements" section:

- **Tree view**: Hierarchical display of field paths
- **Field comparison**: Compare fields across contexts or metadata variants
- **Usage analytics**: Charts showing field usage patterns
- **Real-time updates**: WebSocket-based live field observation
- **XSD generation**: Generate XML schemas from catalog data
- **Advanced search**: Regex patterns, multiple field path filters
- **Saved searches**: Bookmark and share search queries

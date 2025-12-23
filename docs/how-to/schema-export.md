# How To: Schema Export

**Purpose:** Understand and modify XSD/JSON Schema generation
**Use when:** Changing export formats, adding new schema types, fixing export issues
**Don't use when:** Changing search → `search.md`
**Source of truth:**
- `ui/src/lib/schema/` - schema generation logic
- `ui/src/components/search/SchemaExportButtons.tsx` - export UI

---

## Overview

The Explore Schema page generates schemas from catalog field data:

1. User selects context and metadata
2. Search returns matching catalog fields
3. Export buttons generate XSD or JSON Schema
4. User downloads the schema file

---

## Export Formats

### XSD (XML Schema Definition)

Generates W3C XML Schema from field paths:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="Document">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="Account" minOccurs="0">
          <xs:complexType>
            <xs:sequence>
              <xs:element name="Balance" type="xs:string" minOccurs="0"/>
            </xs:sequence>
          </xs:complexType>
        </xs:element>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>
```

**Features:**
- Nested structure from field paths
- `minOccurs` from catalog statistics
- Attributes as `xs:attribute`

### JSON Schema

Generates JSON Schema Draft-07:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "Document": {
      "type": "object",
      "properties": {
        "Account": {
          "type": "object",
          "properties": {
            "Balance": {"type": "string"}
          }
        }
      }
    }
  }
}
```

---

## UI Implementation

### Explore Schema Page (`/schema`)

```
Context Selector → Required Metadata → Optional Metadata → Search Button
                                                              ↓
                                              Results Table + Export Buttons
```

**Key files:**
- `ExploreSchemaPage.tsx` - page component
- `SchemaExportButtons.tsx` - XSD/JSON buttons
- `ui/src/lib/schema/xsdGenerator.ts` - XSD generation
- `ui/src/lib/schema/jsonSchemaGenerator.ts` - JSON Schema generation

### Export Button Behavior

1. Takes current search results (catalog fields)
2. Passes to generator function
3. Creates downloadable file
4. Triggers browser download

---

## Schema Generation Logic

### Field Path → Structure

```
/Document/Account/Balance
     ↓
Document
  └── Account
        └── Balance
```

### Handling Attributes

Field paths with `/@attr` become XML attributes:

```
/Document/@version → <xs:attribute name="version" type="xs:string"/>
```

### MinOccurs/MaxOccurs

From catalog field statistics:
- `minOccurs=0` if field has `minOccurs=0` in catalog
- `maxOccurs=1` (default for elements)
- Arrays detected by `maxOccurs > 1`

---

## Modifying Export

### Add New Export Format

1. Create generator in `ui/src/lib/schema/`
2. Add button in `SchemaExportButtons.tsx`
3. Wire up download logic

### Change XSD Structure

Edit `ui/src/lib/schema/xsdGenerator.ts`:
- Tree building logic
- Type assignments
- Attribute handling

### Add Export Options

1. Add state in `ExploreSchemaPage.tsx`
2. Pass options to generator
3. Add UI controls (checkboxes, dropdowns)

---

## Known Limitations

1. **No type inference:** All elements default to `xs:string`
2. **No array detection:** `maxOccurs` always 1 unless explicitly set
3. **No namespace support:** Generates schema without target namespace
4. **Flat attributes:** Attributes always at current element level

---

## Testing Schema Generation

### Manual Testing

1. Create context with sample observations
2. Navigate to Explore Schema
3. Search for fields
4. Export XSD and JSON Schema
5. Validate against sample XML

### Type Checking

```bash
cd ui
npm run typecheck  # Verify generator types
```

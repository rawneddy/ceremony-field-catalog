# Ceremony Field Catalog API Specification

## Overview
The Ceremony Field Catalog API is a Spring Boot REST service for tracking and cataloging observed XML fields across different business paths. This document provides complete API specification for UI integration.

## Base Configuration

### Endpoints
- **Development:** `http://localhost:8080`
- **Production:** TBD (configure via environment variable)

### Authentication
- **Current:** No authentication required
- **Future:** May require API key or JWT tokens

### CORS Configuration
- Configured to allow requests from `http://localhost:3000` for development
- Production origins will be configured separately

## API Endpoints

### 1. Submit Field Observations

**Endpoint:** `POST /catalog/observed-fields`

**Purpose:** Submit one or more field observations for cataloging

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
[
  {
    "pathType": "deposits",           // Required: deposits|loans|ondemand
    "formCode": "DDA",               // Optional: For ondemand path
    "formVersion": "4S",             // Optional: For ondemand path  
    "action": "Fulfillment",         // Optional: For deposits path
    "productCode": "DDA",            // Optional: For deposits path
    "productSubCode": "4S",          // Optional: For deposits path
    "loanProductCode": "HEQF",       // Optional: For loans path
    "xpath": "/Ceremony/Account/FeeCode", // Required: XML path
    "dataType": "data",              // Required: data type
    "count": 1,                      // Required: occurrence count (≥0)
    "hasNull": false,                // Required: allows null values
    "hasEmpty": false                // Required: allows empty values
  }
]
```

**Response:**
- **Success:** HTTP 204 No Content
- **Validation Error:** HTTP 400 Bad Request
- **Server Error:** HTTP 500 Internal Server Error

**Business Rules:**
- `pathType` determines which other fields are relevant:
  - **deposits:** Use action, productCode, productSubCode
  - **loans:** Use loanProductCode
  - **ondemand:** Use formCode, formVersion
- Multiple observations can be submitted in a single request
- System merges duplicate observations intelligently

### 2. Search Catalog Fields

**Endpoint:** `GET /catalog/fields`

**Purpose:** Search and retrieve cataloged fields with filtering and pagination

**Query Parameters:**
```
pathType         string    Optional  Filter by business path (deposits|loans|ondemand)
formCode         string    Optional  Filter by form code (ondemand path)
formVersion      string    Optional  Filter by form version (ondemand path)  
action          string    Optional  Filter by action (deposits path)
productCode     string    Optional  Filter by product code (deposits path)
productSubCode  string    Optional  Filter by product sub code (deposits path)
loanProductCode string    Optional  Filter by loan product code (loans path)
xpathContains   string    Optional  Filter by XPath pattern (case-insensitive)
page            integer   Optional  Page number (0-based, default: 0)
size            integer   Optional  Page size (1-1000, default: 50)
```

**Response Format:**
```json
{
  "content": [
    {
      "id": "deposits§§§Fulfillment§DDA§4S§§data§/Ceremony/Account/FeeCode",
      "pathType": "deposits",
      "formCode": null,
      "formVersion": null,
      "action": "Fulfillment",
      "productCode": "DDA", 
      "productSubCode": "4S",
      "loanProductCode": null,
      "xpath": "/Ceremony/Account/FeeCode",
      "dataType": "data",
      "maxOccurs": 5,
      "minOccurs": 0,
      "allowsNull": true,
      "allowsEmpty": false
    }
  ],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 50,
    "sort": {
      "empty": true,
      "sorted": false,
      "unsorted": true
    },
    "offset": 0,
    "paged": true,
    "unpaged": false
  },
  "last": false,
  "totalElements": 150,
  "totalPages": 3,
  "first": true,
  "size": 50,
  "number": 0,
  "sort": {
    "empty": true,
    "sorted": false,
    "unsorted": true
  },
  "numberOfElements": 50,
  "empty": false
}
```

**Response Fields Explanation:**
- `content[]`: Array of catalog entries matching the search criteria
- `totalElements`: Total number of records across all pages
- `totalPages`: Total number of pages available
- `first`/`last`: Boolean flags for navigation
- `size`: Requested page size
- `number`: Current page number (0-based)
- `numberOfElements`: Actual items in current page

**Common Search Patterns:**
```bash
# Get all deposits fields
GET /catalog/fields?pathType=deposits

# Search for specific product
GET /catalog/fields?pathType=deposits&productCode=DDA&productSubCode=4S

# Find fields containing "Fee" in xpath
GET /catalog/fields?xpathContains=Fee

# Get loans for specific product
GET /catalog/fields?pathType=loans&loanProductCode=HEQF

# Paginated results
GET /catalog/fields?page=0&size=25
```

## Error Handling

### Validation Errors (HTTP 400)
```json
{
  "message": "Validation failed",
  "status": 400,
  "timestamp": "2025-06-06T09:43:40.065514",
  "path": "uri=/catalog/observed-fields",
  "validationErrors": {
    "pathType": "Path type is required",
    "xpath": "XPath is required",
    "count": "Count must be non-negative"
  }
}
```

### Server Errors (HTTP 500)
```json
{
  "message": "An unexpected error occurred",
  "status": 500,
  "timestamp": "2025-06-06T09:43:40.065514", 
  "path": "uri=/catalog/observed-fields",
  "validationErrors": null
}
```

## Data Model

### Field Entry Structure
Each catalog entry represents an observed XML field with its metadata:

- **Identity:** Composite key based on pathType + context + xpath + dataType
- **Context:** Business context (deposits action/product, loans product, ondemand form)
- **Occurrence Stats:** minOccurs/maxOccurs from observations
- **Data Quality:** allowsNull/allowsEmpty flags
- **Path Information:** Full xpath to the field

### Business Path Types

#### Deposits Path
- **Context:** action + productCode + productSubCode
- **Example:** Fulfillment + DDA + 4S
- **Use Cases:** Account opening, transaction processing

#### Loans Path  
- **Context:** loanProductCode
- **Example:** HEQF (Home Equity Line)
- **Use Cases:** Loan application processing

#### OnDemand Path
- **Context:** formCode + formVersion
- **Example:** ACK123 + v1.0
- **Use Cases:** Document generation, form processing

## Rate Limiting & Performance

### Current Limits
- No rate limiting implemented
- Page size maximum: 1000 records
- Query timeout: 30 seconds

### Performance Considerations
- Indexed fields: pathType, formCode, action, productCode, loanProductCode
- XPath searches use regex (may be slower on large datasets)
- Batch submissions recommended for large observation sets

## Future API Changes

### Planned Enhancements
- Authentication/authorization
- Field statistics endpoints
- Bulk export functionality
- Real-time field observation streaming
- Advanced search with multiple xpath patterns

### Backward Compatibility
- Current API will remain stable
- New features will be additive
- Breaking changes will be versioned (e.g., /v2/catalog/fields)
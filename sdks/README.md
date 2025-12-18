# Ceremony Field Catalog SDKs

This directory contains client SDKs for interacting with the Ceremony Field Catalog API in various programming languages and frameworks.

## Available SDKs

### .NET Framework 4.8 SDK
**Location**: `dotnet/net48/CeremonyFieldCatalogSdk.cs`

A fire-and-forget C# SDK for submitting XML field observations to the Ceremony Field Catalog API.

#### Design Principles

- **Never throws exceptions** - All errors are handled internally
- **Fire-and-forget** - Returns immediately, processing happens in background
- **Null-safe** - Handles null inputs gracefully without crashing
- **Non-blocking** - Never impacts your main business flow
- **Optional error logging** - Callback for logging without throwing

This SDK is designed for legacy systems where field catalog submission is non-critical telemetry that should never impact the main business flow.

#### Features
- **Multiple XML Input Formats**: Supports `byte[]`, `string`, `XDocument`, and `XElement`
- **Streaming Performance**: Uses `XmlReader` for optimal memory usage with large XML files
- **Automatic Field Analysis**: Extracts field paths, occurrence counts, and null/empty patterns
- **Batched API Calls**: Configurable batch sizes for optimal network performance
- **Silent Failure**: Network errors, bad XML, API errors - all handled silently

#### Dependencies
- .NET Framework 4.8+
- System.Text.Json (for JSON serialization)
- System.Xml.Linq (included in .NET Framework)

#### Integration
To use this SDK in your .NET project:

1. Add the `CeremonyFieldCatalogSdk.cs` file to your project
2. Install the System.Text.Json NuGet package (if not already installed):
   ```
   Install-Package System.Text.Json
   ```
3. Add using statement: `using Ceremony.Catalog.Sdk;`

#### SDK Usage Examples

```csharp
// ============================================================================
// FIRE-AND-FORGET USAGE - SDK NEVER BLOCKS, NEVER THROWS
// ============================================================================

// Example 1: Basic fire-and-forget (no error handling needed)
var xmlData = File.ReadAllBytes("document.xml");
var metadata = new Dictionary<string, string>
{
    { "productCode", "DDA" },
    { "action", "Fulfillment" }
};

// This returns IMMEDIATELY - processing happens in background
// Even if XML is malformed, network is down, or API returns error
// your code continues without interruption
CeremonyFieldCatalogSdk.SubmitObservations(
    xmlData,
    "deposits",
    metadata,
    httpClient,
    "https://api.ceremony-catalog.com"
);

// Your business logic continues immediately - no waiting!
ProcessBusinessLogic();


// Example 2: With optional error logging (still fire-and-forget, still never throws)
CeremonyFieldCatalogSdk.SubmitObservations(
    xmlData,
    "deposits",
    metadata,
    httpClient,
    "https://api.ceremony-catalog.com",
    onError: ex => _logger.Warn($"Catalog submission failed: {ex.Message}")
);


// Example 3: All input types are null-safe
CeremonyFieldCatalogSdk.SubmitObservations(
    (byte[])null,        // Won't throw - silently returns
    "deposits",
    null,                // Won't throw - uses empty metadata
    httpClient,
    baseUrl
);


// Example 4: Handles all failure scenarios silently
// - Malformed XML? Silent failure
// - Network timeout? Silent failure
// - API returns 500? Silent failure
// - Invalid context? Silent failure
// Your business flow is NEVER impacted


// Example 5: String XML input
var xmlString = "<Ceremony><Amount>100.00</Amount></Ceremony>";
CeremonyFieldCatalogSdk.SubmitObservations(
    xmlString,
    "deposits",
    metadata,
    httpClient,
    baseUrl
);


// Example 6: XDocument input (if you already have parsed XML)
var xdoc = XDocument.Parse(xmlString);
CeremonyFieldCatalogSdk.SubmitObservations(
    xdoc,
    "deposits",
    metadata,
    httpClient,
    baseUrl
);


// Example 7: Recommended HttpClient setup for production
// Use a single shared HttpClient instance with appropriate timeout
var httpClient = new HttpClient
{
    Timeout = TimeSpan.FromSeconds(30)
};

// Optionally configure for your environment
httpClient.DefaultRequestHeaders.Add("X-Client-Id", "legacy-ceremony-system");
```

#### Performance Notes
- For large XML files (>10MB), use `byte[]` or `string` inputs for streaming performance
- For already-parsed XML, use `XDocument` or `XElement` inputs
- Adjust `batchSize` parameter based on your network conditions (default: 500)
- The SDK automatically handles field path generation and occurrence tracking

## API Compatibility

All SDKs are designed to work with the Ceremony Field Catalog API endpoints:

- **Context Management**: `POST /catalog/contexts`
- **Field Observations**: `POST /catalog/contexts/{contextId}/observations`
- **Field Search**: `GET /catalog/fields`

For API documentation, see the main project's OpenAPI documentation at `/swagger-ui.html` when the API is running.

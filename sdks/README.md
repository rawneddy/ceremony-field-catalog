# Ceremony Field Catalog SDKs

This directory contains client SDKs for interacting with the Ceremony Field Catalog API in various programming languages and frameworks.

## Available SDKs

### .NET Framework 4.8 SDK
**Location**: `dotnet/net48/CeremonyFieldCatalogSdk.cs`

A fire-and-forget C# SDK for submitting XML field observations to the Ceremony Field Catalog API.

#### Design Principles

- **Never throws exceptions** - All errors are handled internally
- **Fire-and-forget** - Returns immediately, processing happens in background
- **Controlled throughput** - Uses BlockingCollection with dedicated worker thread
- **Backpressure handling** - Drops items when queue is full (configurable capacity)
- **Graceful shutdown** - Can drain queue before application exits

This SDK is designed for legacy systems where field catalog submission is non-critical telemetry that should never impact the main business flow.

#### Features
- **Multiple XML Input Formats**: Supports `byte[]`, `string`, `XDocument`, and `XElement`
- **Streaming Performance**: Uses `XmlReader` for optimal memory usage with large XML files
- **Automatic Field Analysis**: Extracts field paths, occurrence counts, and null/empty patterns
- **Batched API Calls**: Configurable batch sizes for optimal network performance
- **Silent Failure**: Network errors, bad XML, API errors - all handled silently
- **Queue-Based Processing**: Single background worker prevents connection exhaustion

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
// INITIALIZATION (once at application startup)
// ============================================================================

// Create a shared HttpClient (recommended: single instance for app lifetime)
var httpClient = new HttpClient
{
    Timeout = TimeSpan.FromSeconds(30)
};

// Initialize the SDK
CeremonyFieldCatalogSdk.Initialize(
    httpClient,
    "https://catalog.example.com",
    batchSize: 500,           // Observations per HTTP request (default: 500)
    queueCapacity: 10000,     // Max queued items before dropping (default: 10000)
    onError: ex => _logger.Warn($"Catalog error: {ex.Message}")
);


// ============================================================================
// SUBMITTING OBSERVATIONS (fire-and-forget, returns immediately)
// ============================================================================

// Example 1: Basic usage with byte array
var xmlData = File.ReadAllBytes("document.xml");
var metadata = new Dictionary<string, string>
{
    { "productCode", "DDA" },
    { "action", "Fulfillment" },
    { "productSubCode", "4S" }
};

// This returns IMMEDIATELY - processing happens in background
CeremonyFieldCatalogSdk.SubmitObservations(xmlData, "deposits", metadata);

// Your business logic continues without waiting!
ProcessNextDocument();


// Example 2: String XML input
var xmlString = "<Ceremony><Amount>100.00</Amount></Ceremony>";
CeremonyFieldCatalogSdk.SubmitObservations(xmlString, "deposits", metadata);


// Example 3: XDocument input (if you already have parsed XML)
var xdoc = XDocument.Parse(xmlString);
CeremonyFieldCatalogSdk.SubmitObservations(xdoc, "deposits", metadata);


// Example 4: XElement input
var element = XElement.Parse(xmlString);
CeremonyFieldCatalogSdk.SubmitObservations(element, "deposits", metadata);


// ============================================================================
// GRACEFUL SHUTDOWN (optional, during application shutdown)
// ============================================================================

// Wait up to 30 seconds for queue to drain
bool drained = CeremonyFieldCatalogSdk.Shutdown(TimeSpan.FromSeconds(30));
if (!drained)
{
    _logger.Warn("Catalog queue did not fully drain before shutdown");
}
```

#### How It Works

```
                                    ┌─────────────────────┐
SubmitObservations() ──► Queue ──► │ Background Worker   │ ──► HTTP POST
SubmitObservations() ──►  (10k)    │ Thread              │     to API
SubmitObservations() ──►           │ (GetConsumingEnum)  │
        │                          └─────────────────────┘
        │
        └── Returns immediately (fire-and-forget)
```

- **Producer**: Your code calls `SubmitObservations()` which extracts fields and enqueues
- **Queue**: `BlockingCollection<T>` with bounded capacity (default 10,000 items)
- **Consumer**: Dedicated background thread processes items sequentially
- **Backpressure**: When queue is full, new items are dropped (not blocked)

#### Configuration Options

| Parameter | Default | Description |
|-----------|---------|-------------|
| `batchSize` | 500 | Observations per HTTP request |
| `queueCapacity` | 10000 | Max items in queue before dropping |
| `onError` | null | Global error callback for logging |

#### Performance Notes
- XML extraction happens on the calling thread (to avoid holding references)
- HTTP requests happen on a single background thread (controlled throughput)
- Queue capacity of 10,000 ≈ 1-2 MB memory overhead
- For large XML files (>10MB), use `byte[]` or `string` inputs for streaming

## API Compatibility

All SDKs are designed to work with the Ceremony Field Catalog API endpoints:

- **Context Management**: `POST /catalog/contexts`
- **Field Observations**: `POST /catalog/contexts/{contextId}/observations`
- **Field Search**: `GET /catalog/fields`

For API documentation, see the main project's OpenAPI documentation at `/swagger-ui.html` when the API is running.

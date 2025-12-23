# .NET Framework 4.8 SDK

**Purpose:** Fire-and-forget C# SDK for submitting XML field observations
**Use when:** Integrating legacy .NET applications with the Ceremony Field Catalog
**API compatibility:** `POST /catalog/contexts/{contextId}/observations`

---

## Design Principles

- **Never throws exceptions** - All errors are handled internally
- **Fire-and-forget** - Returns immediately, processing happens in background
- **Controlled throughput** - Uses BlockingCollection with dedicated worker thread
- **Backpressure handling** - Drops items when queue is full (configurable capacity)

This SDK is designed for legacy systems where field catalog submission is non-critical telemetry that should never impact the main business flow.

---

## Features

- **Multiple XML Input Formats**: Supports `byte[]`, `string`, and `XElement`
- **Automatic Field Analysis**: Extracts field paths, occurrence counts, and null/empty patterns
- **Batched API Calls**: Configurable batch sizes for optimal network performance
- **Silent Failure**: Network errors, bad XML, API errors - all handled silently
- **Queue-Based Processing**: Single background worker prevents connection exhaustion

---

## Dependencies

- .NET Framework 4.8+
- System.Text.Json (for JSON serialization)
- System.Xml.Linq (included in .NET Framework)

---

## Integration

1. Add the `CeremonyFieldCatalogSdk.cs` file to your project
2. Install the System.Text.Json NuGet package:
   ```
   Install-Package System.Text.Json
   ```
3. Add using statement: `using Ceremony.Catalog.Sdk;`

---

## Usage

### Initialization (once at application startup)

```csharp
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
```

### Submitting Observations (fire-and-forget)

```csharp
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


// Example 3: XElement input (if you already have parsed XML)
var element = XElement.Parse(xmlString);
CeremonyFieldCatalogSdk.SubmitObservations(element, "deposits", metadata);
```

---

## How It Works

```
                                    +---------------------+
SubmitObservations() --> Queue --> | Background Worker   | --> HTTP POST
SubmitObservations() -->  (10k)    | Thread              |     to API
SubmitObservations() -->           | (GetConsumingEnum)  |
        |                          +---------------------+
        |
        +-- Returns immediately (fire-and-forget)
```

- **Producer**: Your code calls `SubmitObservations()` which extracts fields and enqueues
- **Queue**: `BlockingCollection<T>` with bounded capacity (default 10,000 items)
- **Consumer**: Dedicated background thread processes items sequentially
- **Backpressure**: When queue is full, new items are dropped (not blocked)

---

## Configuration Options

| Parameter | Default | Description |
|-----------|---------|-------------|
| `batchSize` | 500 | Observations per HTTP request |
| `queueCapacity` | 10000 | Max items in queue before dropping |
| `onError` | null | Global error callback for logging |

---

## Performance Notes

- XML extraction happens on the calling thread (to avoid holding references)
- HTTP requests happen on a single background thread (controlled throughput)
- Queue capacity of 10,000 ~ 1-2 MB memory overhead

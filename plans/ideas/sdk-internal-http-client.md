# Plan: SDK Internal HTTP Client Management

## Overview

Convert both SDKs (.NET and Python) to manage their own HTTP clients internally with sensible timeout defaults. This simplifies the API and ensures callers can't misconfigure timeouts, which could cause the worker thread to hang.

**Current state:** Caller passes pre-configured HTTP client
**Target state:** SDK creates and manages HTTP client internally; caller only provides base URL

---

## Motivation

1. **Caller misconfiguration risk** - If caller doesn't set timeouts, worker thread could block indefinitely on slow/hanging backend
2. **Simpler API** - Fewer parameters, fewer ways to get it wrong
3. **Consistent behavior** - SDK guarantees its own resilience rather than trusting caller configuration
4. **Legacy system friendly** - Callers in legacy .NET Framework systems don't need to understand HttpClient lifecycle

---

## Timeout Defaults

| Timeout | Value | Rationale |
|---------|-------|-----------|
| **Connect timeout** | 10 seconds | Fail fast if backend unreachable |
| **Read/response timeout** | 30 seconds | Generous but not indefinite |
| **Total request timeout** | 60 seconds | Upper bound for entire operation |

These can be exposed as optional parameters for advanced users who need to tune them.

---

## .NET SDK Changes

### File: `sdks/dotnet/net48/CeremonyFieldCatalogSdk.cs`

#### 1. Update Initialize signature

```csharp
// Before
public static void Initialize(
    HttpClient httpClient,
    string baseUrl,
    int batchSize = DefaultBatchSize,
    int queueCapacity = DefaultQueueCapacity,
    Action<Exception> onError = null)

// After
public static void Initialize(
    string baseUrl,
    int batchSize = DefaultBatchSize,
    int queueCapacity = DefaultQueueCapacity,
    int requestTimeoutSeconds = DefaultRequestTimeoutSeconds,
    Action<Exception> onError = null)
```

#### 2. Add timeout constant

```csharp
private const int DefaultRequestTimeoutSeconds = 60;
```

#### 3. Create HttpClient internally

```csharp
// In Initialize(), replace httpClient parameter usage with:
_httpClient = new HttpClient
{
    BaseAddress = new Uri(baseUrl),
    Timeout = TimeSpan.FromSeconds(requestTimeoutSeconds)
};

// Set default headers
_httpClient.DefaultRequestHeaders.Accept.Add(
    new MediaTypeWithQualityHeaderValue("application/json"));
```

#### 4. Update SendBatch to use relative URLs

```csharp
// Before
var url = _baseUrl + endpoint;
var response = _httpClient.PostAsync(url, content).GetAwaiter().GetResult();

// After (BaseAddress handles it)
var response = _httpClient.PostAsync(endpoint, content).GetAwaiter().GetResult();
```

#### 5. Add cleanup on application exit (optional)

```csharp
// Consider adding Dispose/Shutdown method for clean shutdown
public static void Shutdown()
{
    _queue?.CompleteAdding();
    _httpClient?.Dispose();
}
```

#### 6. Remove _baseUrl field

No longer needed since HttpClient.BaseAddress handles it.

---

## Python SDK Changes

### File: `sdks/python/ceremony_catalog_sdk.py`

#### 1. Update initialize signature

```python
# Before
def initialize(
    session: Optional[requests.Session],
    base_url: Optional[str],
    batch_size: int = DEFAULT_BATCH_SIZE,
    queue_capacity: int = DEFAULT_QUEUE_CAPACITY,
    on_error: Optional[Callable[[Exception], None]] = None
) -> None:

# After
def initialize(
    base_url: str,
    batch_size: int = DEFAULT_BATCH_SIZE,
    queue_capacity: int = DEFAULT_QUEUE_CAPACITY,
    request_timeout_seconds: int = DEFAULT_REQUEST_TIMEOUT_SECONDS,
    on_error: Optional[Callable[[Exception], None]] = None
) -> None:
```

#### 2. Add timeout constants

```python
DEFAULT_REQUEST_TIMEOUT_SECONDS = 60
DEFAULT_CONNECT_TIMEOUT_SECONDS = 10
```

#### 3. Create Session internally

```python
# In initialize():
_session = requests.Session()
_session.headers.update({
    'Content-Type': 'application/json',
    'Accept': 'application/json'
})

# Store timeout for use in requests
_request_timeout = (DEFAULT_CONNECT_TIMEOUT_SECONDS, request_timeout_seconds)
```

#### 4. Update _send_batch to use timeout

```python
# Before
response = _session.post(url, json=json_data, headers={"Content-Type": "application/json"})

# After
response = _session.post(
    url,
    json=json_data,
    timeout=_request_timeout  # (connect_timeout, read_timeout)
)
```

#### 5. Add cleanup function (optional)

```python
def shutdown() -> None:
    """
    Cleanly shuts down the SDK. Optional - daemon thread will exit on process end.
    """
    global _session
    if _session:
        _session.close()
        _session = None
```

---

## API Documentation Updates

### .NET README

```csharp
// Before
var httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(60) };
CeremonyFieldCatalogSdk.Initialize(httpClient, "https://catalog.example.com");

// After
CeremonyFieldCatalogSdk.Initialize("https://catalog.example.com");

// With custom timeout (optional)
CeremonyFieldCatalogSdk.Initialize(
    "https://catalog.example.com",
    requestTimeoutSeconds: 120);
```

### Python README

```python
# Before
session = requests.Session()
session.timeout = 60
initialize(session, "https://catalog.example.com")

# After
initialize("https://catalog.example.com")

# With custom timeout (optional)
initialize(
    "https://catalog.example.com",
    request_timeout_seconds=120)
```

---

## Migration Notes

This is a **breaking change** to the SDK API. Callers will need to update their initialization code.

**Before:**
```csharp
var client = new HttpClient();
CeremonyFieldCatalogSdk.Initialize(client, "https://api.example.com");
```

**After:**
```csharp
CeremonyFieldCatalogSdk.Initialize("https://api.example.com");
```

Since these SDKs are for internal use, coordinate with any teams currently using them.

---

## Files to Modify

| File | Changes |
|------|---------|
| `sdks/dotnet/net48/CeremonyFieldCatalogSdk.cs` | Remove HttpClient param, create internally, add timeout config |
| `sdks/dotnet/net48/README.md` | Update usage examples |
| `sdks/python/ceremony_catalog_sdk.py` | Remove session param, create internally, add timeout config |
| `sdks/python/README.md` | Update usage examples |

---

## Testing Checklist

- [ ] .NET SDK initializes without HttpClient parameter
- [ ] .NET SDK respects custom timeout when provided
- [ ] .NET SDK times out appropriately on slow responses
- [ ] Python SDK initializes without session parameter
- [ ] Python SDK respects custom timeout when provided
- [ ] Python SDK times out appropriately on slow responses
- [ ] Both SDKs still drop items when queue is full (no regression)
- [ ] Both SDKs never block the caller (no regression)

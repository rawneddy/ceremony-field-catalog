# Ceremony Field Catalog SDKs

This directory contains client SDKs for interacting with the Ceremony Field Catalog API in various programming languages and frameworks.

## Available SDKs

### .NET Framework 4.8 SDK
**Location**: `dotnet/net48/CeremonyFieldCatalogSdk.cs`

A high-performance C# SDK for submitting XML field observations to the Ceremony Field Catalog API.

#### Features
- **Multiple XML Input Formats**: Supports `byte[]`, `string`, `XDocument`, and `XElement`
- **Streaming Performance**: Uses `XmlReader` for optimal memory usage with large XML files
- **Automatic Field Analysis**: Extracts XPath, occurrence counts, and null/empty patterns
- **Batched API Calls**: Configurable batch sizes for optimal network performance
- **Error Handling**: Comprehensive exception handling with detailed API error information

#### Dependencies
- .NET Framework 4.8+
- Newtonsoft.Json (for JSON serialization)
- System.Xml.Linq (included in .NET Framework)

#### Quick Start
```csharp
using Ceremony.Catalog.Sdk;

// Setup
var xmlData = File.ReadAllBytes("sample.xml");
var metadata = new Dictionary<string, string> 
{
    { "productCode", "DDA" },
    { "action", "Fulfillment" }
};

// Submit observations
using (var httpClient = new HttpClient())
{
    await CeremonyFieldCatalogSdk.SubmitObservationsAsync(
        xmlData, 
        "deposits", 
        metadata, 
        httpClient, 
        "https://your-api-url.com"
    );
}
```

#### Integration
To use this SDK in your .NET project:

1. Add the `CeremonyFieldCatalogSdk.cs` file to your project
2. Install the Newtonsoft.Json NuGet package:
   ```
   Install-Package Newtonsoft.Json
   ```
3. Add using statement: `using Ceremony.Catalog.Sdk;`

#### Performance Notes
- For large XML files (>10MB), use `byte[]` or `string` inputs for streaming performance
- For already-parsed XML, use `XDocument` or `XElement` inputs for efficiency
- Adjust `batchSize` parameter based on your network conditions (default: 500)
- The SDK automatically handles XPath generation and field occurrence tracking

## Future SDKs

This directory structure is designed to accommodate additional SDKs:

```
sdks/
├── dotnet/
│   ├── net48/           # .NET Framework 4.8
│   ├── netstandard2.0/  # .NET Standard 2.0 (future)
│   └── net6.0/          # .NET 6+ (future)
├── python/              # Python SDK (future)
├── javascript/          # JavaScript/Node.js SDK (future)
└── go/                  # Go SDK (future)
```

## API Compatibility

All SDKs are designed to work with the Ceremony Field Catalog API endpoints:

- **Context Management**: `POST /catalog/contexts`
- **Field Observations**: `POST /catalog/contexts/{contextId}/observations`
- **Field Search**: `GET /catalog/fields`

For API documentation, see the main project's OpenAPI documentation at `/swagger-ui.html` when the API is running.

## Contributing

When adding new SDKs:

1. Follow the established folder structure: `{language}/{framework-version}/`
2. Include comprehensive error handling and input validation
3. Support batched operations for performance
4. Match the API's DTO structure exactly
5. Include usage examples and integration instructions
6. Update this README with the new SDK information

## Support

For SDK-specific issues, please file issues in the main repository with the appropriate language label.
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System.Xml;
using System.Xml.Linq;
using Newtonsoft.Json;

namespace Ceremony.Catalog.Sdk
{
    /// <summary>
    /// High-performance SDK for submitting XML field observations to the Ceremony Field Catalog API.
    /// Supports multiple XML input formats and efficiently traverses XML to extract field patterns
    /// without indexing - focuses on field pattern identification rather than document navigation.
    /// </summary>
    public static class CeremonyFieldCatalogSdk
    {
        private const int DefaultBatchSize = 500;
        private const string ObservationsEndpoint = "/catalog/contexts/{0}/observations";

        #region Public API Methods

        /// <summary>
        /// Submits XML field observations from byte array to the Ceremony Field Catalog API.
        /// Uses streaming XmlReader for optimal memory performance with large XML files.
        /// </summary>
        /// <param name="xmlData">XML data as byte array</param>
        /// <param name="contextId">Context identifier for the observations</param>
        /// <param name="metadata">Metadata key-value pairs for the context</param>
        /// <param name="httpClient">HttpClient instance for API communication</param>
        /// <param name="baseUrl">Base URL of the Ceremony Field Catalog API</param>
        /// <param name="batchSize">Number of observations to send per API call (default: 500)</param>
        /// <returns>Task representing the async operation</returns>
        public static async Task SubmitObservationsAsync(
            byte[] xmlData, 
            string contextId, 
            Dictionary<string, string> metadata, 
            HttpClient httpClient, 
            string baseUrl,
            int batchSize = DefaultBatchSize)
        {
            if (xmlData == null) throw new ArgumentNullException(nameof(xmlData));
            ValidateInputs(contextId, metadata, httpClient, baseUrl);

            using (var stream = new MemoryStream(xmlData))
            using (var reader = XmlReader.Create(stream, CreateXmlReaderSettings()))
            {
                var observations = ExtractObservationsFromReader(reader, metadata);
                await SendObservationsBatchedAsync(observations, contextId, httpClient, baseUrl, batchSize);
            }
        }

        /// <summary>
        /// Submits XML field observations from string to the Ceremony Field Catalog API.
        /// Uses streaming XmlReader for optimal memory performance.
        /// </summary>
        /// <param name="xmlData">XML data as string</param>
        /// <param name="contextId">Context identifier for the observations</param>
        /// <param name="metadata">Metadata key-value pairs for the context</param>
        /// <param name="httpClient">HttpClient instance for API communication</param>
        /// <param name="baseUrl">Base URL of the Ceremony Field Catalog API</param>
        /// <param name="batchSize">Number of observations to send per API call (default: 500)</param>
        /// <returns>Task representing the async operation</returns>
        public static async Task SubmitObservationsAsync(
            string xmlData, 
            string contextId, 
            Dictionary<string, string> metadata, 
            HttpClient httpClient, 
            string baseUrl,
            int batchSize = DefaultBatchSize)
        {
            if (string.IsNullOrEmpty(xmlData)) throw new ArgumentException("XML data cannot be null or empty", nameof(xmlData));
            ValidateInputs(contextId, metadata, httpClient, baseUrl);

            using (var stringReader = new StringReader(xmlData))
            using (var reader = XmlReader.Create(stringReader, CreateXmlReaderSettings()))
            {
                var observations = ExtractObservationsFromReader(reader, metadata);
                await SendObservationsBatchedAsync(observations, contextId, httpClient, baseUrl, batchSize);
            }
        }

        /// <summary>
        /// Submits XML field observations from XDocument to the Ceremony Field Catalog API.
        /// Uses LINQ to XML for efficient traversal of already-parsed XML.
        /// </summary>
        /// <param name="xmlDocument">XDocument containing the XML data</param>
        /// <param name="contextId">Context identifier for the observations</param>
        /// <param name="metadata">Metadata key-value pairs for the context</param>
        /// <param name="httpClient">HttpClient instance for API communication</param>
        /// <param name="baseUrl">Base URL of the Ceremony Field Catalog API</param>
        /// <param name="batchSize">Number of observations to send per API call (default: 500)</param>
        /// <returns>Task representing the async operation</returns>
        public static async Task SubmitObservationsAsync(
            XDocument xmlDocument, 
            string contextId, 
            Dictionary<string, string> metadata, 
            HttpClient httpClient, 
            string baseUrl,
            int batchSize = DefaultBatchSize)
        {
            if (xmlDocument?.Root == null) throw new ArgumentException("XDocument cannot be null and must have a root element", nameof(xmlDocument));
            ValidateInputs(contextId, metadata, httpClient, baseUrl);

            var observations = ExtractObservationsFromElement(xmlDocument.Root, metadata);
            await SendObservationsBatchedAsync(observations, contextId, httpClient, baseUrl, batchSize);
        }

        /// <summary>
        /// Submits XML field observations from XElement to the Ceremony Field Catalog API.
        /// Uses LINQ to XML for efficient traversal of already-parsed XML.
        /// </summary>
        /// <param name="xmlElement">XElement containing the XML data</param>
        /// <param name="contextId">Context identifier for the observations</param>
        /// <param name="metadata">Metadata key-value pairs for the context</param>
        /// <param name="httpClient">HttpClient instance for API communication</param>
        /// <param name="baseUrl">Base URL of the Ceremony Field Catalog API</param>
        /// <param name="batchSize">Number of observations to send per API call (default: 500)</param>
        /// <returns>Task representing the async operation</returns>
        public static async Task SubmitObservationsAsync(
            XElement xmlElement, 
            string contextId, 
            Dictionary<string, string> metadata, 
            HttpClient httpClient, 
            string baseUrl,
            int batchSize = DefaultBatchSize)
        {
            if (xmlElement == null) throw new ArgumentNullException(nameof(xmlElement));
            ValidateInputs(contextId, metadata, httpClient, baseUrl);

            var observations = ExtractObservationsFromElement(xmlElement, metadata);
            await SendObservationsBatchedAsync(observations, contextId, httpClient, baseUrl, batchSize);
        }

        #endregion

        #region XML Processing - Streaming XmlReader (for byte[] and string)

        /// <summary>
        /// Extracts field observations from XML using streaming XmlReader for maximum performance.
        /// Builds field paths incrementally without indexing to focus on field pattern identification.
        /// </summary>
        private static List<CatalogObservationDto> ExtractObservationsFromReader(XmlReader reader, Dictionary<string, string> metadata)
        {
            var fieldStats = new Dictionary<string, FieldStatistics>();
            var pathStack = new Stack<string>();

            while (reader.Read())
            {
                switch (reader.NodeType)
                {
                    case XmlNodeType.Element:
                        var elementName = reader.LocalName;
                        
                        // Push element onto path stack
                        pathStack.Push(elementName);
                        
                        // Build current field path
                        var currentPath = BuildFieldPathFromStack(pathStack);
                        
                        // Process element and its attributes
                        ProcessElementWithReader(reader, currentPath, fieldStats, metadata);
                        
                        // If self-closing element, pop immediately
                        if (reader.IsEmptyElement)
                        {
                            pathStack.Pop();
                        }
                        break;

                    case XmlNodeType.EndElement:
                        // Pop element from path stack
                        if (pathStack.Count > 0)
                        {
                            pathStack.Pop();
                        }
                        break;

                    case XmlNodeType.Text:
                    case XmlNodeType.CDATA:
                        // Process text content of current element
                        if (pathStack.Count > 0)
                        {
                            var textPath = BuildFieldPathFromStack(pathStack);
                            var textValue = reader.Value;
                            UpdateFieldStatistics(fieldStats, textPath, metadata, textValue);
                        }
                        break;
                }
            }

            return ConvertStatisticsToObservations(fieldStats);
        }

        /// <summary>
        /// Processes an XML element and its attributes during streaming read.
        /// </summary>
        private static void ProcessElementWithReader(XmlReader reader, string fieldPath, Dictionary<string, FieldStatistics> fieldStats, Dictionary<string, string> metadata)
        {
            // Initialize field statistics for this element
            if (!fieldStats.ContainsKey(fieldPath))
            {
                fieldStats[fieldPath] = new FieldStatistics { FieldPath = fieldPath, Metadata = new Dictionary<string, string>(metadata) };
            }
            fieldStats[fieldPath].TotalOccurrences++;

            // Process attributes
            if (reader.HasAttributes)
            {
                while (reader.MoveToNextAttribute())
                {
                    var attributePath = fieldPath + "/@" + reader.LocalName;
                    var attributeValue = reader.Value;
                    UpdateFieldStatistics(fieldStats, attributePath, metadata, attributeValue);
                }
                reader.MoveToElement(); // Move back to element
            }
        }

        /// <summary>
        /// Builds field path string from the current path stack without indexing.
        /// Creates consistent field pattern identifiers regardless of collection size.
        /// </summary>
        private static string BuildFieldPathFromStack(Stack<string> pathStack)
        {
            if (pathStack.Count == 0) return "/";
            
            var pathElements = pathStack.ToArray().Reverse();
            return "/" + string.Join("/", pathElements);
        }

        #endregion

        #region XML Processing - LINQ to XML (for XDocument and XElement)

        /// <summary>
        /// Extracts field observations from XElement using LINQ to XML.
        /// Generates consistent field paths without indexing for cataloging purposes.
        /// </summary>
        private static List<CatalogObservationDto> ExtractObservationsFromElement(XElement rootElement, Dictionary<string, string> metadata)
        {
            var fieldStats = new Dictionary<string, FieldStatistics>();

            // Process root element and all descendants
            ProcessElementRecursive(rootElement, fieldStats, metadata, "");

            return ConvertStatisticsToObservations(fieldStats);
        }

        /// <summary>
        /// Recursively processes XElement to build field pattern catalog.
        /// Focuses on field structure identification rather than instance tracking.
        /// </summary>
        private static void ProcessElementRecursive(XElement element, Dictionary<string, FieldStatistics> fieldStats, Dictionary<string, string> metadata, string parentPath)
        {
            // Build current field path without indexing
            var currentPath = parentPath + "/" + element.Name.LocalName;

            // Process element text content
            if (!string.IsNullOrEmpty(element.Value) && !element.HasElements)
            {
                // Only process text if this element doesn't have child elements
                var textValue = element.Nodes().OfType<XText>().FirstOrDefault()?.Value ?? "";
                UpdateFieldStatistics(fieldStats, currentPath, metadata, textValue);
            }
            else if (!element.HasElements)
            {
                // Empty element - still record its existence
                UpdateFieldStatistics(fieldStats, currentPath, metadata, "");
            }

            // Process attributes
            foreach (var attribute in element.Attributes())
            {
                var attributePath = currentPath + "/@" + attribute.Name.LocalName;
                UpdateFieldStatistics(fieldStats, attributePath, metadata, attribute.Value);
            }

            // Process child elements
            foreach (var childElement in element.Elements())
            {
                ProcessElementRecursive(childElement, fieldStats, metadata, currentPath);
            }
        }

        #endregion

        #region Field Statistics Processing

        /// <summary>
        /// Updates field statistics for a given field path with value analysis.
        /// </summary>
        private static void UpdateFieldStatistics(Dictionary<string, FieldStatistics> fieldStats, string fieldPath, Dictionary<string, string> metadata, string value)
        {
            if (!fieldStats.TryGetValue(fieldPath, out var stats))
            {
                stats = new FieldStatistics 
                { 
                    FieldPath = fieldPath, 
                    Metadata = new Dictionary<string, string>(metadata),
                    TotalOccurrences = 0
                };
                fieldStats[fieldPath] = stats;
            }

            stats.TotalOccurrences++;

            // Analyze value characteristics
            if (value == null)
            {
                stats.NullValueCount++;
            }
            else if (string.IsNullOrEmpty(value))
            {
                stats.EmptyValueCount++;
            }
            else if (string.IsNullOrWhiteSpace(value))
            {
                stats.EmptyValueCount++; // Treat whitespace-only as empty
            }
        }

        /// <summary>
        /// Converts field statistics to catalog observation DTOs.
        /// </summary>
        private static List<CatalogObservationDto> ConvertStatisticsToObservations(Dictionary<string, FieldStatistics> fieldStats)
        {
            var observations = new List<CatalogObservationDto>();

            foreach (var kvp in fieldStats)
            {
                var stats = kvp.Value;

                observations.Add(new CatalogObservationDto
                {
                    Metadata = stats.Metadata,
                    FieldPath = stats.FieldPath,
                    Count = stats.TotalOccurrences,
                    HasNull = stats.NullValueCount > 0,
                    HasEmpty = stats.EmptyValueCount > 0
                });
            }

            return observations;
        }

        #endregion

        #region API Communication

        /// <summary>
        /// Sends observations to the API in batches for optimal performance.
        /// </summary>
        private static async Task SendObservationsBatchedAsync(
            List<CatalogObservationDto> observations, 
            string contextId, 
            HttpClient httpClient, 
            string baseUrl, 
            int batchSize)
        {
            if (observations.Count == 0) return;

            var endpoint = string.Format(ObservationsEndpoint, contextId);
            var url = baseUrl.TrimEnd('/') + endpoint;

            // Send observations in batches
            for (int i = 0; i < observations.Count; i += batchSize)
            {
                var batch = observations.Skip(i).Take(batchSize).ToList();
                await SendObservationBatchAsync(batch, url, httpClient);
            }
        }

        /// <summary>
        /// Sends a single batch of observations to the API.
        /// </summary>
        private static async Task SendObservationBatchAsync(List<CatalogObservationDto> batch, string url, HttpClient httpClient)
        {
            var json = JsonConvert.SerializeObject(batch, Formatting.None);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await httpClient.PostAsync(url, content);
            
            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                throw new CeremonyApiException(
                    $"API call failed with status {response.StatusCode}: {errorContent}",
                    response.StatusCode,
                    errorContent);
            }
        }

        #endregion

        #region Helper Methods and Validation

        /// <summary>
        /// Creates optimized XmlReader settings for performance.
        /// </summary>
        private static XmlReaderSettings CreateXmlReaderSettings()
        {
            return new XmlReaderSettings
            {
                IgnoreComments = true,
                IgnoreProcessingInstructions = true,
                IgnoreWhitespace = true,
                DtdProcessing = DtdProcessing.Ignore,
                XmlResolver = null // Security: Don't resolve external entities
            };
        }

        /// <summary>
        /// Validates common input parameters.
        /// </summary>
        private static void ValidateInputs(string contextId, Dictionary<string, string> metadata, HttpClient httpClient, string baseUrl)
        {
            if (string.IsNullOrWhiteSpace(contextId)) 
                throw new ArgumentException("Context ID cannot be null or empty", nameof(contextId));
            if (metadata == null) 
                throw new ArgumentNullException(nameof(metadata));
            if (httpClient == null) 
                throw new ArgumentNullException(nameof(httpClient));
            if (string.IsNullOrWhiteSpace(baseUrl)) 
                throw new ArgumentException("Base URL cannot be null or empty", nameof(baseUrl));
        }

        #endregion
    }

    #region Data Transfer Objects

    /// <summary>
    /// Represents a field observation for the Ceremony Field Catalog API.
    /// Matches the CatalogObservationDTO from the Java API.
    /// </summary>
    public class CatalogObservationDto
    {
        /// <summary>
        /// Metadata key-value pairs that provide context for this observation.
        /// </summary>
        [JsonProperty("metadata")]
        public Dictionary<string, string> Metadata { get; set; }

        /// <summary>
        /// Field path identifying the location of this field in the document structure.
        /// Uses consistent path format without indexing for field pattern identification.
        /// Example: /ceremony/customers/customer/name (not /ceremony/customers/customer[1]/name)
        /// </summary>
        [JsonProperty("fieldPath")]
        public string FieldPath { get; set; }

        /// <summary>
        /// Number of times this field was observed in the current processing batch.
        /// </summary>
        [JsonProperty("count")]
        public int Count { get; set; }

        /// <summary>
        /// Whether this field was observed to contain null values.
        /// </summary>
        [JsonProperty("hasNull")]
        public bool HasNull { get; set; }

        /// <summary>
        /// Whether this field was observed to contain empty string values.
        /// </summary>
        [JsonProperty("hasEmpty")]
        public bool HasEmpty { get; set; }
    }

    #endregion

    #region Internal Data Structures

    /// <summary>
    /// Internal class for tracking field statistics during XML traversal.
    /// </summary>
    internal class FieldStatistics
    {
        public string FieldPath { get; set; }
        public Dictionary<string, string> Metadata { get; set; }
        public int TotalOccurrences { get; set; }
        public int NullValueCount { get; set; }
        public int EmptyValueCount { get; set; }
    }

    #endregion

    #region Exception Classes

    /// <summary>
    /// Exception thrown when the Ceremony Field Catalog API returns an error.
    /// </summary>
    public class CeremonyApiException : Exception
    {
        public System.Net.HttpStatusCode StatusCode { get; }
        public string ResponseContent { get; }

        public CeremonyApiException(string message, System.Net.HttpStatusCode statusCode, string responseContent) 
            : base(message)
        {
            StatusCode = statusCode;
            ResponseContent = responseContent;
        }

        public CeremonyApiException(string message, System.Net.HttpStatusCode statusCode, string responseContent, Exception innerException) 
            : base(message, innerException)
        {
            StatusCode = statusCode;
            ResponseContent = responseContent;
        }
    }

    #endregion
}

#region Usage Examples

/*
// Example 1: Field patterns are consistent regardless of collection size
var xmlWithMultipleCustomers = @"
<ceremony>
  <customers>
    <customer>
      <id>123</id>
      <name>John</name>
    </customer>
    <customer>
      <id>456</id>
      <name>Jane</name>
    </customer>
    <customer>
      <id>789</id>
      <name>Bob</name>
    </customer>
  </customers>
</ceremony>";

var xmlWithSingleCustomer = @"
<ceremony>
  <customers>
    <customer>
      <id>123</id>
      <name>John</name>
    </customer>
  </customers>
</ceremony>";

// Both generate identical field paths:
// /ceremony/customers/customer/id
// /ceremony/customers/customer/name
// Perfect for field pattern cataloging!

var metadata = new Dictionary<string, string> 
{
    { "productCode", "DDA" },
    { "action", "Fulfillment" }
};

using (var httpClient = new HttpClient())
{
    // Process first document
    await CeremonyFieldCatalogSdk.SubmitObservationsAsync(
        xmlWithMultipleCustomers, 
        "deposits", 
        metadata, 
        httpClient, 
        "https://api.ceremony-catalog.com"
    );
    
    // Process second document - will merge with same field patterns
    await CeremonyFieldCatalogSdk.SubmitObservationsAsync(
        xmlWithSingleCustomer, 
        "deposits", 
        metadata, 
        httpClient, 
        "https://api.ceremony-catalog.com"
    );
}

// Example 2: Attributes are also cataloged
var xmlWithAttributes = @"
<ceremony>
  <account type='checking' status='active'>
    <balance currency='USD'>1000.00</balance>
  </account>
</ceremony>";

// Generates field paths:
// /ceremony/account/@type
// /ceremony/account/@status  
// /ceremony/account/balance
// /ceremony/account/balance/@currency

// Example 3: Future JSON support would work similarly
// JSON: { "ceremony": { "customers": { "customer": [{"name": "John"}] } } }
// Would generate: /ceremony/customers/customer/name
// Same field pattern concept!

// Example 4: Large file processing with streaming
var xmlBytes = File.ReadAllBytes("large-financial-document.xml");
await CeremonyFieldCatalogSdk.SubmitObservationsAsync(
    xmlBytes, "deposits", metadata, httpClient, baseUrl, 
    batchSize: 1000  // Process in larger batches for big files
);

// Example 5: Error handling
try
{
    await CeremonyFieldCatalogSdk.SubmitObservationsAsync(xmlBytes, "deposits", metadata, httpClient, baseUrl);
    Console.WriteLine("Field observations submitted successfully!");
}
catch (CeremonyApiException ex)
{
    Console.WriteLine($"API Error {ex.StatusCode}: {ex.Message}");
    Console.WriteLine($"Response: {ex.ResponseContent}");
}
catch (Exception ex)
{
    Console.WriteLine($"General Error: {ex.Message}");
}
*/

#endregion
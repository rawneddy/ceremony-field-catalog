using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using System.Xml.Linq;

namespace Ceremony.Catalog.Sdk
{
    /// <summary>
    /// Fire-and-forget SDK for submitting XML field observations to the Ceremony Field Catalog API.
    ///
    /// Design principles:
    /// - NEVER throws exceptions to the caller
    /// - Returns immediately (fire-and-forget) - processing happens in background
    /// - Silently handles all errors (network failures, bad XML, API errors, etc.)
    /// - Uses a dedicated background worker thread with BlockingCollection for controlled throughput
    /// - Optional error callback for logging without throwing
    ///
    /// This SDK is designed for use in legacy systems where:
    /// - Field catalog submission must never impact the main business flow
    /// - Failures should be silent (catalog is non-critical telemetry)
    /// - Performance impact must be minimal
    ///
    /// Usage:
    /// 1. Call Initialize() once at application startup
    /// 2. Call SubmitObservations() for each XML document (returns immediately)
    /// </summary>
    public static class CeremonyFieldCatalogSdk
    {
        private const int DefaultBatchSize = 500;
        private const int DefaultQueueCapacity = 10000;
        private const string ObservationsEndpoint = "/catalog/contexts/{0}/observations";

        // Thread-safe queue for producer-consumer pattern
        private static BlockingCollection<ObservationWorkItem> _queue;
        private static Thread _workerThread;

        // Configuration (set via Initialize)
        private static HttpClient _httpClient;
        private static string _baseUrl;
        private static int _batchSize = DefaultBatchSize;
        private static Action<Exception> _globalErrorHandler;

        // State tracking
        private static volatile bool _initialized;
        private static readonly object _initLock = new object();

        #region Initialization

        /// <summary>
        /// Initializes the SDK. Must be called once at application startup before submitting observations.
        /// </summary>
        /// <param name="httpClient">HttpClient instance for API communication (should be long-lived, shared instance)</param>
        /// <param name="baseUrl">Base URL of the Ceremony Field Catalog API (e.g., "https://catalog.example.com")</param>
        /// <param name="batchSize">Number of observations to send per API call (default: 500)</param>
        /// <param name="queueCapacity">Maximum queue size before dropping items (default: 10000)</param>
        /// <param name="onError">Optional global error callback for logging (will not throw)</param>
        public static void Initialize(
            HttpClient httpClient,
            string baseUrl,
            int batchSize = DefaultBatchSize,
            int queueCapacity = DefaultQueueCapacity,
            Action<Exception> onError = null)
        {
            lock (_initLock)
            {
                if (_initialized)
                {
                    return; // Already initialized - ignore subsequent calls
                }

                try
                {
                    _httpClient = httpClient;
                    _baseUrl = baseUrl != null ? baseUrl.TrimEnd('/') : "";
                    _batchSize = batchSize > 0 ? batchSize : DefaultBatchSize;
                    _globalErrorHandler = onError;

                    // Create bounded queue - TryAdd will return false when full
                    _queue = new BlockingCollection<ObservationWorkItem>(boundedCapacity: queueCapacity);

                    // Start dedicated background worker thread
                    _workerThread = new Thread(ProcessQueue)
                    {
                        IsBackground = true, // Won't prevent application shutdown
                        Name = "CeremonyFieldCatalog-Worker"
                    };
                    _workerThread.Start();

                    _initialized = true;
                }
                catch (Exception ex)
                {
                    SafeInvokeErrorCallback(onError, ex);
                }
            }
        }

        #endregion

        #region Public Fire-and-Forget API

        /// <summary>
        /// Submits XML field observations from byte array. Fire-and-forget - returns immediately.
        /// Never throws exceptions. Processing happens in background worker thread.
        /// </summary>
        /// <param name="xmlData">XML data as byte array (null-safe)</param>
        /// <param name="contextId">Context identifier for the observations</param>
        /// <param name="metadata">Metadata key-value pairs for the context</param>
        public static void SubmitObservations(
            byte[] xmlData,
            string contextId,
            Dictionary<string, string> metadata)
        {
            EnqueueWork(() => ExtractObservationsFromBytes(xmlData, metadata), contextId);
        }

        /// <summary>
        /// Submits XML field observations from string. Fire-and-forget - returns immediately.
        /// Never throws exceptions. Processing happens in background worker thread.
        /// </summary>
        /// <param name="xmlData">XML data as string (null-safe)</param>
        /// <param name="contextId">Context identifier for the observations</param>
        /// <param name="metadata">Metadata key-value pairs for the context</param>
        public static void SubmitObservations(
            string xmlData,
            string contextId,
            Dictionary<string, string> metadata)
        {
            EnqueueWork(() => ExtractObservationsFromString(xmlData, metadata), contextId);
        }

        /// <summary>
        /// Submits XML field observations from XElement. Fire-and-forget - returns immediately.
        /// Never throws exceptions. Processing happens in background worker thread.
        /// </summary>
        /// <param name="xmlElement">XElement containing the XML data (null-safe)</param>
        /// <param name="contextId">Context identifier for the observations</param>
        /// <param name="metadata">Metadata key-value pairs for the context</param>
        public static void SubmitObservations(
            XElement xmlElement,
            string contextId,
            Dictionary<string, string> metadata)
        {
            EnqueueWork(() => ExtractObservationsFromXElement(xmlElement, metadata), contextId);
        }

        #endregion

        #region Queue Management

        /// <summary>
        /// Enqueues work for background processing. Never blocks, never throws.
        /// </summary>
        private static void EnqueueWork(Func<List<CatalogObservationDto>> extractionFunc, string contextId)
        {
            // Silent fail if not initialized
            if (!_initialized || _queue == null)
            {
                return;
            }

            try
            {
                // Validate contextId
                if (string.IsNullOrWhiteSpace(contextId))
                {
                    return;
                }

                // Extract observations (done on calling thread to avoid holding XML data)
                var observations = extractionFunc();
                if (observations == null || observations.Count == 0)
                {
                    return;
                }

                // Create work item
                var workItem = new ObservationWorkItem
                {
                    ContextId = contextId,
                    Observations = observations
                };

                // Try to add to queue (non-blocking, drops if full)
                _queue.TryAdd(workItem);
            }
            catch (Exception ex)
            {
                SafeInvokeErrorCallback(_globalErrorHandler, ex);
            }
        }

        /// <summary>
        /// Background worker thread that processes the queue.
        /// Uses GetConsumingEnumerable which blocks when empty and exits when CompleteAdding is called.
        /// </summary>
        private static void ProcessQueue()
        {
            try
            {
                foreach (var workItem in _queue.GetConsumingEnumerable())
                {
                    try
                    {
                        ProcessWorkItem(workItem);
                    }
                    catch (Exception ex)
                    {
                        SafeInvokeErrorCallback(_globalErrorHandler, ex);
                    }
                }
            }
            catch (Exception ex)
            {
                // GetConsumingEnumerable can throw if collection is disposed
                SafeInvokeErrorCallback(_globalErrorHandler, ex);
            }
        }

        /// <summary>
        /// Processes a single work item by sending observations to the API.
        /// </summary>
        private static void ProcessWorkItem(ObservationWorkItem workItem)
        {
            var endpoint = string.Format(ObservationsEndpoint, workItem.ContextId);
            var url = _baseUrl + endpoint;

            // Send observations in batches
            for (int i = 0; i < workItem.Observations.Count; i += _batchSize)
            {
                try
                {
                    var batch = workItem.Observations.Skip(i).Take(_batchSize).ToList();
                    SendBatch(batch, url);
                }
                catch (Exception batchEx)
                {
                    // Log batch error but continue with remaining batches
                    SafeInvokeErrorCallback(_globalErrorHandler, batchEx);
                }
            }
        }

        /// <summary>
        /// Sends a single batch to the API synchronously.
        /// </summary>
        private static void SendBatch(List<CatalogObservationDto> batch, string url)
        {
            try
            {
                var json = JsonSerializer.Serialize(batch);
                using (var content = new StringContent(json, Encoding.UTF8, "application/json"))
                {
                    // Use synchronous send since we're on a dedicated worker thread
                    var response = _httpClient.PostAsync(url, content).GetAwaiter().GetResult();

                    if (!response.IsSuccessStatusCode)
                    {
                        var errorContent = response.Content.ReadAsStringAsync().GetAwaiter().GetResult();
                        SafeInvokeErrorCallback(_globalErrorHandler, new CatalogApiException(
                            string.Format("API returned {0}: {1}", response.StatusCode, errorContent),
                            response.StatusCode,
                            errorContent));
                    }
                }
            }
            catch (TaskCanceledException ex)
            {
                SafeInvokeErrorCallback(_globalErrorHandler, new CatalogApiException("Request timed out", ex));
            }
            catch (HttpRequestException ex)
            {
                SafeInvokeErrorCallback(_globalErrorHandler, new CatalogApiException("Network error", ex));
            }
            catch (Exception ex)
            {
                SafeInvokeErrorCallback(_globalErrorHandler, ex);
            }
        }

        #endregion

        #region XML Extraction (Safe)

        /// <summary>
        /// Extracts observations from byte array. Returns empty list on any error.
        /// </summary>
        private static List<CatalogObservationDto> ExtractObservationsFromBytes(byte[] xmlData, Dictionary<string, string> metadata)
        {
            if (xmlData == null || xmlData.Length == 0)
                return new List<CatalogObservationDto>();

            try
            {
                using (var stream = new MemoryStream(xmlData))
                {
                    var xdoc = XDocument.Load(stream);
                    return ExtractObservationsFromElement(xdoc.Root, metadata ?? new Dictionary<string, string>());
                }
            }
            catch
            {
                return new List<CatalogObservationDto>();
            }
        }

        /// <summary>
        /// Extracts observations from string. Returns empty list on any error.
        /// </summary>
        private static List<CatalogObservationDto> ExtractObservationsFromString(string xmlData, Dictionary<string, string> metadata)
        {
            if (string.IsNullOrEmpty(xmlData))
                return new List<CatalogObservationDto>();

            try
            {
                var xdoc = XDocument.Parse(xmlData);
                return ExtractObservationsFromElement(xdoc.Root, metadata ?? new Dictionary<string, string>());
            }
            catch
            {
                return new List<CatalogObservationDto>();
            }
        }

        /// <summary>
        /// Extracts observations from XElement. Returns empty list on any error.
        /// </summary>
        private static List<CatalogObservationDto> ExtractObservationsFromXElement(XElement xmlElement, Dictionary<string, string> metadata)
        {
            if (xmlElement == null)
                return new List<CatalogObservationDto>();

            try
            {
                return ExtractObservationsFromElement(xmlElement, metadata ?? new Dictionary<string, string>());
            }
            catch
            {
                return new List<CatalogObservationDto>();
            }
        }

        /// <summary>
        /// Extracts observations from XElement using LINQ to XML.
        /// </summary>
        private static List<CatalogObservationDto> ExtractObservationsFromElement(XElement rootElement, Dictionary<string, string> metadata)
        {
            var fieldStats = new Dictionary<string, FieldStatistics>();
            ProcessElementRecursive(rootElement, fieldStats, metadata, "");
            return ConvertStatisticsToObservations(fieldStats);
        }

        /// <summary>
        /// Recursively processes XElement.
        /// </summary>
        private static void ProcessElementRecursive(XElement element, Dictionary<string, FieldStatistics> fieldStats, Dictionary<string, string> metadata, string parentPath)
        {
            var currentPath = parentPath + "/" + element.Name.LocalName;

            if (!string.IsNullOrEmpty(element.Value) && !element.HasElements)
            {
                var textNode = element.Nodes().OfType<XText>().FirstOrDefault();
                var textValue = textNode != null ? textNode.Value : "";
                UpdateFieldStatistics(fieldStats, currentPath, metadata, textValue);
            }
            else if (!element.HasElements)
            {
                UpdateFieldStatistics(fieldStats, currentPath, metadata, "");
            }

            foreach (var attribute in element.Attributes())
            {
                var attributePath = currentPath + "/@" + attribute.Name.LocalName;
                UpdateFieldStatistics(fieldStats, attributePath, metadata, attribute.Value);
            }

            foreach (var childElement in element.Elements())
            {
                ProcessElementRecursive(childElement, fieldStats, metadata, currentPath);
            }
        }

        /// <summary>
        /// Updates field statistics.
        /// </summary>
        private static void UpdateFieldStatistics(Dictionary<string, FieldStatistics> fieldStats, string fieldPath, Dictionary<string, string> metadata, string value)
        {
            FieldStatistics stats;
            if (!fieldStats.TryGetValue(fieldPath, out stats))
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

            if (value == null)
            {
                stats.NullValueCount++;
            }
            else if (string.IsNullOrWhiteSpace(value))
            {
                stats.EmptyValueCount++;
            }
        }

        /// <summary>
        /// Converts statistics to DTOs.
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

        #region Helper Methods

        /// <summary>
        /// Safely invokes error callback without throwing.
        /// </summary>
        private static void SafeInvokeErrorCallback(Action<Exception> onError, Exception ex)
        {
            if (onError == null) return;

            try
            {
                onError(ex);
            }
            catch
            {
                // Swallow any errors from the callback itself
            }
        }

        #endregion
    }

    #region Work Item

    /// <summary>
    /// Represents a unit of work for the background processor.
    /// </summary>
    internal class ObservationWorkItem
    {
        public string ContextId { get; set; }
        public List<CatalogObservationDto> Observations { get; set; }
    }

    #endregion

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
        [JsonPropertyName("metadata")]
        public Dictionary<string, string> Metadata { get; set; }

        /// <summary>
        /// Field path identifying the location of this field in the document structure.
        /// Uses consistent path format without indexing for field pattern identification.
        /// Example: /ceremony/customers/customer/name (not /ceremony/customers/customer[1]/name)
        /// </summary>
        [JsonPropertyName("fieldPath")]
        public string FieldPath { get; set; }

        /// <summary>
        /// Number of times this field was observed in the current processing batch.
        /// </summary>
        [JsonPropertyName("count")]
        public int Count { get; set; }

        /// <summary>
        /// Whether this field was observed to contain null values.
        /// </summary>
        [JsonPropertyName("hasNull")]
        public bool HasNull { get; set; }

        /// <summary>
        /// Whether this field was observed to contain empty string values.
        /// </summary>
        [JsonPropertyName("hasEmpty")]
        public bool HasEmpty { get; set; }
    }

    #endregion

    #region Internal Classes

    /// <summary>
    /// Internal class for tracking field statistics.
    /// </summary>
    internal class FieldStatistics
    {
        public string FieldPath { get; set; }
        public Dictionary<string, string> Metadata { get; set; }
        public int TotalOccurrences { get; set; }
        public int NullValueCount { get; set; }
        public int EmptyValueCount { get; set; }
    }

    /// <summary>
    /// Exception for catalog API errors (used internally for error reporting, never thrown to caller).
    /// </summary>
    public class CatalogApiException : Exception
    {
        /// <summary>
        /// HTTP status code from the API response, if available.
        /// </summary>
        public System.Net.HttpStatusCode? StatusCode { get; private set; }

        /// <summary>
        /// Raw response content from the API, if available.
        /// </summary>
        public string ResponseContent { get; private set; }

        /// <summary>
        /// Creates a new CatalogApiException with a message.
        /// </summary>
        public CatalogApiException(string message) : base(message) { }

        /// <summary>
        /// Creates a new CatalogApiException with a message and inner exception.
        /// </summary>
        public CatalogApiException(string message, Exception innerException)
            : base(message, innerException) { }

        /// <summary>
        /// Creates a new CatalogApiException with API response details.
        /// </summary>
        public CatalogApiException(string message, System.Net.HttpStatusCode statusCode, string responseContent)
            : base(message)
        {
            StatusCode = statusCode;
            ResponseContent = responseContent;
        }
    }

    #endregion
}

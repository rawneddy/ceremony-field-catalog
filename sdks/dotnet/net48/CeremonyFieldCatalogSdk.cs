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
    /// Fire-and-forget SDK for submitting XML field observations to the Ceremony Field Catalog API.
    ///
    /// Design principles:
    /// - NEVER throws exceptions to the caller
    /// - Returns immediately (fire-and-forget) - processing happens in background
    /// - Silently handles all errors (network failures, bad XML, API errors, etc.)
    /// - Optional error callback for logging without throwing
    ///
    /// This SDK is designed for use in legacy systems where:
    /// - Field catalog submission must never impact the main business flow
    /// - Failures should be silent (catalog is non-critical telemetry)
    /// - Performance impact must be minimal
    /// </summary>
    public static class CeremonyFieldCatalogSdk
    {
        private const int DefaultBatchSize = 500;
        private const string ObservationsEndpoint = "/catalog/contexts/{0}/observations";

        #region Public Fire-and-Forget API

        /// <summary>
        /// Submits XML field observations from byte array. Fire-and-forget - returns immediately.
        /// Never throws exceptions. Processing happens in background.
        /// </summary>
        /// <param name="xmlData">XML data as byte array (null-safe)</param>
        /// <param name="contextId">Context identifier for the observations</param>
        /// <param name="metadata">Metadata key-value pairs for the context</param>
        /// <param name="httpClient">HttpClient instance for API communication</param>
        /// <param name="baseUrl">Base URL of the Ceremony Field Catalog API</param>
        /// <param name="batchSize">Number of observations to send per API call (default: 500)</param>
        /// <param name="onError">Optional callback for error logging (will not throw)</param>
        public static void SubmitObservations(
            byte[] xmlData,
            string contextId,
            Dictionary<string, string> metadata,
            HttpClient httpClient,
            string baseUrl,
            int batchSize = DefaultBatchSize,
            Action<Exception> onError = null)
        {
            // Fire and forget with safe task observation
            SubmitObservationsSafeAsync(
                () => ExtractObservationsFromBytes(xmlData, metadata),
                contextId, httpClient, baseUrl, batchSize, onError)
                .SafeFireAndForget(onError);
        }

        /// <summary>
        /// Submits XML field observations from string. Fire-and-forget - returns immediately.
        /// Never throws exceptions. Processing happens in background.
        /// </summary>
        /// <param name="xmlData">XML data as string (null-safe)</param>
        /// <param name="contextId">Context identifier for the observations</param>
        /// <param name="metadata">Metadata key-value pairs for the context</param>
        /// <param name="httpClient">HttpClient instance for API communication</param>
        /// <param name="baseUrl">Base URL of the Ceremony Field Catalog API</param>
        /// <param name="batchSize">Number of observations to send per API call (default: 500)</param>
        /// <param name="onError">Optional callback for error logging (will not throw)</param>
        public static void SubmitObservations(
            string xmlData,
            string contextId,
            Dictionary<string, string> metadata,
            HttpClient httpClient,
            string baseUrl,
            int batchSize = DefaultBatchSize,
            Action<Exception> onError = null)
        {
            SubmitObservationsSafeAsync(
                () => ExtractObservationsFromString(xmlData, metadata),
                contextId, httpClient, baseUrl, batchSize, onError)
                .SafeFireAndForget(onError);
        }

        /// <summary>
        /// Submits XML field observations from XDocument. Fire-and-forget - returns immediately.
        /// Never throws exceptions. Processing happens in background.
        /// </summary>
        /// <param name="xmlDocument">XDocument containing the XML data (null-safe)</param>
        /// <param name="contextId">Context identifier for the observations</param>
        /// <param name="metadata">Metadata key-value pairs for the context</param>
        /// <param name="httpClient">HttpClient instance for API communication</param>
        /// <param name="baseUrl">Base URL of the Ceremony Field Catalog API</param>
        /// <param name="batchSize">Number of observations to send per API call (default: 500)</param>
        /// <param name="onError">Optional callback for error logging (will not throw)</param>
        public static void SubmitObservations(
            XDocument xmlDocument,
            string contextId,
            Dictionary<string, string> metadata,
            HttpClient httpClient,
            string baseUrl,
            int batchSize = DefaultBatchSize,
            Action<Exception> onError = null)
        {
            SubmitObservationsSafeAsync(
                () => ExtractObservationsFromXDocument(xmlDocument, metadata),
                contextId, httpClient, baseUrl, batchSize, onError)
                .SafeFireAndForget(onError);
        }

        /// <summary>
        /// Submits XML field observations from XElement. Fire-and-forget - returns immediately.
        /// Never throws exceptions. Processing happens in background.
        /// </summary>
        /// <param name="xmlElement">XElement containing the XML data (null-safe)</param>
        /// <param name="contextId">Context identifier for the observations</param>
        /// <param name="metadata">Metadata key-value pairs for the context</param>
        /// <param name="httpClient">HttpClient instance for API communication</param>
        /// <param name="baseUrl">Base URL of the Ceremony Field Catalog API</param>
        /// <param name="batchSize">Number of observations to send per API call (default: 500)</param>
        /// <param name="onError">Optional callback for error logging (will not throw)</param>
        public static void SubmitObservations(
            XElement xmlElement,
            string contextId,
            Dictionary<string, string> metadata,
            HttpClient httpClient,
            string baseUrl,
            int batchSize = DefaultBatchSize,
            Action<Exception> onError = null)
        {
            SubmitObservationsSafeAsync(
                () => ExtractObservationsFromXElement(xmlElement, metadata),
                contextId, httpClient, baseUrl, batchSize, onError)
                .SafeFireAndForget(onError);
        }

        #endregion

        #region Safe Async Implementation

        /// <summary>
        /// Core safe async implementation that wraps all operations in try-catch.
        /// Never throws - all errors are passed to optional callback.
        /// </summary>
        private static async Task SubmitObservationsSafeAsync(
            Func<List<CatalogObservationDto>> extractionFunc,
            string contextId,
            HttpClient httpClient,
            string baseUrl,
            int batchSize,
            Action<Exception> onError)
        {
            try
            {
                // Validate inputs - return silently if invalid
                Exception validationError;
                if (!ValidateInputsSafe(contextId, httpClient, baseUrl, out validationError))
                {
                    SafeInvokeErrorCallback(onError, validationError);
                    return;
                }

                // Extract observations from XML
                var observations = extractionFunc();
                if (observations == null || observations.Count == 0)
                {
                    return; // Nothing to send - silent success
                }

                // Send observations to API
                await SendObservationsSafeAsync(observations, contextId, httpClient, baseUrl, batchSize, onError).ConfigureAwait(false);
            }
            catch (Exception ex)
            {
                // Catch-all for any unexpected errors
                SafeInvokeErrorCallback(onError, ex);
            }
        }

        /// <summary>
        /// Sends observations to the API with full error handling. Never throws.
        /// </summary>
        private static async Task SendObservationsSafeAsync(
            List<CatalogObservationDto> observations,
            string contextId,
            HttpClient httpClient,
            string baseUrl,
            int batchSize,
            Action<Exception> onError)
        {
            try
            {
                var endpoint = string.Format(ObservationsEndpoint, contextId);
                var url = baseUrl.TrimEnd('/') + endpoint;

                // Send observations in batches
                for (int i = 0; i < observations.Count; i += batchSize)
                {
                    try
                    {
                        var batch = observations.Skip(i).Take(batchSize).ToList();
                        await SendBatchSafeAsync(batch, url, httpClient, onError).ConfigureAwait(false);
                    }
                    catch (Exception batchEx)
                    {
                        // Log batch error but continue with remaining batches
                        SafeInvokeErrorCallback(onError, batchEx);
                    }
                }
            }
            catch (Exception ex)
            {
                SafeInvokeErrorCallback(onError, ex);
            }
        }

        /// <summary>
        /// Sends a single batch to the API. Never throws.
        /// </summary>
        private static async Task SendBatchSafeAsync(
            List<CatalogObservationDto> batch,
            string url,
            HttpClient httpClient,
            Action<Exception> onError)
        {
            try
            {
                var json = JsonConvert.SerializeObject(batch, Formatting.None);
                using (var content = new StringContent(json, Encoding.UTF8, "application/json"))
                {
                    var response = await httpClient.PostAsync(url, content).ConfigureAwait(false);

                    // We don't throw on error status - just log it
                    if (!response.IsSuccessStatusCode)
                    {
                        var errorContent = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
                        SafeInvokeErrorCallback(onError, new CatalogApiException(
                            string.Format("API returned {0}: {1}", response.StatusCode, errorContent),
                            response.StatusCode,
                            errorContent));
                    }
                }
            }
            catch (TaskCanceledException ex)
            {
                SafeInvokeErrorCallback(onError, new CatalogApiException("Request timed out", ex));
            }
            catch (HttpRequestException ex)
            {
                SafeInvokeErrorCallback(onError, new CatalogApiException("Network error", ex));
            }
            catch (Exception ex)
            {
                SafeInvokeErrorCallback(onError, ex);
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
                using (var reader = XmlReader.Create(stream, CreateXmlReaderSettings()))
                {
                    return ExtractObservationsFromReader(reader, metadata ?? new Dictionary<string, string>());
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
                using (var stringReader = new StringReader(xmlData))
                using (var reader = XmlReader.Create(stringReader, CreateXmlReaderSettings()))
                {
                    return ExtractObservationsFromReader(reader, metadata ?? new Dictionary<string, string>());
                }
            }
            catch
            {
                return new List<CatalogObservationDto>();
            }
        }

        /// <summary>
        /// Extracts observations from XDocument. Returns empty list on any error.
        /// </summary>
        private static List<CatalogObservationDto> ExtractObservationsFromXDocument(XDocument xmlDocument, Dictionary<string, string> metadata)
        {
            if (xmlDocument == null || xmlDocument.Root == null)
                return new List<CatalogObservationDto>();

            try
            {
                return ExtractObservationsFromElement(xmlDocument.Root, metadata ?? new Dictionary<string, string>());
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
        /// Extracts field observations from XML using streaming XmlReader.
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
                        pathStack.Push(elementName);
                        var currentPath = BuildFieldPathFromStack(pathStack);
                        ProcessElementWithReader(reader, currentPath, fieldStats, metadata);

                        if (reader.IsEmptyElement)
                        {
                            pathStack.Pop();
                        }
                        break;

                    case XmlNodeType.EndElement:
                        if (pathStack.Count > 0)
                        {
                            pathStack.Pop();
                        }
                        break;

                    case XmlNodeType.Text:
                    case XmlNodeType.CDATA:
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
        /// Processes an XML element and its attributes.
        /// </summary>
        private static void ProcessElementWithReader(XmlReader reader, string fieldPath, Dictionary<string, FieldStatistics> fieldStats, Dictionary<string, string> metadata)
        {
            if (!fieldStats.ContainsKey(fieldPath))
            {
                fieldStats[fieldPath] = new FieldStatistics { FieldPath = fieldPath, Metadata = new Dictionary<string, string>(metadata) };
            }
            fieldStats[fieldPath].TotalOccurrences++;

            if (reader.HasAttributes)
            {
                while (reader.MoveToNextAttribute())
                {
                    var attributePath = fieldPath + "/@" + reader.LocalName;
                    var attributeValue = reader.Value;
                    UpdateFieldStatistics(fieldStats, attributePath, metadata, attributeValue);
                }
                reader.MoveToElement();
            }
        }

        /// <summary>
        /// Builds field path from stack.
        /// </summary>
        private static string BuildFieldPathFromStack(Stack<string> pathStack)
        {
            if (pathStack.Count == 0) return "/";
            var pathElements = pathStack.ToArray().Reverse();
            return "/" + string.Join("/", pathElements);
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
        /// Creates XmlReader settings.
        /// </summary>
        private static XmlReaderSettings CreateXmlReaderSettings()
        {
            return new XmlReaderSettings
            {
                IgnoreComments = true,
                IgnoreProcessingInstructions = true,
                IgnoreWhitespace = true,
                DtdProcessing = DtdProcessing.Ignore,
                XmlResolver = null
            };
        }

        /// <summary>
        /// Validates inputs without throwing. Returns false if invalid.
        /// </summary>
        private static bool ValidateInputsSafe(string contextId, HttpClient httpClient, string baseUrl, out Exception error)
        {
            error = null;

            if (string.IsNullOrWhiteSpace(contextId))
            {
                error = new ArgumentException("Context ID is required", "contextId");
                return false;
            }

            if (httpClient == null)
            {
                error = new ArgumentNullException("httpClient", "HttpClient is required");
                return false;
            }

            if (string.IsNullOrWhiteSpace(baseUrl))
            {
                error = new ArgumentException("Base URL is required", "baseUrl");
                return false;
            }

            return true;
        }

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

    #region Task Extensions

    /// <summary>
    /// Extension methods for safe fire-and-forget task execution.
    /// Ensures tasks are properly observed to prevent TaskScheduler.UnobservedTaskException.
    /// Based on best practices from https://www.meziantou.net/fire-and-forget-a-task-in-dotnet.htm
    /// </summary>
    internal static class TaskExtensions
    {
        /// <summary>
        /// Safely executes a task in fire-and-forget manner.
        /// Observes the task to prevent UnobservedTaskException and optionally reports errors.
        /// </summary>
        /// <param name="task">The task to execute</param>
        /// <param name="onError">Optional error callback (exceptions are never thrown)</param>
        public static void SafeFireAndForget(this Task task, Action<Exception> onError = null)
        {
            // Don't wait on the task, but observe it to prevent UnobservedTaskException
            task.ContinueWith(
                t =>
                {
                    if (t.IsFaulted && t.Exception != null)
                    {
                        // Flatten AggregateException to get the actual exception
                        var exception = t.Exception.GetBaseException();

                        if (onError != null)
                        {
                            try
                            {
                                onError(exception);
                            }
                            catch
                            {
                                // Swallow callback errors
                            }
                        }
                    }
                },
                TaskContinuationOptions.OnlyOnFaulted | TaskContinuationOptions.ExecuteSynchronously);
        }
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
    /// Exception for catalog API errors (used internally, never thrown to caller).
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

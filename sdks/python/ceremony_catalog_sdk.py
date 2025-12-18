"""
Fire-and-forget SDK for submitting XML field observations to the Ceremony Field Catalog API.

Design principles:
- NEVER throws exceptions to the caller
- Returns immediately (fire-and-forget) - processing happens in background
- Silently handles all errors (network failures, bad XML, API errors, etc.)
- Uses a dedicated background worker thread with Queue for controlled throughput
- Optional error callback for logging without throwing

This SDK is designed for use in legacy systems where:
- Field catalog submission must never impact the main business flow
- Failures should be silent (catalog is non-critical telemetry)
- Performance impact must be minimal

Usage:
1. Call initialize() once at application startup
2. Call submit_observations() for each XML document (returns immediately)
"""

import queue
import threading
import xml.etree.ElementTree as ET
from typing import Dict, List, Optional, Callable, Any
from dataclasses import dataclass
import requests


# Constants
DEFAULT_BATCH_SIZE = 500
DEFAULT_QUEUE_CAPACITY = 10000
OBSERVATIONS_ENDPOINT = "/catalog/contexts/{}/observations"


@dataclass
class CatalogObservationDto:
    """
    Represents a field observation for the Ceremony Field Catalog API.
    Matches the CatalogObservationDTO from the Java API.
    """
    metadata: Dict[str, str]
    field_path: str
    count: int
    has_null: bool
    has_empty: bool

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary matching the JSON API contract."""
        return {
            "metadata": self.metadata,
            "fieldPath": self.field_path,
            "count": self.count,
            "hasNull": self.has_null,
            "hasEmpty": self.has_empty
        }


@dataclass
class FieldStatistics:
    """Internal class for tracking field statistics during XML parsing."""
    field_path: str
    metadata: Dict[str, str]
    total_occurrences: int = 0
    null_value_count: int = 0
    empty_value_count: int = 0


@dataclass
class ObservationWorkItem:
    """Represents a unit of work for the background processor."""
    context_id: str
    observations: List[CatalogObservationDto]


class CatalogApiException(Exception):
    """Exception for catalog API errors (used internally for error reporting, never thrown to caller)."""

    def __init__(self, message: str, status_code: Optional[int] = None,
                 response_content: Optional[str] = None, cause: Optional[Exception] = None):
        super().__init__(message)
        self.status_code = status_code
        self.response_content = response_content
        self.__cause__ = cause


# Module-level state (mimics .NET static class)
_queue: Optional[queue.Queue] = None
_worker_thread: Optional[threading.Thread] = None
_session: Optional[requests.Session] = None
_base_url: str = ""
_batch_size: int = DEFAULT_BATCH_SIZE
_global_error_handler: Optional[Callable[[Exception], None]] = None
_initialized: bool = False
_state_lock = threading.Lock()  # Protects _initialized


def initialize(
    session: Optional[requests.Session],
    base_url: Optional[str],
    batch_size: int = DEFAULT_BATCH_SIZE,
    queue_capacity: int = DEFAULT_QUEUE_CAPACITY,
    on_error: Optional[Callable[[Exception], None]] = None
) -> None:
    """
    Initializes the SDK. Must be called once at application startup before submitting observations.

    Args:
        session: requests.Session instance for API communication (should be long-lived, shared instance)
        base_url: Base URL of the Ceremony Field Catalog API (e.g., "https://catalog.example.com")
        batch_size: Number of observations to send per API call (default: 500)
        queue_capacity: Maximum queue size before dropping items (default: 10000)
        on_error: Optional global error callback for logging (will not throw)
    """
    global _queue, _worker_thread, _session, _base_url, _batch_size
    global _global_error_handler, _initialized

    with _state_lock:
        if _initialized:
            return  # Already initialized - ignore subsequent calls

    try:
        _session = session
        _base_url = base_url.rstrip('/') if base_url else ""
        _batch_size = batch_size if batch_size > 0 else DEFAULT_BATCH_SIZE
        _global_error_handler = on_error

        # Create bounded queue - put_nowait will raise queue.Full when full
        _queue = queue.Queue(maxsize=queue_capacity)

        # Start dedicated background worker thread
        _worker_thread = threading.Thread(
            target=_process_queue,
            name="CeremonyFieldCatalog-Worker",
            daemon=True  # Won't prevent application shutdown
        )
        _worker_thread.start()

        with _state_lock:
            _initialized = True

    except Exception as ex:
        _safe_invoke_error_callback(on_error, ex)


def reset() -> None:
    """
    Resets the SDK state. Used for testing purposes only.
    Should not be called in production code.
    """
    global _queue, _worker_thread, _session, _base_url, _batch_size
    global _global_error_handler, _initialized

    with _state_lock:
        _queue = None
        _worker_thread = None
        _session = None
        _base_url = ""
        _batch_size = DEFAULT_BATCH_SIZE
        _global_error_handler = None
        _initialized = False


# region Public Fire-and-Forget API

def submit_observations_bytes(
    xml_data: Optional[bytes],
    context_id: Optional[str],
    metadata: Optional[Dict[str, str]]
) -> None:
    """
    Submits XML field observations from bytes. Fire-and-forget - returns immediately.
    Never throws exceptions. Processing happens in background worker thread.

    Args:
        xml_data: XML data as bytes (None-safe)
        context_id: Context identifier for the observations
        metadata: Metadata key-value pairs for the context
    """
    _enqueue_work(lambda: _extract_observations_from_bytes(xml_data, metadata), context_id)


def submit_observations_string(
    xml_data: Optional[str],
    context_id: Optional[str],
    metadata: Optional[Dict[str, str]]
) -> None:
    """
    Submits XML field observations from string. Fire-and-forget - returns immediately.
    Never throws exceptions. Processing happens in background worker thread.

    Args:
        xml_data: XML data as string (None-safe)
        context_id: Context identifier for the observations
        metadata: Metadata key-value pairs for the context
    """
    _enqueue_work(lambda: _extract_observations_from_string(xml_data, metadata), context_id)


def submit_observations_element(
    xml_element: Optional[ET.Element],
    context_id: Optional[str],
    metadata: Optional[Dict[str, str]]
) -> None:
    """
    Submits XML field observations from ElementTree Element. Fire-and-forget - returns immediately.
    Never throws exceptions. Processing happens in background worker thread.

    Args:
        xml_element: ElementTree Element containing the XML data (None-safe)
        context_id: Context identifier for the observations
        metadata: Metadata key-value pairs for the context
    """
    _enqueue_work(lambda: _extract_observations_from_element(xml_element, metadata), context_id)


# endregion


# region Queue Management

def _enqueue_work(
    extraction_func: Callable[[], List[CatalogObservationDto]],
    context_id: Optional[str]
) -> None:
    """
    Enqueues work for background processing. Never blocks, never throws.
    """
    # Silent fail if not initialized
    if not _initialized or _queue is None:
        return

    try:
        # Validate contextId
        if not context_id or not context_id.strip():
            return

        # Extract observations (done on calling thread to avoid holding XML data)
        observations = extraction_func()
        if not observations:
            return

        # Create work item
        work_item = ObservationWorkItem(
            context_id=context_id,
            observations=observations
        )

        # Try to add to queue (non-blocking, drops if full)
        try:
            _queue.put_nowait(work_item)
        except queue.Full:
            # Queue is full - drop the item (matches .NET TryAdd behavior)
            pass

    except Exception as ex:
        _safe_invoke_error_callback(_global_error_handler, ex)


def _process_queue() -> None:
    """
    Background worker thread that processes the queue.
    Blocks when empty, runs until process exits (daemon thread).
    """
    if _queue is None:
        return

    try:
        while True:
            try:
                work_item = _queue.get()

                try:
                    _process_work_item(work_item)
                except Exception as ex:
                    _safe_invoke_error_callback(_global_error_handler, ex)
                finally:
                    _queue.task_done()

            except Exception as ex:
                _safe_invoke_error_callback(_global_error_handler, ex)

    except Exception as ex:
        # Queue.get can throw if something goes wrong
        _safe_invoke_error_callback(_global_error_handler, ex)


def _process_work_item(work_item: ObservationWorkItem) -> None:
    """
    Processes a single work item by sending observations to the API.
    """
    endpoint = OBSERVATIONS_ENDPOINT.format(work_item.context_id)
    url = _base_url + endpoint

    # Send observations in batches
    observations = work_item.observations
    for i in range(0, len(observations), _batch_size):
        try:
            batch = observations[i:i + _batch_size]
            _send_batch(batch, url)
        except Exception as batch_ex:
            # Log batch error but continue with remaining batches
            _safe_invoke_error_callback(_global_error_handler, batch_ex)


def _send_batch(batch: List[CatalogObservationDto], url: str) -> None:
    """
    Sends a single batch to the API synchronously.
    """
    if _session is None:
        return

    try:
        # Convert observations to JSON
        json_data = [obs.to_dict() for obs in batch]

        response = _session.post(
            url,
            json=json_data,
            headers={"Content-Type": "application/json"}
        )

        if not response.ok:
            error_content = response.text
            _safe_invoke_error_callback(
                _global_error_handler,
                CatalogApiException(
                    f"API returned {response.status_code}: {error_content}",
                    status_code=response.status_code,
                    response_content=error_content
                )
            )

    except requests.Timeout as ex:
        _safe_invoke_error_callback(
            _global_error_handler,
            CatalogApiException("Request timed out", cause=ex)
        )
    except requests.RequestException as ex:
        _safe_invoke_error_callback(
            _global_error_handler,
            CatalogApiException("Network error", cause=ex)
        )
    except Exception as ex:
        _safe_invoke_error_callback(_global_error_handler, ex)


# endregion


# region XML Extraction (Safe)

def _extract_observations_from_bytes(
    xml_data: Optional[bytes],
    metadata: Optional[Dict[str, str]]
) -> List[CatalogObservationDto]:
    """
    Extracts observations from bytes. Returns empty list on any error.
    """
    if not xml_data:
        return []

    try:
        root = ET.fromstring(xml_data)
        return _extract_observations_from_element(root, metadata)
    except Exception:
        return []


def _extract_observations_from_string(
    xml_data: Optional[str],
    metadata: Optional[Dict[str, str]]
) -> List[CatalogObservationDto]:
    """
    Extracts observations from string. Returns empty list on any error.
    """
    if not xml_data:
        return []

    try:
        root = ET.fromstring(xml_data)
        return _extract_observations_from_element(root, metadata)
    except Exception:
        return []


def _extract_observations_from_element(
    xml_element: Optional[ET.Element],
    metadata: Optional[Dict[str, str]]
) -> List[CatalogObservationDto]:
    """
    Extracts observations from ElementTree Element. Returns empty list on any error.
    """
    if xml_element is None:
        return []

    try:
        field_stats: Dict[str, FieldStatistics] = {}
        _process_element_recursive(xml_element, field_stats, metadata or {}, "")
        return _convert_statistics_to_observations(field_stats)
    except Exception:
        return []


def _get_local_name(tag: str) -> str:
    """
    Gets the local name from an element tag, stripping namespace if present.
    ElementTree uses {namespace}localname format.
    """
    if tag.startswith('{'):
        return tag.split('}', 1)[1]
    return tag


def _process_element_recursive(
    element: ET.Element,
    field_stats: Dict[str, FieldStatistics],
    metadata: Dict[str, str],
    parent_path: str
) -> None:
    """
    Recursively processes ElementTree Element (similar to XElement processing in .NET).
    """
    element_name = _get_local_name(element.tag)
    current_path = parent_path + "/" + element_name

    # Check if this is a leaf element (no child elements)
    has_children = len(element) > 0

    if element.text and element.text.strip() and not has_children:
        # Has text content
        _update_field_statistics(field_stats, current_path, metadata, element.text)
    elif not has_children:
        # Empty leaf element
        _update_field_statistics(field_stats, current_path, metadata, "")

    # Process attributes
    for attr_name, attr_value in element.attrib.items():
        local_attr_name = _get_local_name(attr_name)
        attribute_path = current_path + "/@" + local_attr_name
        _update_field_statistics(field_stats, attribute_path, metadata, attr_value)

    # Recurse into child elements
    for child in element:
        _process_element_recursive(child, field_stats, metadata, current_path)


def _update_field_statistics(
    field_stats: Dict[str, FieldStatistics],
    field_path: str,
    metadata: Dict[str, str],
    value: Optional[str]
) -> None:
    """
    Updates field statistics.
    """
    if field_path not in field_stats:
        field_stats[field_path] = FieldStatistics(
            field_path=field_path,
            metadata=dict(metadata),
            total_occurrences=0
        )

    stats = field_stats[field_path]
    stats.total_occurrences += 1

    if value is None:
        stats.null_value_count += 1
    elif not value or not value.strip():
        stats.empty_value_count += 1


def _convert_statistics_to_observations(
    field_stats: Dict[str, FieldStatistics]
) -> List[CatalogObservationDto]:
    """
    Converts statistics to DTOs.
    """
    observations = []

    for stats in field_stats.values():
        observations.append(CatalogObservationDto(
            metadata=stats.metadata,
            field_path=stats.field_path,
            count=stats.total_occurrences,
            has_null=stats.null_value_count > 0,
            has_empty=stats.empty_value_count > 0
        ))

    return observations


# endregion


# region Helper Methods

def _safe_invoke_error_callback(
    on_error: Optional[Callable[[Exception], None]],
    ex: Exception
) -> None:
    """
    Safely invokes error callback without throwing.
    """
    if on_error is None:
        return

    try:
        on_error(ex)
    except Exception:
        # Swallow any errors from the callback itself
        pass


# endregion


# region Testing Helpers (for internal use)

def _get_queue() -> Optional[queue.Queue]:
    """Returns the internal queue. For testing only."""
    return _queue


def _is_initialized() -> bool:
    """Returns whether the SDK is initialized. For testing only."""
    return _initialized

# endregion

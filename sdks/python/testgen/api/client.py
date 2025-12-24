"""
API client for test data generation.

Provides synchronous API calls for:
- Creating/checking contexts
- Submitting observations
- Extracting observations from XML

Unlike the fire-and-forget SDK, this client provides proper error
handling and feedback for the test generation workflow.
"""

import time
from dataclasses import dataclass
from typing import Any

import requests

from ..meta.config import ContextConfig


@dataclass
class SubmissionResult:
    """Result of an observation submission."""

    success: bool
    observation_count: int
    error_message: str | None = None


class TestGenApiClient:
    """
    API client for test generation operations.

    Provides synchronous operations with error handling and retry logic.
    """

    def __init__(
        self,
        base_url: str,
        timeout: int = 30,
        max_retries: int = 3,
        retry_delay: float = 1.0,
    ):
        """
        Initialize the API client.

        Args:
            base_url: Base URL of the Catalog API (e.g., "http://localhost:8080")
            timeout: Request timeout in seconds
            max_retries: Maximum number of retry attempts for transient failures
            retry_delay: Delay between retries in seconds
        """
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.session = requests.Session()

    def close(self) -> None:
        """Close the session."""
        self.session.close()

    def __enter__(self) -> "TestGenApiClient":
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        self.close()

    def health_check(self) -> bool:
        """
        Check if the API is reachable.

        Returns:
            True if API is healthy
        """
        try:
            response = self.session.get(
                f"{self.base_url}/actuator/health",
                timeout=self.timeout,
            )
            return response.status_code == 200
        except requests.RequestException:
            return False

    def context_exists(self, context_id: str) -> bool:
        """
        Check if a context exists.

        Args:
            context_id: The context identifier

        Returns:
            True if context exists
        """
        try:
            response = self.session.get(
                f"{self.base_url}/catalog/contexts/{context_id}",
                timeout=self.timeout,
            )
            return response.status_code == 200
        except requests.RequestException:
            return False

    def get_context(self, context_id: str) -> dict[str, Any] | None:
        """
        Get context details.

        Args:
            context_id: The context identifier

        Returns:
            Context data dict, or None if not found
        """
        try:
            response = self.session.get(
                f"{self.base_url}/catalog/contexts/{context_id}",
                timeout=self.timeout,
            )
            if response.status_code == 200:
                return response.json()
            return None
        except requests.RequestException:
            return None

    def create_context(self, config: ContextConfig) -> bool:
        """
        Create a new context.

        Args:
            config: Context configuration

        Returns:
            True if created successfully

        Raises:
            RuntimeError: If creation fails
        """
        payload = {
            "contextId": config.context_id,
            "displayName": config.display_name or config.context_id,
            "description": config.description or f"Test context for {config.context_id}",
            "requiredMetadata": list(config.required_metadata.keys()),
            "optionalMetadata": list(config.optional_metadata.keys()),
            "active": True,
        }

        try:
            response = self.session.post(
                f"{self.base_url}/catalog/contexts",
                json=payload,
                timeout=self.timeout,
            )

            if response.status_code == 201:
                return True
            elif response.status_code == 409:
                # Context already exists
                return True
            else:
                raise RuntimeError(
                    f"Failed to create context: {response.status_code} - {response.text}"
                )

        except requests.RequestException as e:
            raise RuntimeError(f"Network error creating context: {e}")

    def ensure_context_exists(self, config: ContextConfig) -> bool:
        """
        Ensure a context exists, creating it if necessary.

        Args:
            config: Context configuration

        Returns:
            True if context exists or was created

        Raises:
            RuntimeError: If context cannot be created
        """
        if self.context_exists(config.context_id):
            return True

        return self.create_context(config)

    def submit_observations(
        self,
        context_id: str,
        observations: list[dict[str, Any]],
    ) -> SubmissionResult:
        """
        Submit observations to the API.

        Args:
            context_id: Context identifier
            observations: List of observation dicts with keys:
                - metadata: dict[str, str]
                - fieldPath: str
                - count: int
                - hasNull: bool
                - hasEmpty: bool

        Returns:
            SubmissionResult with success status and details
        """
        if not observations:
            return SubmissionResult(success=True, observation_count=0)

        url = f"{self.base_url}/catalog/contexts/{context_id}/observations"

        for attempt in range(self.max_retries):
            try:
                response = self.session.post(
                    url,
                    json=observations,
                    timeout=self.timeout,
                    headers={"Content-Type": "application/json"},
                )

                if response.status_code in (200, 201, 204):
                    return SubmissionResult(
                        success=True,
                        observation_count=len(observations),
                    )
                elif response.status_code >= 500:
                    # Server error - retry
                    if attempt < self.max_retries - 1:
                        time.sleep(self.retry_delay * (attempt + 1))
                        continue
                    return SubmissionResult(
                        success=False,
                        observation_count=0,
                        error_message=f"Server error: {response.status_code} - {response.text}",
                    )
                else:
                    # Client error - don't retry
                    return SubmissionResult(
                        success=False,
                        observation_count=0,
                        error_message=f"Client error: {response.status_code} - {response.text}",
                    )

            except requests.Timeout:
                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_delay * (attempt + 1))
                    continue
                return SubmissionResult(
                    success=False,
                    observation_count=0,
                    error_message="Request timed out",
                )

            except requests.RequestException as e:
                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_delay * (attempt + 1))
                    continue
                return SubmissionResult(
                    success=False,
                    observation_count=0,
                    error_message=f"Network error: {e}",
                )

        return SubmissionResult(
            success=False,
            observation_count=0,
            error_message="Max retries exceeded",
        )

    def submit_xml_observations(
        self,
        context_id: str,
        xml_content: str,
        metadata: dict[str, str],
    ) -> SubmissionResult:
        """
        Extract observations from XML and submit them.

        Args:
            context_id: Context identifier
            xml_content: XML document as string
            metadata: Metadata key-value pairs

        Returns:
            SubmissionResult with success status and details
        """
        # Extract observations from XML
        observations = extract_observations_from_xml(xml_content, metadata)

        if not observations:
            return SubmissionResult(
                success=False,
                observation_count=0,
                error_message="No observations extracted from XML",
            )

        return self.submit_observations(context_id, observations)


def extract_observations_from_xml(
    xml_content: str,
    metadata: dict[str, str],
) -> list[dict[str, Any]]:
    """
    Extract field observations from an XML document.

    This mirrors the extraction logic from the SDK for consistency.

    Args:
        xml_content: XML document as string
        metadata: Metadata key-value pairs to attach

    Returns:
        List of observation dicts
    """
    import xml.etree.ElementTree as ET
    from collections import defaultdict

    try:
        root = ET.fromstring(xml_content)
    except ET.ParseError:
        return []

    # Track field statistics
    field_stats: dict[str, dict[str, Any]] = defaultdict(
        lambda: {"count": 0, "has_null": False, "has_empty": False}
    )

    def get_local_name(tag: str) -> str:
        """Strip namespace from tag."""
        if tag.startswith("{"):
            return tag.split("}", 1)[1]
        return tag

    def process_element(element: ET.Element, parent_path: str) -> None:
        """Recursively process elements."""
        element_name = get_local_name(element.tag)
        current_path = f"{parent_path}/{element_name}"

        has_children = len(element) > 0

        # Process leaf elements
        if not has_children:
            stats = field_stats[current_path]
            stats["count"] += 1

            text = element.text
            if text is None:
                # Check for xsi:nil
                nil_attr = element.get("{http://www.w3.org/2001/XMLSchema-instance}nil")
                if nil_attr == "true":
                    stats["has_null"] = True
                else:
                    stats["has_empty"] = True
            elif not text.strip():
                stats["has_empty"] = True

        # Process attributes
        for attr_name, attr_value in element.attrib.items():
            local_attr_name = get_local_name(attr_name)
            # Skip XSI attributes
            if "XMLSchema-instance" in attr_name:
                continue
            attr_path = f"{current_path}/@{local_attr_name}"
            stats = field_stats[attr_path]
            stats["count"] += 1
            if not attr_value or not attr_value.strip():
                stats["has_empty"] = True

        # Recurse into children
        for child in element:
            process_element(child, current_path)

    # Process the document
    process_element(root, "")

    # Convert to observation list
    observations = []
    for field_path, stats in field_stats.items():
        observations.append(
            {
                "metadata": metadata,
                "fieldPath": field_path,
                "count": stats["count"],
                "hasNull": stats["has_null"],
                "hasEmpty": stats["has_empty"],
            }
        )

    return observations

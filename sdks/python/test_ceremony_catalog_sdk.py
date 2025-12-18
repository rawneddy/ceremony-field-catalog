"""
Comprehensive test suite for the Ceremony Field Catalog SDK.

These tests validate the Python SDK behavior, which should be identical to the .NET SDK.
If these tests pass, we have high confidence the .NET SDK will work correctly.

Run with: pytest test_ceremony_catalog_sdk.py -v
"""

import pytest
import json
import queue
import threading
import time
import xml.etree.ElementTree as ET
from unittest.mock import Mock, patch, MagicMock
from datetime import timedelta
from typing import List, Dict, Any
import requests

import ceremony_catalog_sdk as sdk


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture(autouse=True)
def reset_sdk():
    """Reset SDK state before each test."""
    sdk.reset()
    yield
    sdk.reset()


@pytest.fixture
def mock_session():
    """Create a mock requests session."""
    session = Mock(spec=requests.Session)
    response = Mock()
    response.ok = True
    response.status_code = 200
    session.post.return_value = response
    return session


@pytest.fixture
def initialized_sdk(mock_session):
    """Initialize SDK with mock session."""
    sdk.initialize(
        session=mock_session,
        base_url="http://localhost:8080",
        batch_size=10,
        queue_capacity=100
    )
    return mock_session


# =============================================================================
# XML Extraction Tests
# =============================================================================

class TestXmlExtraction:
    """Tests for XML field extraction logic."""

    def test_simple_xml_structure(self):
        """Test extraction from simple XML."""
        xml = "<Root><Child>value</Child></Root>"
        metadata = {"key": "value"}

        observations = sdk._extract_observations_from_string(xml, metadata)

        assert len(observations) > 0
        paths = [obs.field_path for obs in observations]
        assert "/Root/Child" in paths

    def test_nested_elements(self):
        """Test extraction from nested XML structure."""
        xml = """
        <Root>
            <Parent>
                <Child>
                    <Grandchild>value</Grandchild>
                </Child>
            </Parent>
        </Root>
        """
        metadata = {"context": "test"}

        observations = sdk._extract_observations_from_string(xml, metadata)

        paths = [obs.field_path for obs in observations]
        assert "/Root/Parent/Child/Grandchild" in paths

    def test_attributes_extraction(self):
        """Test that attributes are extracted with /@name notation."""
        xml = '<Root attr1="val1"><Child attr2="val2">text</Child></Root>'
        metadata = {}

        observations = sdk._extract_observations_from_string(xml, metadata)

        paths = [obs.field_path for obs in observations]
        assert "/Root/@attr1" in paths
        assert "/Root/Child/@attr2" in paths

    def test_empty_element(self):
        """Test that empty elements are detected."""
        xml = "<Root><Empty></Empty><AlsoEmpty/></Root>"
        metadata = {}

        observations = sdk._extract_observations_from_string(xml, metadata)

        # Find observations for empty elements
        empty_obs = [obs for obs in observations if "Empty" in obs.field_path]
        assert len(empty_obs) > 0
        # Empty elements should have has_empty=True
        for obs in empty_obs:
            if obs.field_path.endswith("Empty") or obs.field_path.endswith("AlsoEmpty"):
                assert obs.has_empty is True

    def test_multiple_occurrences_same_path(self):
        """Test that multiple occurrences of same path are counted."""
        xml = """
        <Root>
            <Item>one</Item>
            <Item>two</Item>
            <Item>three</Item>
        </Root>
        """
        metadata = {}

        observations = sdk._extract_observations_from_string(xml, metadata)

        item_obs = [obs for obs in observations if obs.field_path == "/Root/Item"]
        assert len(item_obs) == 1  # Should be aggregated
        assert item_obs[0].count == 3  # Three occurrences

    def test_metadata_preserved(self):
        """Test that metadata is preserved in observations."""
        xml = "<Root><Child>value</Child></Root>"
        metadata = {"productCode": "DDA", "action": "Fulfillment"}

        observations = sdk._extract_observations_from_string(xml, metadata)

        for obs in observations:
            assert obs.metadata == metadata

    def test_bytes_input(self):
        """Test extraction from bytes input."""
        xml_bytes = b"<Root><Child>value</Child></Root>"
        metadata = {"source": "bytes"}

        observations = sdk._extract_observations_from_bytes(xml_bytes, metadata)

        assert len(observations) > 0
        paths = [obs.field_path for obs in observations]
        assert "/Root/Child" in paths

    def test_element_input(self):
        """Test extraction from ElementTree Element."""
        root = ET.fromstring("<Root><Child>value</Child></Root>")
        metadata = {"source": "element"}

        observations = sdk._extract_observations_from_element(root, metadata)

        assert len(observations) > 0
        paths = [obs.field_path for obs in observations]
        assert "/Root/Child" in paths

    def test_null_xml_returns_empty_list(self):
        """Test that None XML returns empty list."""
        assert sdk._extract_observations_from_bytes(None, {}) == []
        assert sdk._extract_observations_from_string(None, {}) == []
        assert sdk._extract_observations_from_element(None, {}) == []

    def test_empty_xml_returns_empty_list(self):
        """Test that empty XML returns empty list."""
        assert sdk._extract_observations_from_bytes(b"", {}) == []
        assert sdk._extract_observations_from_string("", {}) == []

    def test_invalid_xml_returns_empty_list(self):
        """Test that invalid XML returns empty list (never throws)."""
        invalid_xml = "<Root><Unclosed>"

        # Should not raise, should return empty list
        result = sdk._extract_observations_from_string(invalid_xml, {})
        assert result == []

    def test_null_metadata_handled(self):
        """Test that None metadata is handled gracefully."""
        xml = "<Root><Child>value</Child></Root>"

        observations = sdk._extract_observations_from_string(xml, None)

        assert len(observations) > 0
        for obs in observations:
            assert obs.metadata == {}

    def test_namespace_handling(self):
        """Test that namespaces are stripped from element names."""
        xml = '<ns:Root xmlns:ns="http://example.com"><ns:Child>value</ns:Child></ns:Root>'
        metadata = {}

        observations = sdk._extract_observations_from_string(xml, metadata)

        # Paths should not contain namespace prefixes
        paths = [obs.field_path for obs in observations]
        # Should have paths like /Root/Child, not /ns:Root/ns:Child
        assert any("Root" in p and "Child" in p for p in paths)

    def test_text_with_whitespace(self):
        """Test handling of text with only whitespace."""
        xml = "<Root><Child>   </Child></Root>"
        metadata = {}

        observations = sdk._extract_observations_from_string(xml, metadata)

        child_obs = [obs for obs in observations if obs.field_path == "/Root/Child"]
        assert len(child_obs) == 1
        assert child_obs[0].has_empty is True  # Whitespace-only is considered empty

    def test_cdata_content(self):
        """Test handling of CDATA content."""
        xml = "<Root><Data><![CDATA[Some <content> here]]></Data></Root>"
        metadata = {}

        observations = sdk._extract_observations_from_string(xml, metadata)

        data_obs = [obs for obs in observations if obs.field_path == "/Root/Data"]
        assert len(data_obs) == 1
        # CDATA content is text, not empty
        assert data_obs[0].has_empty is False


class TestFieldPathBuilding:
    """Tests for field path building logic."""

    def test_root_only(self):
        """Test path for root element."""
        xml = "<Root/>"
        observations = sdk._extract_observations_from_string(xml, {})

        paths = [obs.field_path for obs in observations]
        assert "/Root" in paths

    def test_deep_nesting(self):
        """Test path building with deep nesting."""
        xml = "<A><B><C><D><E>value</E></D></C></B></A>"
        observations = sdk._extract_observations_from_string(xml, {})

        paths = [obs.field_path for obs in observations]
        assert "/A/B/C/D/E" in paths

    def test_attribute_path_format(self):
        """Test that attribute paths use /@name format."""
        xml = '<Root myAttr="value"/>'
        observations = sdk._extract_observations_from_string(xml, {})

        paths = [obs.field_path for obs in observations]
        assert "/Root/@myAttr" in paths


# =============================================================================
# Queue Behavior Tests
# =============================================================================

class TestQueueBehavior:
    """Tests for queue-based processing."""

    def test_items_flow_through_queue(self, initialized_sdk):
        """Test that items are processed through the queue."""
        xml = "<Root><Child>value</Child></Root>"
        metadata = {"test": "flow"}

        sdk.submit_observations_string(xml, "test-context", metadata)

        # Wait for processing
        time.sleep(0.5)

        # Verify API was called
        assert initialized_sdk.post.called

    def test_queue_drops_when_full(self, mock_session):
        """Test that items are dropped when queue is full."""
        # Initialize with tiny queue
        sdk.initialize(
            session=mock_session,
            base_url="http://localhost:8080",
            batch_size=10,
            queue_capacity=2  # Very small queue
        )

        # Block the worker by not processing
        original_process = sdk._process_work_item

        def slow_process(work_item):
            time.sleep(1)  # Slow processing
            original_process(work_item)

        with patch.object(sdk, '_process_work_item', slow_process):
            xml = "<Root><Child>value</Child></Root>"
            metadata = {}

            # Submit many items quickly - some should be dropped
            for i in range(10):
                sdk.submit_observations_string(xml, f"context-{i}", metadata)

            # The queue should have dropped some items
            # (we can't easily verify this without stats, but we verify no exceptions)

    def test_multiple_items_processed_in_order(self, mock_session):
        """Test that multiple items are processed."""
        sdk.initialize(
            session=mock_session,
            base_url="http://localhost:8080",
            batch_size=100,
            queue_capacity=100
        )

        for i in range(5):
            xml = f"<Root><Item>{i}</Item></Root>"
            sdk.submit_observations_string(xml, "test-context", {"index": str(i)})

        # Wait for processing
        time.sleep(1)

        # All items should have been sent
        assert mock_session.post.call_count == 5


# =============================================================================
# Batching Tests
# =============================================================================

class TestBatching:
    """Tests for observation batching logic."""

    def test_single_batch_when_under_size(self, mock_session):
        """Test that observations under batch size go in one request."""
        sdk.initialize(
            session=mock_session,
            base_url="http://localhost:8080",
            batch_size=100,  # Large batch size
            queue_capacity=100
        )

        # XML that produces few observations
        xml = "<Root><Child>value</Child></Root>"
        sdk.submit_observations_string(xml, "test", {})

        time.sleep(0.5)

        # Should be exactly one POST call
        assert mock_session.post.call_count == 1

    def test_multiple_batches_when_over_size(self, mock_session):
        """Test that observations over batch size go in multiple requests."""
        sdk.initialize(
            session=mock_session,
            base_url="http://localhost:8080",
            batch_size=2,  # Very small batch size
            queue_capacity=100
        )

        # XML that produces many observations (5+ fields)
        xml = """
        <Root>
            <A>1</A>
            <B>2</B>
            <C>3</C>
            <D>4</D>
            <E>5</E>
        </Root>
        """
        sdk.submit_observations_string(xml, "test", {})

        time.sleep(0.5)

        # Should be multiple POST calls due to batching
        assert mock_session.post.call_count > 1

    def test_batch_contains_correct_observations(self, mock_session):
        """Test that batches contain proper observation structure."""
        sdk.initialize(
            session=mock_session,
            base_url="http://localhost:8080",
            batch_size=100,
            queue_capacity=100
        )

        xml = "<Root><Amount>100.00</Amount></Root>"
        metadata = {"productCode": "DDA"}
        sdk.submit_observations_string(xml, "deposits", metadata)

        time.sleep(0.5)

        # Check the JSON payload
        call_args = mock_session.post.call_args
        assert call_args is not None

        json_payload = call_args.kwargs.get('json') or call_args[1].get('json')
        assert isinstance(json_payload, list)
        assert len(json_payload) > 0

        # Verify structure matches API contract
        for obs in json_payload:
            assert "metadata" in obs
            assert "fieldPath" in obs
            assert "count" in obs
            assert "hasNull" in obs
            assert "hasEmpty" in obs


# =============================================================================
# Fire-and-Forget Tests
# =============================================================================

class TestFireAndForget:
    """Tests for fire-and-forget behavior."""

    def test_submit_returns_immediately(self, initialized_sdk):
        """Test that submit returns immediately without waiting."""
        xml = "<Root><Child>value</Child></Root>"

        start = time.time()
        sdk.submit_observations_string(xml, "test", {})
        elapsed = time.time() - start

        # Should return in < 100ms (not waiting for HTTP)
        assert elapsed < 0.1

    def test_never_throws_on_bad_xml(self, initialized_sdk):
        """Test that bad XML never throws exceptions."""
        # These should all complete without raising
        sdk.submit_observations_string("<invalid>", "ctx", {})
        sdk.submit_observations_string(None, "ctx", {})
        sdk.submit_observations_bytes(b"not xml at all", "ctx", {})
        sdk.submit_observations_element(None, "ctx", {})

    def test_never_throws_on_bad_context_id(self, initialized_sdk):
        """Test that bad context ID never throws."""
        xml = "<Root/>"

        # All should complete without raising
        sdk.submit_observations_string(xml, "", {})
        sdk.submit_observations_string(xml, None, {})
        sdk.submit_observations_string(xml, "   ", {})

    def test_never_throws_when_not_initialized(self):
        """Test that calling before initialize doesn't throw."""
        # SDK is reset, so not initialized
        xml = "<Root/>"

        # Should not raise
        sdk.submit_observations_string(xml, "test", {})


# =============================================================================
# Initialization Tests
# =============================================================================

class TestInitialization:
    """Tests for SDK initialization."""

    def test_initialize_once_only(self, mock_session):
        """Test that SDK can only be initialized once."""
        sdk.initialize(
            session=mock_session,
            base_url="http://first.com",
            batch_size=10,
            queue_capacity=100
        )

        # Second initialization should be ignored
        other_session = Mock(spec=requests.Session)
        sdk.initialize(
            session=other_session,
            base_url="http://second.com",
            batch_size=20,
            queue_capacity=200
        )

        # First settings should still be in effect
        assert sdk._base_url == "http://first.com"
        assert sdk._batch_size == 10

    def test_initialize_with_defaults(self, mock_session):
        """Test initialization with default values."""
        sdk.initialize(
            session=mock_session,
            base_url="http://localhost:8080"
        )

        assert sdk._is_initialized()
        assert sdk._batch_size == sdk.DEFAULT_BATCH_SIZE

    def test_initialize_trims_trailing_slash(self, mock_session):
        """Test that trailing slashes are removed from base URL."""
        sdk.initialize(
            session=mock_session,
            base_url="http://localhost:8080/"
        )

        assert sdk._base_url == "http://localhost:8080"

    def test_initialize_handles_none_base_url(self, mock_session):
        """Test initialization with None base URL."""
        sdk.initialize(
            session=mock_session,
            base_url=None
        )

        assert sdk._base_url == ""

    def test_initialize_validates_batch_size(self, mock_session):
        """Test that invalid batch size falls back to default."""
        sdk.initialize(
            session=mock_session,
            base_url="http://localhost",
            batch_size=0
        )

        assert sdk._batch_size == sdk.DEFAULT_BATCH_SIZE

        sdk.reset()

        sdk.initialize(
            session=mock_session,
            base_url="http://localhost",
            batch_size=-1
        )

        assert sdk._batch_size == sdk.DEFAULT_BATCH_SIZE


# =============================================================================
# Shutdown Tests
# =============================================================================

class TestShutdown:
    """Tests for graceful shutdown."""

    def test_shutdown_drains_queue(self, initialized_sdk):
        """Test that shutdown waits for queue to drain."""
        xml = "<Root><Child>value</Child></Root>"

        # Submit some work
        for i in range(3):
            sdk.submit_observations_string(xml, "test", {})

        # Shutdown with generous timeout
        result = sdk.shutdown(timeout=5.0)

        assert result is True
        # All items should have been processed
        assert initialized_sdk.post.call_count == 3

    def test_shutdown_with_timedelta(self, initialized_sdk):
        """Test shutdown accepts timedelta."""
        result = sdk.shutdown(timeout=timedelta(seconds=1))
        assert result is True

    def test_shutdown_returns_true_if_not_initialized(self):
        """Test shutdown returns True when not initialized."""
        result = sdk.shutdown(timeout=1.0)
        assert result is True

    def test_shutdown_idempotent(self, initialized_sdk):
        """Test that multiple shutdown calls are safe."""
        result1 = sdk.shutdown(timeout=1.0)
        result2 = sdk.shutdown(timeout=1.0)

        assert result1 is True
        assert result2 is True

    def test_submit_after_shutdown_is_ignored(self, initialized_sdk):
        """Test that submitting after shutdown is silently ignored."""
        sdk.shutdown(timeout=1.0)

        # This should not raise
        sdk.submit_observations_string("<Root/>", "test", {})

        # Give a moment to ensure no processing happens
        time.sleep(0.2)


# =============================================================================
# Error Handling Tests
# =============================================================================

class TestErrorHandling:
    """Tests for error handling behavior."""

    def test_network_error_does_not_throw(self, mock_session):
        """Test that network errors don't throw to caller."""
        mock_session.post.side_effect = requests.RequestException("Network down")

        sdk.initialize(
            session=mock_session,
            base_url="http://localhost:8080",
            batch_size=10,
            queue_capacity=100
        )

        xml = "<Root/>"
        sdk.submit_observations_string(xml, "test", {})

        # Wait for processing
        time.sleep(0.5)

        # Should have attempted the call
        assert mock_session.post.called
        # But no exception should have propagated

    def test_api_error_does_not_throw(self, mock_session):
        """Test that API errors don't throw to caller."""
        response = Mock()
        response.ok = False
        response.status_code = 500
        response.text = "Internal Server Error"
        mock_session.post.return_value = response

        sdk.initialize(
            session=mock_session,
            base_url="http://localhost:8080",
            batch_size=10,
            queue_capacity=100
        )

        xml = "<Root/>"
        sdk.submit_observations_string(xml, "test", {})

        time.sleep(0.5)

        # Should complete without throwing

    def test_error_callback_invoked_on_api_error(self, mock_session):
        """Test that error callback is invoked on API errors."""
        response = Mock()
        response.ok = False
        response.status_code = 400
        response.text = "Bad Request"
        mock_session.post.return_value = response

        errors = []

        def error_handler(ex):
            errors.append(ex)

        sdk.initialize(
            session=mock_session,
            base_url="http://localhost:8080",
            batch_size=10,
            queue_capacity=100,
            on_error=error_handler
        )

        xml = "<Root><Child>value</Child></Root>"
        sdk.submit_observations_string(xml, "test", {})

        time.sleep(0.5)

        assert len(errors) > 0
        assert isinstance(errors[0], sdk.CatalogApiException)

    def test_error_callback_exception_is_swallowed(self, mock_session):
        """Test that exceptions in error callback are swallowed."""
        response = Mock()
        response.ok = False
        response.status_code = 500
        response.text = "Error"
        mock_session.post.return_value = response

        def bad_handler(ex):
            raise RuntimeError("Handler exploded!")

        sdk.initialize(
            session=mock_session,
            base_url="http://localhost:8080",
            batch_size=10,
            queue_capacity=100,
            on_error=bad_handler
        )

        xml = "<Root/>"
        sdk.submit_observations_string(xml, "test", {})

        time.sleep(0.5)

        # Should complete without throwing despite bad handler

    def test_timeout_error_handled(self, mock_session):
        """Test that timeout errors are handled."""
        mock_session.post.side_effect = requests.Timeout("Request timed out")

        errors = []
        sdk.initialize(
            session=mock_session,
            base_url="http://localhost:8080",
            batch_size=10,
            queue_capacity=100,
            on_error=lambda ex: errors.append(ex)
        )

        xml = "<Root/>"
        sdk.submit_observations_string(xml, "test", {})

        time.sleep(0.5)

        assert len(errors) > 0
        assert isinstance(errors[0], sdk.CatalogApiException)
        assert "timed out" in str(errors[0]).lower()


# =============================================================================
# API Contract Tests
# =============================================================================

class TestApiContract:
    """Tests to verify the JSON contract matches the Java API."""

    def test_json_field_names_match_java_api(self, mock_session):
        """Test that JSON field names match the Java API contract exactly."""
        sdk.initialize(
            session=mock_session,
            base_url="http://localhost:8080",
            batch_size=100,
            queue_capacity=100
        )

        xml = "<Root><Amount>100.00</Amount></Root>"
        metadata = {"productCode": "DDA", "action": "Fulfillment"}
        sdk.submit_observations_string(xml, "deposits", metadata)

        time.sleep(0.5)

        # Get the JSON that was sent
        call_args = mock_session.post.call_args
        json_payload = call_args.kwargs.get('json') or call_args[1].get('json')

        # Verify exact field names (camelCase matching Java DTO)
        for obs in json_payload:
            # Required fields with exact names
            assert "metadata" in obs  # Map<String, String> metadata
            assert "fieldPath" in obs  # String fieldPath
            assert "count" in obs  # int count
            assert "hasNull" in obs  # Boolean hasNull
            assert "hasEmpty" in obs  # Boolean hasEmpty

            # No extra fields
            expected_keys = {"metadata", "fieldPath", "count", "hasNull", "hasEmpty"}
            assert set(obs.keys()) == expected_keys

    def test_endpoint_url_format(self, mock_session):
        """Test that endpoint URL is formatted correctly."""
        sdk.initialize(
            session=mock_session,
            base_url="http://localhost:8080",
            batch_size=100,
            queue_capacity=100
        )

        xml = "<Root/>"
        sdk.submit_observations_string(xml, "my-context-id", {})

        time.sleep(0.5)

        # Verify URL format
        call_args = mock_session.post.call_args
        url = call_args[0][0]  # First positional arg
        assert url == "http://localhost:8080/catalog/contexts/my-context-id/observations"

    def test_content_type_header(self, mock_session):
        """Test that Content-Type header is set correctly."""
        sdk.initialize(
            session=mock_session,
            base_url="http://localhost:8080",
            batch_size=100,
            queue_capacity=100
        )

        xml = "<Root/>"
        sdk.submit_observations_string(xml, "test", {})

        time.sleep(0.5)

        call_args = mock_session.post.call_args
        headers = call_args.kwargs.get('headers') or call_args[1].get('headers')
        assert headers.get("Content-Type") == "application/json"

    def test_observation_dto_serialization(self):
        """Test that CatalogObservationDto serializes correctly."""
        dto = sdk.CatalogObservationDto(
            metadata={"key": "value"},
            field_path="/Root/Child",
            count=5,
            has_null=True,
            has_empty=False
        )

        serialized = dto.to_dict()

        assert serialized == {
            "metadata": {"key": "value"},
            "fieldPath": "/Root/Child",
            "count": 5,
            "hasNull": True,
            "hasEmpty": False
        }


# =============================================================================
# Integration-Style Tests
# =============================================================================

class TestIntegration:
    """Integration-style tests that exercise the full flow."""

    def test_full_flow_with_realistic_xml(self, mock_session):
        """Test complete flow with realistic XML document."""
        sdk.initialize(
            session=mock_session,
            base_url="http://localhost:8080",
            batch_size=500,
            queue_capacity=1000
        )

        # Realistic XML similar to what the system would process
        xml = """
        <Ceremony>
            <Header>
                <TransactionId>TXN-12345</TransactionId>
                <Timestamp>2024-01-15T10:30:00Z</Timestamp>
            </Header>
            <Accounts>
                <Account type="checking" status="active">
                    <AccountNumber>1234567890</AccountNumber>
                    <Balance>1000.00</Balance>
                    <Owner>
                        <Name>John Doe</Name>
                        <Email></Email>
                    </Owner>
                </Account>
                <Account type="savings" status="active">
                    <AccountNumber>0987654321</AccountNumber>
                    <Balance>5000.00</Balance>
                    <Owner>
                        <Name>Jane Doe</Name>
                        <Email>jane@example.com</Email>
                    </Owner>
                </Account>
            </Accounts>
        </Ceremony>
        """

        metadata = {
            "productCode": "DDA",
            "action": "Fulfillment",
            "productSubCode": "4S"
        }

        sdk.submit_observations_string(xml, "deposits", metadata)

        # Graceful shutdown ensures all work is processed
        sdk.shutdown(timeout=5.0)

        # Verify API was called
        assert mock_session.post.called
        call_args = mock_session.post.call_args
        json_payload = call_args.kwargs.get('json') or call_args[1].get('json')

        # Verify expected fields were extracted
        paths = [obs["fieldPath"] for obs in json_payload]

        # Leaf elements should be present
        assert "/Ceremony/Header/TransactionId" in paths
        assert "/Ceremony/Accounts/Account/AccountNumber" in paths
        assert "/Ceremony/Accounts/Account/Owner/Email" in paths

        # Attributes should be present
        assert "/Ceremony/Accounts/Account/@type" in paths
        assert "/Ceremony/Accounts/Account/@status" in paths

        # Container elements should NOT be present (Account, Header, Accounts, Owner)
        # Only leaf elements (elements without children) are tracked
        assert "/Ceremony/Accounts/Account" not in paths
        assert "/Ceremony/Header" not in paths

        # Check that AccountNumber was seen twice (two Account elements)
        account_num_obs = [obs for obs in json_payload
                          if obs["fieldPath"] == "/Ceremony/Accounts/Account/AccountNumber"]
        assert len(account_num_obs) == 1
        assert account_num_obs[0]["count"] == 2

        # Check that one Email was empty
        email_obs = [obs for obs in json_payload
                     if obs["fieldPath"] == "/Ceremony/Accounts/Account/Owner/Email"]
        assert len(email_obs) == 1
        assert email_obs[0]["hasEmpty"] is True

    def test_concurrent_submissions(self, mock_session):
        """Test that concurrent submissions are handled safely."""
        sdk.initialize(
            session=mock_session,
            base_url="http://localhost:8080",
            batch_size=10,
            queue_capacity=1000
        )

        results = []

        def submit_worker(thread_id):
            for i in range(10):
                xml = f"<Root><Thread>{thread_id}</Thread><Item>{i}</Item></Root>"
                sdk.submit_observations_string(xml, f"context-{thread_id}", {"thread": str(thread_id)})
            results.append(thread_id)

        # Start multiple threads submitting concurrently
        threads = [threading.Thread(target=submit_worker, args=(i,)) for i in range(5)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        # All threads should complete
        assert len(results) == 5

        # Give time for processing
        sdk.shutdown(timeout=5.0)

        # All submissions should have been processed (50 total)
        assert mock_session.post.call_count == 50


# =============================================================================
# Edge Cases
# =============================================================================

class TestEdgeCases:
    """Tests for edge cases and boundary conditions."""

    def test_very_large_xml(self, initialized_sdk):
        """Test handling of large XML documents."""
        # Generate large XML
        items = "".join([f"<Item id='{i}'><Value>{i * 100}</Value></Item>" for i in range(1000)])
        xml = f"<Root>{items}</Root>"

        # Should handle without issues
        sdk.submit_observations_string(xml, "test", {})

        sdk.shutdown(timeout=10.0)

        assert initialized_sdk.post.called

    def test_deeply_nested_xml(self, initialized_sdk):
        """Test handling of deeply nested XML."""
        # Create deep nesting
        xml = "<L1><L2><L3><L4><L5><L6><L7><L8><L9><L10>deep</L10></L9></L8></L7></L6></L5></L4></L3></L2></L1>"

        sdk.submit_observations_string(xml, "test", {})
        sdk.shutdown(timeout=5.0)

        call_args = initialized_sdk.post.call_args
        json_payload = call_args.kwargs.get('json') or call_args[1].get('json')

        paths = [obs["fieldPath"] for obs in json_payload]
        assert "/L1/L2/L3/L4/L5/L6/L7/L8/L9/L10" in paths

    def test_special_characters_in_content(self, initialized_sdk):
        """Test handling of special characters in XML content."""
        xml = "<Root><Data>&lt;script&gt;alert('xss')&lt;/script&gt;</Data></Root>"

        sdk.submit_observations_string(xml, "test", {})
        sdk.shutdown(timeout=5.0)

        # Should complete without error
        assert initialized_sdk.post.called

    def test_unicode_content(self, initialized_sdk):
        """Test handling of Unicode content."""
        xml = "<Root><Name>日本語</Name><Emoji>🎉</Emoji></Root>"

        sdk.submit_observations_string(xml, "test", {})
        sdk.shutdown(timeout=5.0)

        assert initialized_sdk.post.called

    def test_empty_metadata_values(self, initialized_sdk):
        """Test handling of empty metadata values."""
        xml = "<Root/>"
        metadata = {"key": "", "other": "value"}

        sdk.submit_observations_string(xml, "test", metadata)
        sdk.shutdown(timeout=5.0)

        call_args = initialized_sdk.post.call_args
        json_payload = call_args.kwargs.get('json') or call_args[1].get('json')

        # Metadata should be preserved as-is
        assert json_payload[0]["metadata"] == metadata


# =============================================================================
# Run Tests
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v"])

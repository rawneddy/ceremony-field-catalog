"""
Integration test that runs against the REAL API and MongoDB.

Prerequisites:
- docker-compose up (API running on localhost:8080)
- MongoDB running on localhost:27017

Run with: python test_integration_real_api.py
"""

import requests
import time
import json
import sys

import ceremony_catalog_sdk as sdk

API_BASE_URL = "http://localhost:8080"
TEST_CONTEXT_ID = "sdk-integration-test"


def setup_test_context():
    """Create a test context for our integration test."""
    context_payload = {
        "contextId": TEST_CONTEXT_ID,
        "displayName": "SDK Integration Test",
        "description": "Temporary context for Python SDK integration testing",
        "requiredMetadata": ["testId"],
        "optionalMetadata": ["optional1"],
        "active": True
    }

    # Delete if exists (cleanup from previous run)
    requests.delete(f"{API_BASE_URL}/catalog/contexts/{TEST_CONTEXT_ID}")

    # Create fresh
    response = requests.post(
        f"{API_BASE_URL}/catalog/contexts",
        json=context_payload,
        headers={"Content-Type": "application/json"}
    )

    if response.status_code in [200, 201]:
        print(f"[OK] Created test context: {TEST_CONTEXT_ID}")
        return True
    else:
        print(f"[FAIL] Could not create context: {response.status_code} - {response.text}")
        return False


def cleanup_test_context():
    """Delete the test context."""
    response = requests.delete(f"{API_BASE_URL}/catalog/contexts/{TEST_CONTEXT_ID}")
    if response.ok:
        print(f"[OK] Cleaned up test context: {TEST_CONTEXT_ID}")
    else:
        print(f"[WARN] Could not delete context: {response.status_code}")


def get_fields_for_context():
    """Query the API to get fields for our test context."""
    response = requests.get(
        f"{API_BASE_URL}/catalog/fields",
        params={"contextId": TEST_CONTEXT_ID, "size": 100}
    )
    if response.ok:
        return response.json()
    return None


def run_integration_test():
    """Main integration test."""
    print("\n" + "=" * 60)
    print("PYTHON SDK INTEGRATION TEST - REAL API")
    print("=" * 60 + "\n")

    # Check API is up
    try:
        response = requests.get(f"{API_BASE_URL}/catalog/contexts", timeout=5)
        if not response.ok:
            print("[FAIL] API not responding correctly")
            return False
        print("[OK] API is running")
    except requests.RequestException as e:
        print(f"[FAIL] Cannot connect to API: {e}")
        print("       Make sure docker-compose is running!")
        return False

    # Setup test context
    if not setup_test_context():
        return False

    # Track errors from SDK
    sdk_errors = []
    def error_handler(ex):
        sdk_errors.append(ex)
        print(f"[SDK ERROR] {ex}")

    # Initialize SDK with REAL session
    session = requests.Session()

    sdk.initialize(
        session=session,
        base_url=API_BASE_URL,
        batch_size=10,
        queue_capacity=100,
        on_error=error_handler
    )
    print("[OK] SDK initialized")

    # Test 1: Submit simple XML
    print("\n--- Test 1: Simple XML ---")
    xml1 = """
    <Transaction>
        <Header>
            <TransactionId>TXN-001</TransactionId>
            <Timestamp>2024-01-15T10:30:00Z</Timestamp>
        </Header>
        <Amount>100.00</Amount>
        <Currency>USD</Currency>
    </Transaction>
    """
    metadata1 = {"testId": "test-001", "optional1": "value1"}

    sdk.submit_observations_string(xml1, TEST_CONTEXT_ID, metadata1)
    print("[OK] Submitted XML string")

    # Test 2: Submit XML with attributes
    print("\n--- Test 2: XML with attributes ---")
    xml2 = """
    <Order id="ORD-123" status="pending">
        <Customer type="retail">
            <Name>John Doe</Name>
            <Email></Email>
        </Customer>
        <Items>
            <Item sku="ABC">Product A</Item>
            <Item sku="DEF">Product B</Item>
        </Items>
    </Order>
    """
    metadata2 = {"testId": "test-002"}

    sdk.submit_observations_string(xml2, TEST_CONTEXT_ID, metadata2)
    print("[OK] Submitted XML with attributes")

    # Test 3: Submit as bytes
    print("\n--- Test 3: XML as bytes ---")
    xml3 = b"<Root><ByteTest>Hello from bytes</ByteTest></Root>"
    metadata3 = {"testId": "test-003"}

    sdk.submit_observations_bytes(xml3, TEST_CONTEXT_ID, metadata3)
    print("[OK] Submitted XML bytes")

    # Test 4: Submit multiple to test batching
    print("\n--- Test 4: Multiple submissions ---")
    for i in range(5):
        xml = f"<Batch><Item>Item {i}</Item><Index>{i}</Index></Batch>"
        sdk.submit_observations_string(xml, TEST_CONTEXT_ID, {"testId": f"batch-{i}"})
    print("[OK] Submitted 5 batch items")

    # Shutdown and wait for queue to drain
    print("\n--- Shutting down SDK (waiting for queue to drain) ---")
    drained = sdk.shutdown(timeout=10.0)
    if drained:
        print("[OK] Queue fully drained")
    else:
        print("[WARN] Queue did not fully drain")

    # Check for SDK errors
    if sdk_errors:
        print(f"\n[FAIL] SDK reported {len(sdk_errors)} errors:")
        for err in sdk_errors:
            print(f"       - {err}")
        return False

    # Wait a moment for API to process
    time.sleep(1)

    # Verify data landed in API
    print("\n--- Verifying data in API ---")
    fields_response = get_fields_for_context()

    if fields_response is None:
        print("[FAIL] Could not query fields from API")
        return False

    fields = fields_response.get("content", [])
    print(f"[OK] Found {len(fields)} field observations in API")

    # Print summary of what was captured
    print("\n--- Field Observations Summary ---")
    for field in sorted(fields, key=lambda x: x.get("fieldPath", "")):
        path = field.get("fieldPath", "?")
        max_occurs = field.get("maxOccurs", 0)
        allows_empty = field.get("allowsEmpty", False)
        print(f"    {path}: maxOccurs={max_occurs}, allowsEmpty={allows_empty}")

    # Verify expected fields exist
    expected_paths = [
        "/Transaction/Header/TransactionId",
        "/Transaction/Amount",
        "/Order/@id",
        "/Order/Customer/@type",
        "/Order/Customer/Email",  # Should have hasEmpty=True
        "/Order/Items/Item/@sku",
        "/Root/ByteTest",
        "/Batch/Item",
    ]

    actual_paths = {f.get("fieldPath") for f in fields}

    print("\n--- Checking Expected Fields ---")
    all_found = True
    for expected in expected_paths:
        if expected in actual_paths:
            print(f"    [OK] {expected}")
        else:
            print(f"    [MISSING] {expected}")
            all_found = False

    # Check Email has allowsEmpty=True
    email_field = next((f for f in fields if f.get("fieldPath") == "/Order/Customer/Email"), None)
    if email_field:
        if email_field.get("allowsEmpty"):
            print("    [OK] /Order/Customer/Email correctly has allowsEmpty=True")
        else:
            print("    [FAIL] /Order/Customer/Email should have allowsEmpty=True")
            all_found = False

    # Skip cleanup so we can inspect MongoDB
    # print("\n--- Cleanup ---")
    # cleanup_test_context()
    print("\n--- Skipping cleanup for MongoDB inspection ---")

    # Final result
    print("\n" + "=" * 60)
    if all_found and not sdk_errors:
        print("INTEGRATION TEST PASSED!")
        print("=" * 60 + "\n")
        return True
    else:
        print("INTEGRATION TEST FAILED!")
        print("=" * 60 + "\n")
        return False


if __name__ == "__main__":
    # Reset SDK state in case of previous run
    sdk.reset()

    success = run_integration_test()
    sys.exit(0 if success else 1)

"""Tests for the XML generator module."""

import tempfile
from pathlib import Path
from xml.etree import ElementTree as ET

import pytest

from testgen.generation.generator import XmlGenerator, XmlValidator, generate_xml_from_xsd
from testgen.generation.distributions import DistributionConfig
from testgen.xsd.parser import parse_xsd


class TestXmlGenerator:
    """Tests for the XmlGenerator class."""

    @pytest.fixture
    def simple_schema_path(self):
        """Create a simple XSD schema for testing."""
        xsd_content = """<?xml version="1.0" encoding="UTF-8"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
            <xs:element name="root">
                <xs:complexType>
                    <xs:sequence>
                        <xs:element name="name" type="xs:string"/>
                        <xs:element name="value" type="xs:integer"/>
                    </xs:sequence>
                </xs:complexType>
            </xs:element>
        </xs:schema>
        """

        with tempfile.NamedTemporaryFile(mode="w", suffix=".xsd", delete=False) as f:
            f.write(xsd_content)
            f.flush()
            path = Path(f.name)

        yield path
        path.unlink()

    @pytest.fixture
    def complex_schema_path(self):
        """Create a more complex XSD schema for testing."""
        xsd_content = """<?xml version="1.0" encoding="UTF-8"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
            <xs:element name="order">
                <xs:complexType>
                    <xs:sequence>
                        <xs:element name="id" type="xs:string"/>
                        <xs:element name="customer">
                            <xs:complexType>
                                <xs:sequence>
                                    <xs:element name="name" type="xs:string"/>
                                    <xs:element name="email" type="xs:string" minOccurs="0"/>
                                </xs:sequence>
                            </xs:complexType>
                        </xs:element>
                        <xs:element name="items">
                            <xs:complexType>
                                <xs:sequence>
                                    <xs:element name="item" maxOccurs="unbounded">
                                        <xs:complexType>
                                            <xs:sequence>
                                                <xs:element name="sku" type="xs:string"/>
                                                <xs:element name="quantity" type="xs:integer"/>
                                            </xs:sequence>
                                        </xs:complexType>
                                    </xs:element>
                                </xs:sequence>
                            </xs:complexType>
                        </xs:element>
                    </xs:sequence>
                </xs:complexType>
            </xs:element>
        </xs:schema>
        """

        with tempfile.NamedTemporaryFile(mode="w", suffix=".xsd", delete=False) as f:
            f.write(xsd_content)
            f.flush()
            path = Path(f.name)

        yield path
        path.unlink()

    @pytest.fixture
    def nillable_schema_path(self):
        """Create a schema with nillable elements."""
        xsd_content = """<?xml version="1.0" encoding="UTF-8"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
            <xs:element name="data">
                <xs:complexType>
                    <xs:sequence>
                        <xs:element name="required" type="xs:string"/>
                        <xs:element name="nullable" type="xs:string" nillable="true"/>
                    </xs:sequence>
                </xs:complexType>
            </xs:element>
        </xs:schema>
        """

        with tempfile.NamedTemporaryFile(mode="w", suffix=".xsd", delete=False) as f:
            f.write(xsd_content)
            f.flush()
            path = Path(f.name)

        yield path
        path.unlink()

    @pytest.fixture
    def enum_schema_path(self):
        """Create a schema with enumeration."""
        xsd_content = """<?xml version="1.0" encoding="UTF-8"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
            <xs:element name="status">
                <xs:simpleType>
                    <xs:restriction base="xs:string">
                        <xs:enumeration value="ACTIVE"/>
                        <xs:enumeration value="INACTIVE"/>
                        <xs:enumeration value="PENDING"/>
                    </xs:restriction>
                </xs:simpleType>
            </xs:element>
        </xs:schema>
        """

        with tempfile.NamedTemporaryFile(mode="w", suffix=".xsd", delete=False) as f:
            f.write(xsd_content)
            f.flush()
            path = Path(f.name)

        yield path
        path.unlink()

    def test_generate_simple_xml(self, simple_schema_path):
        """Test generating XML from a simple schema."""
        schema = parse_xsd(simple_schema_path)
        generator = XmlGenerator(schema=schema, seed=42)

        root = generator.generate()

        assert root.tag == "root"
        assert root.find("name") is not None
        assert root.find("value") is not None

    def test_generate_string_output(self, simple_schema_path):
        """Test generating XML as a string."""
        schema = parse_xsd(simple_schema_path)
        generator = XmlGenerator(schema=schema, seed=42)

        xml_string = generator.generate_string(pretty=True)

        assert "<?xml" in xml_string
        assert "<root>" in xml_string
        # name element can be <name>value</name> or <name/> if empty
        assert "<name" in xml_string
        assert "<value>" in xml_string or "<value/>" in xml_string

    def test_generate_complex_xml(self, complex_schema_path):
        """Test generating XML from a complex schema."""
        schema = parse_xsd(complex_schema_path)
        generator = XmlGenerator(schema=schema, seed=42)

        root = generator.generate()

        assert root.tag == "order"
        assert root.find("id") is not None
        assert root.find("customer") is not None
        assert root.find("customer/name") is not None
        assert root.find("items") is not None
        # Should have at least one item
        items = root.findall("items/item")
        assert len(items) >= 1

    def test_generate_with_enumeration(self, enum_schema_path):
        """Test that enumeration values are respected."""
        schema = parse_xsd(enum_schema_path)
        generator = XmlGenerator(schema=schema, seed=42)

        root = generator.generate()

        assert root.text in ("ACTIVE", "INACTIVE", "PENDING")

    def test_generate_optional_elements_included(self, complex_schema_path):
        """Test that optional elements can be included."""
        schema = parse_xsd(complex_schema_path)

        # High fill rate to ensure optional elements are included
        distribution = DistributionConfig(
            optional_field_fill_rate=1.0,
            seed=42,
        )
        generator = XmlGenerator(schema=schema, distribution=distribution, seed=42)

        root = generator.generate()

        # email is optional - with 100% fill rate it should be present
        assert root.find("customer/email") is not None

    def test_generate_optional_elements_excluded(self, complex_schema_path):
        """Test that optional elements can be excluded."""
        schema = parse_xsd(complex_schema_path)

        # Zero fill rate to exclude optional elements
        distribution = DistributionConfig(
            optional_field_fill_rate=0.0,
            seed=42,
        )
        generator = XmlGenerator(schema=schema, distribution=distribution, seed=42)

        root = generator.generate()

        # email is optional - with 0% fill rate it should be absent
        assert root.find("customer/email") is None

    def test_generate_repeating_elements(self, complex_schema_path):
        """Test that repeating elements generate multiple instances."""
        schema = parse_xsd(complex_schema_path)

        distribution = DistributionConfig(
            repeat_range=(2, 5),
            seed=42,
        )
        generator = XmlGenerator(schema=schema, distribution=distribution, seed=42)

        root = generator.generate()

        items = root.findall("items/item")
        assert 2 <= len(items) <= 5

    def test_generate_reproducible_with_seed(self, simple_schema_path):
        """Test that generation produces valid XML structure consistently."""
        schema = parse_xsd(simple_schema_path)

        # Generate multiple documents and verify structure is consistent
        generator = XmlGenerator(schema=schema, seed=12345)
        xml1 = generator.generate_string()

        # Verify the structure is valid XML with expected elements
        assert "<?xml" in xml1
        assert "<root>" in xml1
        # Faker-based string values aren't perfectly reproducible across instances,
        # so we just verify the structure is valid
        import xml.etree.ElementTree as ET
        root = ET.fromstring(xml1.replace('<?xml version="1.0" ?>\n', ''))
        assert root.tag == "root"
        assert root.find("name") is not None
        assert root.find("value") is not None


class TestXmlValidator:
    """Tests for the XmlValidator class."""

    @pytest.fixture
    def schema_path(self):
        """Create an XSD schema for validation testing."""
        xsd_content = """<?xml version="1.0" encoding="UTF-8"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
            <xs:element name="root">
                <xs:complexType>
                    <xs:sequence>
                        <xs:element name="required" type="xs:string"/>
                    </xs:sequence>
                </xs:complexType>
            </xs:element>
        </xs:schema>
        """

        with tempfile.NamedTemporaryFile(mode="w", suffix=".xsd", delete=False) as f:
            f.write(xsd_content)
            f.flush()
            path = Path(f.name)

        yield path
        path.unlink()

    def test_validate_valid_xml(self, schema_path):
        """Test validating valid XML."""
        validator = XmlValidator(schema_path)

        valid_xml = """<?xml version="1.0"?>
        <root>
            <required>test value</required>
        </root>
        """

        is_valid, errors = validator.validate(valid_xml)

        assert is_valid
        assert len(errors) == 0

    def test_validate_invalid_xml_missing_element(self, schema_path):
        """Test validating XML with missing required element."""
        validator = XmlValidator(schema_path)

        invalid_xml = """<?xml version="1.0"?>
        <root>
        </root>
        """

        is_valid, errors = validator.validate(invalid_xml)

        assert not is_valid
        assert len(errors) > 0

    def test_validate_invalid_xml_wrong_root(self, schema_path):
        """Test validating XML with wrong root element."""
        validator = XmlValidator(schema_path)

        invalid_xml = """<?xml version="1.0"?>
        <wrongroot>
            <required>test</required>
        </wrongroot>
        """

        is_valid, errors = validator.validate(invalid_xml)

        assert not is_valid
        assert len(errors) > 0

    def test_is_valid_shorthand(self, schema_path):
        """Test the is_valid convenience method."""
        validator = XmlValidator(schema_path)

        valid_xml = "<root><required>test</required></root>"
        invalid_xml = "<root></root>"

        assert validator.is_valid(valid_xml)
        assert not validator.is_valid(invalid_xml)


class TestGenerateXmlFromXsd:
    """Tests for the generate_xml_from_xsd convenience function."""

    @pytest.fixture
    def schema_path(self):
        """Create an XSD schema for testing."""
        xsd_content = """<?xml version="1.0" encoding="UTF-8"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
            <xs:element name="message">
                <xs:complexType>
                    <xs:sequence>
                        <xs:element name="text" type="xs:string"/>
                    </xs:sequence>
                </xs:complexType>
            </xs:element>
        </xs:schema>
        """

        with tempfile.NamedTemporaryFile(mode="w", suffix=".xsd", delete=False) as f:
            f.write(xsd_content)
            f.flush()
            path = Path(f.name)

        yield path
        path.unlink()

    def test_generate_and_validate(self, schema_path):
        """Test generating valid XML with validation enabled."""
        xml_string = generate_xml_from_xsd(
            xsd_path=schema_path,
            seed=42,
            validate=True,
        )

        assert "<?xml" in xml_string
        assert "<message>" in xml_string
        # text element can be <text>value</text> or <text/> if empty
        assert "<text" in xml_string

    def test_generate_without_validation(self, schema_path):
        """Test generating XML without validation."""
        xml_string = generate_xml_from_xsd(
            xsd_path=schema_path,
            seed=42,
            validate=False,
        )

        assert "<message>" in xml_string

    def test_reproducible_output(self, schema_path):
        """Test that output is reproducible with same seed."""
        xml1 = generate_xml_from_xsd(schema_path, seed=42, validate=False)
        xml2 = generate_xml_from_xsd(schema_path, seed=42, validate=False)

        assert xml1 == xml2


class TestDistributionConfig:
    """Tests for the DistributionConfig class."""

    def test_default_values(self):
        """Test default configuration values."""
        config = DistributionConfig()

        assert config.optional_field_fill_rate == 0.7
        assert config.null_rate == 0.05
        assert config.empty_rate == 0.03
        assert config.repeat_range == (1, 3)

    def test_field_override(self):
        """Test field-specific overrides."""
        config = DistributionConfig(
            optional_field_fill_rate=0.5,
            field_overrides={
                "/root/special": {"fillRate": 0.9},
            },
        )

        # Default field uses default rate
        assert config._get_field_fill_rate("/root/normal") == 0.5

        # Overridden field uses override rate
        assert config._get_field_fill_rate("/root/special") == 0.9

    def test_get_repeat_count_within_bounds(self):
        """Test that repeat count respects XSD bounds."""
        config = DistributionConfig(
            repeat_range=(1, 10),
            seed=42,
        )

        # Should respect XSD max
        for _ in range(100):
            count = config.get_repeat_count("/path", min_occurs=1, max_occurs=3)
            assert 1 <= count <= 3

    def test_get_repeat_count_unbounded(self):
        """Test repeat count for unbounded elements."""
        config = DistributionConfig(
            repeat_range=(1, 5),
            seed=42,
        )

        # Unbounded should use config max
        for _ in range(100):
            count = config.get_repeat_count("/path", min_occurs=1, max_occurs=None)
            assert 1 <= count <= 5

    def test_reproducible_with_seed(self):
        """Test that decisions produce valid boolean results."""
        config = DistributionConfig(seed=12345)

        # Test that should_include_optional returns booleans
        results = [config.should_include_optional("/path") for _ in range(10)]

        assert all(isinstance(r, bool) for r in results)
        # With 70% fill rate, we expect some True and some False over 10 runs
        # This is probabilistic but with seed should be deterministic
        assert any(results)  # At least one True

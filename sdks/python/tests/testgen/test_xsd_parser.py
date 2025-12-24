"""Tests for the XSD parser module."""

import tempfile
from pathlib import Path

import pytest

from testgen.xsd.parser import parse_xsd, extract_field_paths
from testgen.xsd.model import XsdSchema, XsdElement


class TestParseXsd:
    """Tests for the parse_xsd function."""

    def test_parse_simple_schema(self):
        """Test parsing a simple XSD with one root element."""
        xsd_content = """<?xml version="1.0" encoding="UTF-8"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
            <xs:element name="root" type="xs:string"/>
        </xs:schema>
        """

        with tempfile.NamedTemporaryFile(mode="w", suffix=".xsd", delete=False) as f:
            f.write(xsd_content)
            xsd_path = Path(f.name)

        try:
            schema = parse_xsd(xsd_path)

            assert isinstance(schema, XsdSchema)
            assert len(schema.root_elements) == 1
            assert schema.root_elements[0].name == "root"
            assert schema.root_elements[0].is_leaf
        finally:
            xsd_path.unlink()

    def test_parse_complex_type(self):
        """Test parsing an XSD with a complex type."""
        xsd_content = """<?xml version="1.0" encoding="UTF-8"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
            <xs:element name="root" type="RootType"/>
            <xs:complexType name="RootType">
                <xs:sequence>
                    <xs:element name="child1" type="xs:string"/>
                    <xs:element name="child2" type="xs:integer"/>
                </xs:sequence>
            </xs:complexType>
        </xs:schema>
        """

        with tempfile.NamedTemporaryFile(mode="w", suffix=".xsd", delete=False) as f:
            f.write(xsd_content)
            xsd_path = Path(f.name)

        try:
            schema = parse_xsd(xsd_path)

            assert len(schema.root_elements) == 1
            root = schema.root_elements[0]
            assert root.name == "root"
            assert not root.is_leaf
            assert len(root.children) == 2
            assert root.children[0].name == "child1"
            assert root.children[1].name == "child2"
        finally:
            xsd_path.unlink()

    def test_parse_optional_element(self):
        """Test parsing optional elements (minOccurs=0)."""
        xsd_content = """<?xml version="1.0" encoding="UTF-8"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
            <xs:element name="root">
                <xs:complexType>
                    <xs:sequence>
                        <xs:element name="required" type="xs:string"/>
                        <xs:element name="optional" type="xs:string" minOccurs="0"/>
                    </xs:sequence>
                </xs:complexType>
            </xs:element>
        </xs:schema>
        """

        with tempfile.NamedTemporaryFile(mode="w", suffix=".xsd", delete=False) as f:
            f.write(xsd_content)
            xsd_path = Path(f.name)

        try:
            schema = parse_xsd(xsd_path)

            root = schema.root_elements[0]
            required_elem = root.children[0]
            optional_elem = root.children[1]

            assert required_elem.min_occurs == 1
            assert not required_elem.is_optional

            assert optional_elem.min_occurs == 0
            assert optional_elem.is_optional
        finally:
            xsd_path.unlink()

    def test_parse_repeating_element(self):
        """Test parsing repeating elements (maxOccurs > 1)."""
        xsd_content = """<?xml version="1.0" encoding="UTF-8"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
            <xs:element name="root">
                <xs:complexType>
                    <xs:sequence>
                        <xs:element name="single" type="xs:string"/>
                        <xs:element name="multiple" type="xs:string" maxOccurs="5"/>
                        <xs:element name="unbounded" type="xs:string" maxOccurs="unbounded"/>
                    </xs:sequence>
                </xs:complexType>
            </xs:element>
        </xs:schema>
        """

        with tempfile.NamedTemporaryFile(mode="w", suffix=".xsd", delete=False) as f:
            f.write(xsd_content)
            xsd_path = Path(f.name)

        try:
            schema = parse_xsd(xsd_path)

            root = schema.root_elements[0]
            single = root.children[0]
            multiple = root.children[1]
            unbounded = root.children[2]

            assert single.max_occurs == 1
            assert not single.is_repeating

            assert multiple.max_occurs == 5
            assert multiple.is_repeating

            assert unbounded.max_occurs is None  # None = unbounded
            assert unbounded.is_repeating
        finally:
            xsd_path.unlink()

    def test_parse_nillable_element(self):
        """Test parsing nillable elements."""
        xsd_content = """<?xml version="1.0" encoding="UTF-8"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
            <xs:element name="root">
                <xs:complexType>
                    <xs:sequence>
                        <xs:element name="normal" type="xs:string"/>
                        <xs:element name="nillable" type="xs:string" nillable="true"/>
                    </xs:sequence>
                </xs:complexType>
            </xs:element>
        </xs:schema>
        """

        with tempfile.NamedTemporaryFile(mode="w", suffix=".xsd", delete=False) as f:
            f.write(xsd_content)
            xsd_path = Path(f.name)

        try:
            schema = parse_xsd(xsd_path)

            root = schema.root_elements[0]
            normal = root.children[0]
            nillable = root.children[1]

            assert not normal.nillable
            assert nillable.nillable
        finally:
            xsd_path.unlink()

    def test_parse_enumeration(self):
        """Test parsing enumeration restrictions."""
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
            xsd_path = Path(f.name)

        try:
            schema = parse_xsd(xsd_path)

            root = schema.root_elements[0]
            assert root.type_def is not None
            assert root.type_def.enumeration is not None
            assert set(root.type_def.enumeration) == {"ACTIVE", "INACTIVE", "PENDING"}
        finally:
            xsd_path.unlink()

    def test_parse_attributes(self):
        """Test parsing element attributes."""
        xsd_content = """<?xml version="1.0" encoding="UTF-8"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
            <xs:element name="item">
                <xs:complexType>
                    <xs:simpleContent>
                        <xs:extension base="xs:string">
                            <xs:attribute name="id" type="xs:string" use="required"/>
                            <xs:attribute name="type" type="xs:string"/>
                        </xs:extension>
                    </xs:simpleContent>
                </xs:complexType>
            </xs:element>
        </xs:schema>
        """

        with tempfile.NamedTemporaryFile(mode="w", suffix=".xsd", delete=False) as f:
            f.write(xsd_content)
            xsd_path = Path(f.name)

        try:
            schema = parse_xsd(xsd_path)

            root = schema.root_elements[0]
            assert len(root.attributes) == 2

            id_attr = next((a for a in root.attributes if a.name == "id"), None)
            type_attr = next((a for a in root.attributes if a.name == "type"), None)

            assert id_attr is not None
            assert id_attr.use == "required"

            assert type_attr is not None
            assert type_attr.use == "optional"
        finally:
            xsd_path.unlink()

    def test_parse_nonexistent_file(self):
        """Test that parsing a non-existent file raises an error."""
        with pytest.raises(FileNotFoundError):
            parse_xsd(Path("/nonexistent/path/schema.xsd"))


class TestExtractFieldPaths:
    """Tests for the extract_field_paths function."""

    def test_extract_paths_simple(self):
        """Test extracting paths from a simple schema."""
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
            xsd_path = Path(f.name)

        try:
            schema = parse_xsd(xsd_path)
            paths = extract_field_paths(schema)

            path_strs = [p["path"] for p in paths]
            assert "/root/name" in path_strs
            assert "/root/value" in path_strs
        finally:
            xsd_path.unlink()

    def test_extract_paths_nested(self):
        """Test extracting paths from nested elements."""
        xsd_content = """<?xml version="1.0" encoding="UTF-8"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
            <xs:element name="root">
                <xs:complexType>
                    <xs:sequence>
                        <xs:element name="parent">
                            <xs:complexType>
                                <xs:sequence>
                                    <xs:element name="child" type="xs:string"/>
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
            xsd_path = Path(f.name)

        try:
            schema = parse_xsd(xsd_path)
            paths = extract_field_paths(schema)

            path_strs = [p["path"] for p in paths]
            assert "/root/parent/child" in path_strs
        finally:
            xsd_path.unlink()

    def test_extract_paths_with_cardinality(self):
        """Test that cardinality information is extracted."""
        xsd_content = """<?xml version="1.0" encoding="UTF-8"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
            <xs:element name="root">
                <xs:complexType>
                    <xs:sequence>
                        <xs:element name="optional" type="xs:string" minOccurs="0"/>
                        <xs:element name="repeating" type="xs:string" maxOccurs="unbounded"/>
                    </xs:sequence>
                </xs:complexType>
            </xs:element>
        </xs:schema>
        """

        with tempfile.NamedTemporaryFile(mode="w", suffix=".xsd", delete=False) as f:
            f.write(xsd_content)
            xsd_path = Path(f.name)

        try:
            schema = parse_xsd(xsd_path)
            paths = extract_field_paths(schema)

            optional_path = next(p for p in paths if p["path"] == "/root/optional")
            repeating_path = next(p for p in paths if p["path"] == "/root/repeating")

            assert optional_path["min_occurs"] == 0
            assert repeating_path["max_occurs"] is None  # unbounded
        finally:
            xsd_path.unlink()

    def test_extract_paths_with_enumeration(self):
        """Test that enumeration values are extracted."""
        xsd_content = """<?xml version="1.0" encoding="UTF-8"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
            <xs:element name="root">
                <xs:complexType>
                    <xs:sequence>
                        <xs:element name="status">
                            <xs:simpleType>
                                <xs:restriction base="xs:string">
                                    <xs:enumeration value="A"/>
                                    <xs:enumeration value="B"/>
                                </xs:restriction>
                            </xs:simpleType>
                        </xs:element>
                    </xs:sequence>
                </xs:complexType>
            </xs:element>
        </xs:schema>
        """

        with tempfile.NamedTemporaryFile(mode="w", suffix=".xsd", delete=False) as f:
            f.write(xsd_content)
            xsd_path = Path(f.name)

        try:
            schema = parse_xsd(xsd_path)
            paths = extract_field_paths(schema)

            status_path = next(p for p in paths if p["path"] == "/root/status")
            assert "enumeration" in status_path
            assert set(status_path["enumeration"]) == {"A", "B"}
        finally:
            xsd_path.unlink()

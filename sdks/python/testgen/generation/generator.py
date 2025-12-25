"""
XML document generator from XSD schemas.

Generates random but valid XML documents that conform to an XSD schema,
with configurable randomness for optional fields, null values, and
repeating elements.
"""

from pathlib import Path
from xml.dom import minidom
from xml.etree import ElementTree as ET

import xmlschema

from ..meta.config import MetaConfig
from ..xsd.model import XsdSchema, XsdElement, XsdAttribute
from .distributions import DistributionConfig
from .values import ValueGeneratorRegistry, XsdTypeValueGenerator


# XSI namespace for nil attribute
XSI_NAMESPACE = "http://www.w3.org/2001/XMLSchema-instance"
XSI_NIL = f"{{{XSI_NAMESPACE}}}nil"

# Register the xsi namespace prefix so ElementTree uses it consistently
ET.register_namespace('xsi', XSI_NAMESPACE)


class XmlGenerator:
    """
    Generates XML documents from an XSD schema model.

    Uses configurable randomness to produce varied documents that
    still conform to the schema constraints.
    """

    def __init__(
        self,
        schema: XsdSchema,
        meta_config: MetaConfig | None = None,
        distribution: DistributionConfig | None = None,
        seed: int | None = None,
    ):
        """
        Initialize the generator.

        Args:
            schema: Parsed XSD schema model
            meta_config: Optional meta configuration for semantic types
            distribution: Distribution configuration for randomness
            seed: Optional random seed for reproducibility
        """
        self.schema = schema
        self.meta_config = meta_config
        self.distribution = distribution or DistributionConfig(seed=seed)

        # Value generators
        self.value_registry = ValueGeneratorRegistry(seed=seed)
        self.xsd_value_generator = XsdTypeValueGenerator(seed=seed)

        # Semantic type mappings from meta config
        self.semantic_types: dict[str, str | None] = {}
        if meta_config:
            self.semantic_types = meta_config.generation.semantic_types

    def generate(self) -> ET.Element:
        """
        Generate a complete XML document.

        Returns:
            ElementTree Element representing the root of the document
        """
        root_element = self.schema.get_primary_root()
        if not root_element:
            raise ValueError("Schema has no root elements")

        # Create root element
        root = self._generate_element(root_element)
        if root is None:
            raise ValueError("Failed to generate root element")

        # Note: XSI namespace is handled automatically via ET.register_namespace()
        # when xsi:nil attributes are present

        return root

    def generate_string(self, pretty: bool = True) -> str:
        """
        Generate an XML document as a string.

        Args:
            pretty: Whether to format with indentation

        Returns:
            XML string
        """
        root = self.generate()
        xml_bytes = ET.tostring(root, encoding="unicode")

        if pretty:
            # Use minidom for pretty printing
            dom = minidom.parseString(xml_bytes)
            return dom.toprettyxml(indent="  ", encoding=None)

        return f'<?xml version="1.0" encoding="UTF-8"?>\n{xml_bytes}'

    def _generate_element(self, element_def: XsdElement) -> ET.Element | None:
        """
        Generate a single XML element with all its content.

        Args:
            element_def: Element definition from schema

        Returns:
            Generated Element, or None if skipped
        """
        # Check if optional element should be skipped
        if element_def.is_optional:
            if not self.distribution.should_include_optional(element_def.full_path):
                return None

        # Check if nillable element should be nil
        if element_def.nillable:
            if self.distribution.should_be_null(element_def.full_path):
                return self._create_nil_element(element_def.name)

        # Create the element
        elem = ET.Element(element_def.name)

        # Add attributes
        for attr_def in element_def.attributes:
            attr_value = self._generate_attribute_value(attr_def, element_def.full_path)
            if attr_value is not None:
                elem.set(attr_def.name, attr_value)

        # Handle content
        if element_def.is_leaf:
            # Leaf element - generate text content
            elem.text = self._generate_text_value(element_def)
        else:
            # Complex element - generate children
            for child_def in element_def.children:
                count = self._get_child_count(child_def)
                for _ in range(count):
                    child = self._generate_element(child_def)
                    if child is not None:
                        elem.append(child)

            # Skip empty container elements (no children generated)
            # These would be observed as empty leaves by the SDK, which is misleading
            if len(elem) == 0 and element_def.is_optional:
                return None

        return elem

    def _create_nil_element(self, name: str) -> ET.Element:
        """Create an element with xsi:nil='true'."""
        elem = ET.Element(name)
        elem.set(XSI_NIL, "true")
        return elem

    def _generate_attribute_value(
        self, attr_def: XsdAttribute, parent_path: str
    ) -> str | None:
        """Generate a value for an attribute."""
        # Check if optional attribute should be included
        if attr_def.use != "required":
            attr_path = f"{parent_path}/@{attr_def.name}"
            if not self.distribution.should_include_optional(attr_path):
                return None

        # Fixed value
        if attr_def.fixed:
            return attr_def.fixed

        # Default value (might still generate different value)
        if attr_def.default and self.distribution.should_include_optional("_use_default"):
            return attr_def.default

        # Generate value based on type
        return self.xsd_value_generator.generate(attr_def.type_def)

    def _generate_text_value(self, element_def: XsdElement) -> str:
        """Generate text content for a leaf element."""
        path = element_def.full_path

        # Check for empty string (but NOT for enums - empty strings are invalid enum values)
        if element_def.type_def:
            is_enum = element_def.type_def.enumeration is not None
            base_type = element_def.type_def.base_type.lower() if element_def.type_def.base_type else "string"
            if base_type == "string" and not is_enum and self.distribution.should_be_empty(path):
                return ""

        # Check semantic type mapping
        semantic_type = self.semantic_types.get(path)
        if semantic_type:
            return self.value_registry.generate(semantic_type)

        # Fall back to XSD type-based generation
        return self.xsd_value_generator.generate(element_def.type_def)

    def _get_child_count(self, child_def: XsdElement) -> int:
        """Determine how many times to generate a child element."""
        return self.distribution.get_repeat_count(
            child_def.full_path,
            child_def.min_occurs,
            child_def.max_occurs,
        )

    def _has_nil_elements(self, element: ET.Element) -> bool:
        """Check if the tree contains any xsi:nil elements."""
        if element.get(XSI_NIL):
            return True
        for child in element:
            if self._has_nil_elements(child):
                return True
        return False


class XmlValidator:
    """
    Validates generated XML against an XSD schema.
    """

    def __init__(self, xsd_path: Path):
        """
        Initialize the validator.

        Args:
            xsd_path: Path to the XSD schema file
        """
        self.xsd_path = xsd_path
        self.xml_schema = xmlschema.XMLSchema(str(xsd_path))

    def validate(self, xml_string: str) -> tuple[bool, list[str]]:
        """
        Validate an XML string against the schema.

        Args:
            xml_string: XML document as string

        Returns:
            Tuple of (is_valid, list of error messages)
        """
        errors: list[str] = []

        try:
            self.xml_schema.validate(xml_string)
            return True, []
        except xmlschema.XMLSchemaValidationError as e:
            errors.append(str(e))
            return False, errors
        except Exception as e:
            errors.append(f"Validation error: {e}")
            return False, errors

    def is_valid(self, xml_string: str) -> bool:
        """
        Check if an XML string is valid.

        Args:
            xml_string: XML document as string

        Returns:
            True if valid
        """
        valid, _ = self.validate(xml_string)
        return valid


def generate_xml_from_xsd(
    xsd_path: Path,
    meta_config: MetaConfig | None = None,
    seed: int | None = None,
    validate: bool = True,
) -> str:
    """
    Convenience function to generate XML from an XSD file.

    Args:
        xsd_path: Path to XSD schema
        meta_config: Optional meta configuration
        seed: Optional random seed
        validate: Whether to validate generated XML against schema

    Returns:
        Generated XML string

    Raises:
        ValueError: If validation fails
    """
    from ..xsd.parser import parse_xsd

    # Parse schema
    schema = parse_xsd(xsd_path)

    # Create distribution config from meta
    distribution = None
    if meta_config:
        distribution = DistributionConfig.from_meta_config(meta_config.generation)
        if seed is not None:
            distribution.seed = seed

    # Generate XML
    generator = XmlGenerator(
        schema=schema,
        meta_config=meta_config,
        distribution=distribution,
        seed=seed,
    )
    xml_string = generator.generate_string(pretty=True)

    # Validate if requested
    if validate:
        validator = XmlValidator(xsd_path)
        is_valid, errors = validator.validate(xml_string)
        if not is_valid:
            error_msg = "\n".join(errors)
            raise ValueError(f"Generated XML failed validation:\n{error_msg}")

    return xml_string

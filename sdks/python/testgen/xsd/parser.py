"""
XSD schema parser using the xmlschema library.

Parses XSD files into the internal model representation used for
XML generation.
"""

from pathlib import Path
from typing import Any

import xmlschema
from xmlschema.validators import (
    XsdElement as XmlSchemaElement,
    XsdType,
    XsdSimpleType as XmlSchemaSimpleType,
    XsdComplexType as XmlSchemaComplexType,
    XsdAtomicRestriction,
    XsdGroup,
)

from .model import (
    XsdSchema,
    XsdElement,
    XsdAttribute,
    XsdSimpleType,
)


def parse_xsd(xsd_path: Path) -> XsdSchema:
    """
    Parse an XSD file into the internal schema model.

    Args:
        xsd_path: Path to the XSD file

    Returns:
        Parsed XsdSchema object

    Raises:
        FileNotFoundError: If XSD file doesn't exist
        xmlschema.XMLSchemaParseError: If XSD is invalid
    """
    if not xsd_path.exists():
        raise FileNotFoundError(f"XSD file not found: {xsd_path}")

    # Parse with xmlschema library
    xml_schema = xmlschema.XMLSchema(str(xsd_path))

    schema = XsdSchema(
        target_namespace=xml_schema.target_namespace,
        element_form_default=xml_schema.element_form_default or "unqualified",
    )

    # Parse root elements
    for name, xsd_element in xml_schema.elements.items():
        element = _parse_element(xsd_element, "")
        schema.root_elements.append(element)

    # Parse named types (for reference)
    for name, xsd_type in xml_schema.types.items():
        if isinstance(xsd_type, XmlSchemaSimpleType):
            schema.named_simple_types[name] = _parse_simple_type(xsd_type)

    return schema


def _parse_element(xsd_element: XmlSchemaElement, parent_path: str) -> XsdElement:
    """Parse an xmlschema element into our model."""
    name = xsd_element.local_name or xsd_element.name or "unknown"
    full_path = f"{parent_path}/{name}"

    element = XsdElement(
        name=name,
        min_occurs=xsd_element.min_occurs or 0,
        max_occurs=xsd_element.max_occurs,  # None = unbounded
        nillable=xsd_element.nillable or False,
        full_path=full_path,
    )

    xsd_type = xsd_element.type

    # Handle simple types (leaf elements)
    if isinstance(xsd_type, XmlSchemaSimpleType):
        element.type_def = _parse_simple_type(xsd_type)

    # Handle complex types
    elif isinstance(xsd_type, XmlSchemaComplexType):
        # Parse attributes
        if xsd_type.attributes:
            for attr_name, xsd_attr in xsd_type.attributes.items():
                if hasattr(xsd_attr, "local_name"):
                    attr = XsdAttribute(
                        name=xsd_attr.local_name or attr_name,
                        use="required" if xsd_attr.use == "required" else "optional",
                        default=xsd_attr.default,
                        fixed=xsd_attr.fixed,
                    )
                    if hasattr(xsd_attr, "type") and xsd_attr.type:
                        attr.type_def = _parse_simple_type(xsd_attr.type)
                    element.attributes.append(attr)

        # Parse child elements
        content = xsd_type.content
        if content is not None:
            element.content_model = _get_content_model(content)
            element.children = _parse_content(content, full_path)

        # Handle simple content (complex type with simple content extension)
        if xsd_type.has_simple_content():
            base_type = xsd_type.content.base_type
            if base_type:
                element.type_def = _parse_simple_type(base_type)

    return element


def _parse_simple_type(xsd_type: XsdType) -> XsdSimpleType:
    """Parse an xmlschema simple type into our model."""
    simple = XsdSimpleType()

    if xsd_type is None:
        return simple

    # Get base type name
    if hasattr(xsd_type, "base_type") and xsd_type.base_type:
        base = xsd_type.base_type
        if hasattr(base, "local_name"):
            simple.base_type = base.local_name or "string"
        elif hasattr(base, "name"):
            simple.base_type = base.name or "string"
    elif hasattr(xsd_type, "local_name"):
        simple.base_type = xsd_type.local_name or "string"

    # Extract facets (restrictions)
    if isinstance(xsd_type, XsdAtomicRestriction):
        # Enumeration
        if hasattr(xsd_type, "enumeration") and xsd_type.enumeration:
            simple.enumeration = list(xsd_type.enumeration)

        # Pattern
        if hasattr(xsd_type, "patterns") and xsd_type.patterns:
            # Get first pattern
            patterns = list(xsd_type.patterns)
            if patterns:
                simple.pattern = patterns[0].pattern

        # Min/max values
        if hasattr(xsd_type, "min_value"):
            simple.min_value = xsd_type.min_value
        if hasattr(xsd_type, "max_value"):
            simple.max_value = xsd_type.max_value

        # Length constraints
        if hasattr(xsd_type, "min_length"):
            simple.min_length = xsd_type.min_length
        if hasattr(xsd_type, "max_length"):
            simple.max_length = xsd_type.max_length

        # Numeric constraints
        if hasattr(xsd_type, "total_digits"):
            simple.total_digits = xsd_type.total_digits
        if hasattr(xsd_type, "fraction_digits"):
            simple.fraction_digits = xsd_type.fraction_digits

    return simple


def _get_content_model(content: Any) -> str:
    """Determine the content model type."""
    if hasattr(content, "model"):
        model = content.model
        if model == "all":
            return "all"
        elif model == "choice":
            return "choice"
    return "sequence"


def _parse_content(content: Any, parent_path: str) -> list[XsdElement]:
    """Parse content model (sequence/all/choice) into child elements."""
    children: list[XsdElement] = []

    if content is None:
        return children

    # Handle group content
    if isinstance(content, XsdGroup):
        for item in content:
            if isinstance(item, XmlSchemaElement):
                child = _parse_element(item, parent_path)
                children.append(child)
            elif isinstance(item, XsdGroup):
                # Recursively handle nested groups
                children.extend(_parse_content(item, parent_path))

    # Handle direct iteration
    elif hasattr(content, "__iter__"):
        for item in content:
            if isinstance(item, XmlSchemaElement):
                child = _parse_element(item, parent_path)
                children.append(child)
            elif hasattr(item, "__iter__"):
                children.extend(_parse_content(item, parent_path))

    return children


def extract_field_paths(schema: XsdSchema) -> list[dict[str, Any]]:
    """
    Extract all field paths from a schema for meta file generation.

    Returns a list of dicts with field information:
        - path: XPath-like field path
        - min_occurs: minimum occurrences
        - max_occurs: maximum occurrences (None = unbounded)
        - nillable: whether the field can be nil
        - enumeration: list of allowed values (if restricted)
    """
    paths: list[dict[str, Any]] = []

    for root in schema.root_elements:
        _extract_paths_recursive(root, paths)

    return paths


def _extract_paths_recursive(
    element: XsdElement, paths: list[dict[str, Any]]
) -> None:
    """Recursively extract field paths from an element tree."""
    # Add leaf elements
    if element.is_leaf:
        path_info: dict[str, Any] = {
            "path": element.full_path,
            "min_occurs": element.min_occurs,
            "max_occurs": element.max_occurs,
            "nillable": element.nillable,
        }

        # Add enumeration if present
        if element.type_def and element.type_def.enumeration:
            path_info["enumeration"] = element.type_def.enumeration

        # Add pattern if present
        if element.type_def and element.type_def.pattern:
            path_info["pattern"] = element.type_def.pattern

        paths.append(path_info)

    # Add attributes
    for attr in element.attributes:
        attr_path = f"{element.full_path}/@{attr.name}"
        attr_info: dict[str, Any] = {
            "path": attr_path,
            "min_occurs": 1 if attr.use == "required" else 0,
            "max_occurs": 1,
            "nillable": False,
        }
        if attr.type_def and attr.type_def.enumeration:
            attr_info["enumeration"] = attr.type_def.enumeration
        paths.append(attr_info)

    # Recurse into children
    for child in element.children:
        _extract_paths_recursive(child, paths)

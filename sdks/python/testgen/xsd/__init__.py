"""XSD schema parsing and model definitions."""

from .model import (
    XsdSchema,
    XsdElement,
    XsdAttribute,
    XsdSimpleType,
    XsdComplexType,
)
from .parser import parse_xsd, extract_field_paths

__all__ = [
    "XsdSchema",
    "XsdElement",
    "XsdAttribute",
    "XsdSimpleType",
    "XsdComplexType",
    "parse_xsd",
    "extract_field_paths",
]

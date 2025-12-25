"""
XSD schema internal model definitions.

These classes represent a simplified view of an XSD schema suitable for
XML generation. They capture the essential structural and constraint
information needed to generate valid XML instances.
"""

from dataclasses import dataclass, field
from typing import Any


@dataclass
class XsdSimpleType:
    """
    Represents an XSD simple type with optional restrictions.

    Simple types define constraints on text content values.
    """

    name: str | None = None
    base_type: str = "string"  # xs:string, xs:integer, xs:decimal, etc.
    enumeration: list[str] | None = None  # Restricted to these values
    pattern: str | None = None  # Regex pattern
    min_value: Any | None = None  # minInclusive/minExclusive
    max_value: Any | None = None  # maxInclusive/maxExclusive
    min_length: int | None = None
    max_length: int | None = None
    total_digits: int | None = None
    fraction_digits: int | None = None


@dataclass
class XsdAttribute:
    """
    Represents an XML attribute definition.
    """

    name: str
    type_def: XsdSimpleType = field(default_factory=lambda: XsdSimpleType())
    use: str = "optional"  # "required" or "optional"
    default: str | None = None
    fixed: str | None = None


@dataclass
class XsdElement:
    """
    Represents an XML element definition.

    Elements can be either simple (text content only) or complex
    (with child elements and/or attributes).
    """

    name: str
    min_occurs: int = 1
    max_occurs: int | None = 1  # None = unbounded
    nillable: bool = False

    # For simple elements (leaf nodes with text content)
    type_def: XsdSimpleType | None = None

    # For complex elements (elements with children)
    children: list["XsdElement"] = field(default_factory=list)
    attributes: list[XsdAttribute] = field(default_factory=list)

    # Content model for complex types
    content_model: str = "sequence"  # "sequence", "all", "choice"

    # Computed properties
    full_path: str = ""  # XPath-like path from root

    @property
    def is_leaf(self) -> bool:
        """True if this element has no child elements (text content only)."""
        return len(self.children) == 0

    @property
    def is_optional(self) -> bool:
        """True if this element is not required."""
        return self.min_occurs == 0

    @property
    def is_repeating(self) -> bool:
        """True if this element can occur more than once."""
        return self.max_occurs is None or self.max_occurs > 1


@dataclass
class XsdComplexType:
    """
    Represents a named complex type definition.

    Complex types can be reused across multiple elements.
    """

    name: str
    children: list[XsdElement] = field(default_factory=list)
    attributes: list[XsdAttribute] = field(default_factory=list)
    content_model: str = "sequence"
    mixed: bool = False  # Mixed content (text + elements)


@dataclass
class XsdSchema:
    """
    Represents a complete XSD schema.

    Contains the root element(s) and any named type definitions.
    """

    root_elements: list[XsdElement] = field(default_factory=list)
    named_simple_types: dict[str, XsdSimpleType] = field(default_factory=dict)
    named_complex_types: dict[str, XsdComplexType] = field(default_factory=dict)
    target_namespace: str | None = None
    element_form_default: str = "unqualified"

    def get_primary_root(self) -> XsdElement | None:
        """Get the first root element, or None if empty."""
        return self.root_elements[0] if self.root_elements else None

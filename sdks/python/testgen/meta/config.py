"""
Meta file configuration schema and parsing.

The meta.yaml file pairs with an XSD schema to provide:
- Context information (contextId, metadata)
- Generation settings (fill rates, null rates, etc.)
- Semantic type mappings for realistic data generation
- Field-specific overrides
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml


@dataclass
class FieldOverride:
    """Override settings for a specific field path."""

    fill_rate: float | None = None
    repeat_range: tuple[int, int] | None = None
    semantic_type: str | None = None


@dataclass
class GenerationDefaults:
    """Default generation settings."""

    optional_field_fill_rate: float = 0.7
    null_rate: float = 0.05
    empty_rate: float = 0.03
    repeat_range: tuple[int, int] = (1, 3)


@dataclass
class GenerationConfig:
    """Generation configuration section."""

    defaults: GenerationDefaults = field(default_factory=GenerationDefaults)
    semantic_types: dict[str, str | None] = field(default_factory=dict)
    field_overrides: dict[str, FieldOverride] = field(default_factory=dict)


@dataclass
class ContextConfig:
    """Context configuration section.

    Required metadata can be either:
    - A fixed string value: documenttype: "PROFILE"
    - A list of values for random selection: documenttype: [PROFILE, CHANGE, DELETE]
    """

    context_id: str
    display_name: str = ""
    description: str = ""
    required_metadata: dict[str, str | list[str]] = field(default_factory=dict)
    optional_metadata: dict[str, list[str]] = field(default_factory=dict)


@dataclass
class MetaConfig:
    """Complete meta file configuration."""

    context: ContextConfig
    generation: GenerationConfig = field(default_factory=GenerationConfig)
    source_xsd: str | None = None  # Original XSD file path (for reference)


def load_meta_config(meta_path: Path) -> MetaConfig:
    """
    Load and parse a meta.yaml configuration file.

    Args:
        meta_path: Path to the .meta.yaml file

    Returns:
        Parsed MetaConfig object

    Raises:
        FileNotFoundError: If meta file doesn't exist
        ValueError: If meta file is invalid
    """
    if not meta_path.exists():
        raise FileNotFoundError(f"Meta file not found: {meta_path}")

    with open(meta_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    if not data:
        raise ValueError(f"Empty meta file: {meta_path}")

    return _parse_meta_config(data, meta_path)


def _parse_meta_config(data: dict[str, Any], source_path: Path) -> MetaConfig:
    """Parse raw YAML data into MetaConfig."""
    # Parse context section
    context_data = data.get("context", {})
    if not context_data.get("contextId"):
        raise ValueError("Meta file must have context.contextId")

    context = ContextConfig(
        context_id=context_data["contextId"],
        display_name=context_data.get("displayName", ""),
        description=context_data.get("description", ""),
        required_metadata=context_data.get("requiredMetadata", {}),
        optional_metadata=context_data.get("optionalMetadata", {}),
    )

    # Parse generation section
    gen_data = data.get("generation", {})
    defaults_data = gen_data.get("defaults", {})

    defaults = GenerationDefaults(
        optional_field_fill_rate=defaults_data.get("optionalFieldFillRate", 0.7),
        null_rate=defaults_data.get("nullRate", 0.05),
        empty_rate=defaults_data.get("emptyRate", 0.03),
        repeat_range=tuple(defaults_data.get("repeatRange", [1, 3])),
    )

    # Parse semantic types
    semantic_types = gen_data.get("semanticTypes", {})

    # Parse field overrides
    field_overrides: dict[str, FieldOverride] = {}
    for path, override_data in gen_data.get("fieldOverrides", {}).items():
        if isinstance(override_data, dict):
            repeat_range = override_data.get("repeatRange")
            field_overrides[path] = FieldOverride(
                fill_rate=override_data.get("fillRate"),
                repeat_range=tuple(repeat_range) if repeat_range else None,
                semantic_type=override_data.get("semanticType"),
            )

    generation = GenerationConfig(
        defaults=defaults,
        semantic_types=semantic_types,
        field_overrides=field_overrides,
    )

    return MetaConfig(
        context=context,
        generation=generation,
        source_xsd=str(source_path.with_suffix(".xsd")),
    )


def generate_meta_template(
    field_paths: list[dict[str, Any]],
    xsd_filename: str,
    context_id: str | None = None,
) -> str:
    """
    Generate a template meta.yaml from extracted field paths.

    Args:
        field_paths: List of field info dicts with keys:
            - path: str (XPath)
            - min_occurs: int
            - max_occurs: int | None (None = unbounded)
            - nillable: bool
            - enumeration: list[str] | None
        xsd_filename: Name of source XSD file
        context_id: Optional context ID to pre-populate

    Returns:
        YAML string content for the meta file
    """
    lines = [
        f"# Auto-generated from: {xsd_filename}",
        "# TODO: Fill in context details and customize semantic types",
        "",
        "context:",
        f'  contextId: "{context_id or ""}"  # TODO: Set context ID',
        '  displayName: ""  # TODO: Set display name',
        '  description: ""  # TODO: Add description',
        "  requiredMetadata: {}  # TODO: Add required metadata key-value pairs",
        "  optionalMetadata: {}  # TODO: Add optional metadata with possible values",
        "",
        "generation:",
        "  defaults:",
        "    optionalFieldFillRate: 0.7",
        "    nullRate: 0.05",
        "    emptyRate: 0.03",
        "    repeatRange: [1, 3]",
        "",
        "  # All field paths from XSD - set semantic types for realistic data",
        "  # Options: person.first_name, person.last_name, address.street, address.city,",
        "  #          address.state_abbr, address.zipcode, phone_number, email, ssn,",
        "  #          decimal(min,max,decimals), date.past, date.future, pattern:REGEX",
        "  semanticTypes:",
    ]

    # Add all field paths with comments about enumerations
    for field_info in field_paths:
        path = field_info["path"]
        enum = field_info.get("enumeration")
        if enum:
            enum_str = ", ".join(enum[:5])
            if len(enum) > 5:
                enum_str += ", ..."
            lines.append(f'    "{path}": null  # Has enum: [{enum_str}]')
        else:
            lines.append(f'    "{path}": null')

    lines.extend(
        [
            "",
            "  # Optional/repeating fields - customize fill rates and repeat ranges",
            "  fieldOverrides:",
        ]
    )

    # Add field overrides for optional and repeating elements
    for field_info in field_paths:
        path = field_info["path"]
        min_occurs = field_info.get("min_occurs", 1)
        max_occurs = field_info.get("max_occurs")

        if min_occurs == 0:
            lines.append(f'    "{path}":  # minOccurs=0')
            lines.append("      fillRate: 0.7")
        elif max_occurs is None or max_occurs > 1:
            lines.append(f'    "{path}":  # maxOccurs={"unbounded" if max_occurs is None else max_occurs}')
            lines.append("      repeatRange: [1, 5]")

    lines.append("")
    return "\n".join(lines)

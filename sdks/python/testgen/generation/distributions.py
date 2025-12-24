"""
Random distribution controls for XML generation.

Provides configuration for controlling the randomness of generated
XML documents, including fill rates for optional fields, null rates,
and repeat counts.
"""

import random
from dataclasses import dataclass, field
from typing import Any


@dataclass
class DistributionConfig:
    """
    Configuration for random distributions in XML generation.

    All rates are floats between 0.0 and 1.0.
    """

    # Probability that an optional field (minOccurs=0) will be included
    optional_field_fill_rate: float = 0.7

    # Probability that a nillable field will be nil
    null_rate: float = 0.05

    # Probability that a string field will be empty
    empty_rate: float = 0.03

    # Default range for repeating elements [min, max]
    repeat_range: tuple[int, int] = (1, 3)

    # Per-field overrides: path -> config dict
    field_overrides: dict[str, dict[str, Any]] = field(default_factory=dict)

    # Random seed for reproducibility
    seed: int | None = None

    def __post_init__(self) -> None:
        """Initialize random generator with seed if provided."""
        if self.seed is not None:
            random.seed(self.seed)

    def should_include_optional(self, field_path: str) -> bool:
        """
        Determine if an optional field should be included.

        Args:
            field_path: XPath-like path to the field

        Returns:
            True if the field should be generated
        """
        fill_rate = self._get_field_fill_rate(field_path)
        return random.random() < fill_rate

    def should_be_null(self, field_path: str) -> bool:
        """
        Determine if a nillable field should be nil.

        Args:
            field_path: XPath-like path to the field

        Returns:
            True if the field should be nil
        """
        null_rate = self._get_field_null_rate(field_path)
        return random.random() < null_rate

    def should_be_empty(self, field_path: str) -> bool:
        """
        Determine if a string field should be empty.

        Args:
            field_path: XPath-like path to the field

        Returns:
            True if the field should be an empty string
        """
        empty_rate = self._get_field_empty_rate(field_path)
        return random.random() < empty_rate

    def get_repeat_count(
        self, field_path: str, min_occurs: int = 1, max_occurs: int | None = None
    ) -> int:
        """
        Determine how many times a repeating element should occur.

        Args:
            field_path: XPath-like path to the field
            min_occurs: XSD minOccurs constraint
            max_occurs: XSD maxOccurs constraint (None = unbounded)

        Returns:
            Number of times to generate the element
        """
        # Get configured repeat range
        repeat_min, repeat_max = self._get_field_repeat_range(field_path)

        # For unbounded elements, use the configured repeat range
        if max_occurs is None:
            # Use configured range, but respect XSD min_occurs
            effective_min = max(min_occurs, repeat_min)
            effective_max = repeat_max
        else:
            # Apply XSD constraints - stay within both XSD and config bounds
            effective_min = max(min_occurs, 1)
            effective_max = min(max_occurs, repeat_max) if max_occurs > 0 else repeat_max

        # Ensure min <= max
        if effective_min > effective_max:
            effective_max = effective_min

        # Cap at reasonable limit
        if effective_max > 20:
            effective_max = 20

        return random.randint(effective_min, effective_max)

    def _get_field_fill_rate(self, field_path: str) -> float:
        """Get fill rate for a specific field, with fallback to default."""
        override = self.field_overrides.get(field_path, {})
        return override.get("fillRate", override.get("fill_rate", self.optional_field_fill_rate))

    def _get_field_null_rate(self, field_path: str) -> float:
        """Get null rate for a specific field, with fallback to default."""
        override = self.field_overrides.get(field_path, {})
        return override.get("nullRate", override.get("null_rate", self.null_rate))

    def _get_field_empty_rate(self, field_path: str) -> float:
        """Get empty rate for a specific field, with fallback to default."""
        override = self.field_overrides.get(field_path, {})
        return override.get("emptyRate", override.get("empty_rate", self.empty_rate))

    def _get_field_repeat_range(self, field_path: str) -> tuple[int, int]:
        """Get repeat range for a specific field, with fallback to default."""
        override = self.field_overrides.get(field_path, {})
        repeat = override.get("repeatRange", override.get("repeat_range"))
        if repeat:
            return (repeat[0], repeat[1])
        return self.repeat_range

    @classmethod
    def from_meta_config(cls, generation_config: Any) -> "DistributionConfig":
        """
        Create DistributionConfig from a GenerationConfig object.

        Args:
            generation_config: GenerationConfig from meta file

        Returns:
            DistributionConfig instance
        """
        defaults = generation_config.defaults

        # Convert field overrides
        field_overrides: dict[str, dict[str, Any]] = {}
        for path, override in generation_config.field_overrides.items():
            field_overrides[path] = {}
            if override.fill_rate is not None:
                field_overrides[path]["fillRate"] = override.fill_rate
            if override.repeat_range is not None:
                field_overrides[path]["repeatRange"] = list(override.repeat_range)

        return cls(
            optional_field_fill_rate=defaults.optional_field_fill_rate,
            null_rate=defaults.null_rate,
            empty_rate=defaults.empty_rate,
            repeat_range=defaults.repeat_range,
            field_overrides=field_overrides,
        )

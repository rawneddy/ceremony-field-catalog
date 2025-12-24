"""Tests for the meta configuration module."""

import tempfile
from pathlib import Path

import pytest

from testgen.meta.config import (
    MetaConfig,
    ContextConfig,
    GenerationConfig,
    GenerationDefaults,
    FieldOverride,
    load_meta_config,
    generate_meta_template,
)


class TestLoadMetaConfig:
    """Tests for the load_meta_config function."""

    def test_load_minimal_config(self):
        """Test loading a minimal valid meta config."""
        yaml_content = """
context:
  contextId: "test"
"""

        with tempfile.NamedTemporaryFile(mode="w", suffix=".meta.yaml", delete=False) as f:
            f.write(yaml_content)
            meta_path = Path(f.name)

        try:
            config = load_meta_config(meta_path)

            assert config.context.context_id == "test"
            assert config.context.display_name == ""
            assert config.context.required_metadata == {}
        finally:
            meta_path.unlink()

    def test_load_full_config(self):
        """Test loading a complete meta config."""
        yaml_content = """
context:
  contextId: "loans"
  displayName: "Loans"
  description: "Test loans"
  requiredMetadata:
    loanType: "AUTO"
  optionalMetadata:
    region:
      - "EAST"
      - "WEST"

generation:
  defaults:
    optionalFieldFillRate: 0.8
    nullRate: 0.1
    emptyRate: 0.05
    repeatRange: [2, 5]

  semanticTypes:
    "/root/name": "person.first_name"
    "/root/email": "email"

  fieldOverrides:
    "/root/optional":
      fillRate: 0.5
    "/root/repeating":
      repeatRange: [1, 10]
"""

        with tempfile.NamedTemporaryFile(mode="w", suffix=".meta.yaml", delete=False) as f:
            f.write(yaml_content)
            meta_path = Path(f.name)

        try:
            config = load_meta_config(meta_path)

            # Context
            assert config.context.context_id == "loans"
            assert config.context.display_name == "Loans"
            assert config.context.description == "Test loans"
            assert config.context.required_metadata == {"loanType": "AUTO"}
            assert config.context.optional_metadata == {"region": ["EAST", "WEST"]}

            # Generation defaults
            assert config.generation.defaults.optional_field_fill_rate == 0.8
            assert config.generation.defaults.null_rate == 0.1
            assert config.generation.defaults.empty_rate == 0.05
            assert config.generation.defaults.repeat_range == (2, 5)

            # Semantic types
            assert config.generation.semantic_types["/root/name"] == "person.first_name"
            assert config.generation.semantic_types["/root/email"] == "email"

            # Field overrides
            assert config.generation.field_overrides["/root/optional"].fill_rate == 0.5
            assert config.generation.field_overrides["/root/repeating"].repeat_range == (1, 10)
        finally:
            meta_path.unlink()

    def test_load_missing_context_id(self):
        """Test that missing contextId raises an error."""
        yaml_content = """
context:
  displayName: "Test"
"""

        with tempfile.NamedTemporaryFile(mode="w", suffix=".meta.yaml", delete=False) as f:
            f.write(yaml_content)
            meta_path = Path(f.name)

        try:
            with pytest.raises(ValueError, match="contextId"):
                load_meta_config(meta_path)
        finally:
            meta_path.unlink()

    def test_load_nonexistent_file(self):
        """Test that loading a non-existent file raises an error."""
        with pytest.raises(FileNotFoundError):
            load_meta_config(Path("/nonexistent/path/meta.yaml"))

    def test_load_empty_file(self):
        """Test that loading an empty file raises an error."""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".meta.yaml", delete=False) as f:
            f.write("")
            meta_path = Path(f.name)

        try:
            with pytest.raises(ValueError, match="Empty"):
                load_meta_config(meta_path)
        finally:
            meta_path.unlink()


class TestGenerateMetaTemplate:
    """Tests for the generate_meta_template function."""

    def test_generate_basic_template(self):
        """Test generating a basic meta template."""
        field_paths = [
            {"path": "/root/name", "min_occurs": 1, "max_occurs": 1, "nillable": False},
            {"path": "/root/value", "min_occurs": 1, "max_occurs": 1, "nillable": False},
        ]

        template = generate_meta_template(
            field_paths=field_paths,
            xsd_filename="test.xsd",
        )

        assert "# Auto-generated from: test.xsd" in template
        assert 'contextId: ""' in template
        assert '"/root/name": null' in template
        assert '"/root/value": null' in template

    def test_generate_template_with_context_id(self):
        """Test generating a template with pre-populated context ID."""
        field_paths = [
            {"path": "/root/field", "min_occurs": 1, "max_occurs": 1, "nillable": False},
        ]

        template = generate_meta_template(
            field_paths=field_paths,
            xsd_filename="test.xsd",
            context_id="mycontext",
        )

        assert 'contextId: "mycontext"' in template

    def test_generate_template_with_enumeration(self):
        """Test that enumeration values are included as comments."""
        field_paths = [
            {
                "path": "/root/status",
                "min_occurs": 1,
                "max_occurs": 1,
                "nillable": False,
                "enumeration": ["ACTIVE", "INACTIVE", "PENDING"],
            },
        ]

        template = generate_meta_template(
            field_paths=field_paths,
            xsd_filename="test.xsd",
        )

        assert "Has enum:" in template
        assert "ACTIVE" in template

    def test_generate_template_with_optional_fields(self):
        """Test that optional fields get fieldOverrides entries."""
        field_paths = [
            {"path": "/root/optional", "min_occurs": 0, "max_occurs": 1, "nillable": False},
        ]

        template = generate_meta_template(
            field_paths=field_paths,
            xsd_filename="test.xsd",
        )

        assert "fieldOverrides:" in template
        assert '"/root/optional":' in template
        assert "fillRate:" in template

    def test_generate_template_with_repeating_fields(self):
        """Test that repeating fields get fieldOverrides entries."""
        field_paths = [
            {"path": "/root/items", "min_occurs": 1, "max_occurs": None, "nillable": False},
        ]

        template = generate_meta_template(
            field_paths=field_paths,
            xsd_filename="test.xsd",
        )

        assert "fieldOverrides:" in template
        assert '"/root/items":' in template
        assert "repeatRange:" in template

    def test_template_includes_semantic_type_docs(self):
        """Test that the template includes documentation for semantic types."""
        field_paths = [
            {"path": "/root/field", "min_occurs": 1, "max_occurs": 1, "nillable": False},
        ]

        template = generate_meta_template(
            field_paths=field_paths,
            xsd_filename="test.xsd",
        )

        assert "person.first_name" in template
        assert "address.street" in template
        assert "decimal(min,max,decimals)" in template


class TestContextConfig:
    """Tests for the ContextConfig class."""

    def test_default_values(self):
        """Test default values for context config."""
        config = ContextConfig(context_id="test")

        assert config.context_id == "test"
        assert config.display_name == ""
        assert config.description == ""
        assert config.required_metadata == {}
        assert config.optional_metadata == {}


class TestGenerationDefaults:
    """Tests for the GenerationDefaults class."""

    def test_default_values(self):
        """Test default generation values."""
        defaults = GenerationDefaults()

        assert defaults.optional_field_fill_rate == 0.7
        assert defaults.null_rate == 0.05
        assert defaults.empty_rate == 0.03
        assert defaults.repeat_range == (1, 3)


class TestFieldOverride:
    """Tests for the FieldOverride class."""

    def test_all_none_by_default(self):
        """Test that all override values are None by default."""
        override = FieldOverride()

        assert override.fill_rate is None
        assert override.repeat_range is None
        assert override.semantic_type is None

    def test_with_values(self):
        """Test creating override with values."""
        override = FieldOverride(
            fill_rate=0.5,
            repeat_range=(2, 10),
            semantic_type="email",
        )

        assert override.fill_rate == 0.5
        assert override.repeat_range == (2, 10)
        assert override.semantic_type == "email"

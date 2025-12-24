"""
Test data generator for the Ceremony Field Catalog.

Generates random XML documents from XSD schemas and submits them as observations
to validate the "emergent schema" hypothesis: observed data should produce
schemas that are at least as permissive as the source XSD.

Usage:
    # Scaffold a meta.yaml from an XSD
    python -m testgen.cli init-meta --xsd path/to/schema.xsd

    # Run test lanes
    python -m testgen.cli run ./test_lanes/
"""

__version__ = "0.1.0"

"""
Command-line interface for the test data generator.

Subcommands:
    init-meta   Scaffold a meta.yaml file from an XSD schema
    run         Generate XML test data and submit to the API
"""

import argparse
import sys
from pathlib import Path

from . import __version__


def create_parser() -> argparse.ArgumentParser:
    """Create the argument parser with subcommands."""
    parser = argparse.ArgumentParser(
        prog="testgen",
        description="Generate test XML data from XSD schemas for the Ceremony Field Catalog",
    )
    parser.add_argument(
        "--version",
        action="version",
        version=f"%(prog)s {__version__}",
    )

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # init-meta subcommand
    init_parser = subparsers.add_parser(
        "init-meta",
        help="Scaffold a meta.yaml file from an XSD schema",
        description="Parse an XSD file and generate a template meta.yaml with all field paths pre-populated",
    )
    init_parser.add_argument(
        "--xsd",
        type=Path,
        required=True,
        help="Path to the XSD schema file",
    )
    init_parser.add_argument(
        "--output",
        "-o",
        type=Path,
        default=None,
        help="Output path for meta.yaml (default: same directory as XSD, with .meta.yaml extension)",
    )
    init_parser.add_argument(
        "--context",
        "-c",
        type=str,
        default=None,
        help="Context ID to pre-populate in the template",
    )
    init_parser.add_argument(
        "--force",
        "-f",
        action="store_true",
        help="Overwrite existing meta file if it exists",
    )

    # run subcommand
    run_parser = subparsers.add_parser(
        "run",
        help="Generate XML test data and submit to the API",
        description="Generate random XML documents from test lanes and submit as observations",
    )
    run_parser.add_argument(
        "lanes_dir",
        type=Path,
        help="Directory containing test lanes (XSD + meta.yaml pairs)",
    )
    run_parser.add_argument(
        "-n",
        "--count",
        type=int,
        default=10,
        help="Number of XMLs to generate per lane (default: 10)",
    )
    run_parser.add_argument(
        "-l",
        "--lane",
        type=str,
        action="append",
        dest="lanes",
        help="Specific lane(s) to run (can be repeated). If not specified, runs all lanes.",
    )
    run_parser.add_argument(
        "--fill-rate",
        type=float,
        default=None,
        help="Override optional field fill rate (0.0-1.0)",
    )
    run_parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Generate XMLs but don't submit to API",
    )
    run_parser.add_argument(
        "--output-dir",
        type=Path,
        default=None,
        help="Directory to save generated XMLs (optional)",
    )
    run_parser.add_argument(
        "--api-url",
        type=str,
        default="http://localhost:8080",
        help="API base URL (default: http://localhost:8080)",
    )
    run_parser.add_argument(
        "--seed",
        type=int,
        default=None,
        help="Random seed for reproducible generation",
    )
    run_parser.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        help="Verbose output",
    )

    return parser


def cmd_init_meta(args: argparse.Namespace) -> int:
    """Handle the init-meta subcommand."""
    from .xsd.parser import parse_xsd, extract_field_paths
    from .meta.config import generate_meta_template

    xsd_path: Path = args.xsd

    if not xsd_path.exists():
        print(f"Error: XSD file not found: {xsd_path}", file=sys.stderr)
        return 1

    # Determine output path
    output_path: Path = args.output
    if output_path is None:
        output_path = xsd_path.with_suffix(".meta.yaml")

    # Check if output exists
    if output_path.exists() and not args.force:
        print(f"Error: Output file already exists: {output_path}", file=sys.stderr)
        print("Use --force to overwrite", file=sys.stderr)
        return 1

    try:
        print(f"Parsing XSD: {xsd_path}")
        schema = parse_xsd(xsd_path)
        field_paths = extract_field_paths(schema)

        print(f"Found {len(field_paths)} field paths")

        # Generate template
        template = generate_meta_template(
            field_paths=field_paths,
            xsd_filename=xsd_path.name,
            context_id=args.context,
        )

        # Write output
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(template)

        print(f"Generated: {output_path}")
        print("\nNext steps:")
        print("  1. Edit the meta.yaml to set contextId and metadata")
        print("  2. Set semantic types for fields needing realistic data")
        print("  3. Adjust field overrides as needed")
        return 0

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1


def cmd_run(args: argparse.Namespace) -> int:
    """Handle the run subcommand."""
    from .runner import TestLaneRunner

    lanes_dir: Path = args.lanes_dir

    if not lanes_dir.exists():
        print(f"Error: Lanes directory not found: {lanes_dir}", file=sys.stderr)
        return 1

    if not lanes_dir.is_dir():
        print(f"Error: Not a directory: {lanes_dir}", file=sys.stderr)
        return 1

    try:
        runner = TestLaneRunner(
            lanes_dir=lanes_dir,
            api_url=args.api_url,
            count=args.count,
            dry_run=args.dry_run,
            output_dir=args.output_dir,
            fill_rate_override=args.fill_rate,
            seed=args.seed,
            verbose=args.verbose,
        )

        if args.lanes:
            return runner.run_lanes(args.lanes)
        else:
            return runner.run_all_lanes()

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        if args.verbose:
            import traceback

            traceback.print_exc()
        return 1


def main() -> int:
    """Main entry point."""
    parser = create_parser()
    args = parser.parse_args()

    if args.command is None:
        parser.print_help()
        return 0

    if args.command == "init-meta":
        return cmd_init_meta(args)
    elif args.command == "run":
        return cmd_run(args)
    else:
        parser.print_help()
        return 1


if __name__ == "__main__":
    sys.exit(main())

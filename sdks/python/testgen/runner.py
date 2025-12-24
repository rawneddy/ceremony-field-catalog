"""
Test lane runner - orchestrates XML generation and submission.

Discovers test lanes (XSD + meta.yaml pairs), generates XML documents,
and submits them as observations to the API.
"""

import random
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterator

from .api.client import TestGenApiClient, SubmissionResult
from .generation.distributions import DistributionConfig
from .generation.generator import XmlGenerator, XmlValidator
from .meta.config import MetaConfig, load_meta_config
from .xsd.parser import parse_xsd


@dataclass
class TestLane:
    """Represents a test lane (XSD + meta.yaml pair)."""

    name: str
    xsd_path: Path
    meta_path: Path
    meta_config: MetaConfig | None = None

    @property
    def full_name(self) -> str:
        """Get the full lane name including parent directory."""
        return f"{self.xsd_path.parent.name}/{self.name}"


@dataclass
class LaneResult:
    """Result of running a single test lane."""

    lane_name: str
    total_generated: int
    total_submitted: int
    total_observations: int
    errors: list[str]

    @property
    def success(self) -> bool:
        return len(self.errors) == 0 and self.total_generated > 0


@dataclass
class RunResult:
    """Result of running all test lanes."""

    lanes_run: int
    lanes_succeeded: int
    total_xmls_generated: int
    total_observations_submitted: int
    lane_results: list[LaneResult]

    @property
    def success(self) -> bool:
        return self.lanes_run > 0 and self.lanes_succeeded == self.lanes_run


class TestLaneRunner:
    """
    Runs test lanes to generate and submit XML test data.
    """

    def __init__(
        self,
        lanes_dir: Path,
        api_url: str = "http://localhost:8080",
        count: int = 10,
        dry_run: bool = False,
        output_dir: Path | None = None,
        fill_rate_override: float | None = None,
        seed: int | None = None,
        verbose: bool = False,
    ):
        """
        Initialize the runner.

        Args:
            lanes_dir: Directory containing test lanes
            api_url: API base URL
            count: Number of XMLs to generate per lane
            dry_run: If True, generate but don't submit
            output_dir: Optional directory to save generated XMLs
            fill_rate_override: Override fill rate for optional fields
            seed: Random seed for reproducibility
            verbose: Enable verbose output
        """
        self.lanes_dir = lanes_dir
        self.api_url = api_url
        self.count = count
        self.dry_run = dry_run
        self.output_dir = output_dir
        self.fill_rate_override = fill_rate_override
        self.seed = seed
        self.verbose = verbose

        if seed is not None:
            random.seed(seed)

    def discover_lanes(self) -> list[TestLane]:
        """
        Discover all test lanes in the lanes directory.

        A test lane is an XSD file with a matching .meta.yaml file.

        Returns:
            List of discovered TestLane objects
        """
        lanes: list[TestLane] = []

        for xsd_path in self.lanes_dir.rglob("*.xsd"):
            meta_path = xsd_path.with_suffix(".meta.yaml")
            if meta_path.exists():
                lane = TestLane(
                    name=xsd_path.stem,
                    xsd_path=xsd_path,
                    meta_path=meta_path,
                )
                lanes.append(lane)

        return sorted(lanes, key=lambda l: l.full_name)

    def run_all_lanes(self) -> int:
        """
        Run all discovered test lanes.

        Returns:
            Exit code (0 = success, 1 = failure)
        """
        lanes = self.discover_lanes()

        if not lanes:
            self._print("No test lanes found in directory")
            return 1

        self._print(f"Discovered {len(lanes)} test lane(s)")

        result = self._run_lanes(lanes)

        self._print_summary(result)

        return 0 if result.success else 1

    def run_lanes(self, lane_names: list[str]) -> int:
        """
        Run specific test lanes by name.

        Args:
            lane_names: List of lane names to run (e.g., "deposits/dda_fulfillment")

        Returns:
            Exit code (0 = success, 1 = failure)
        """
        all_lanes = self.discover_lanes()

        # Match lane names
        selected_lanes: list[TestLane] = []
        for name in lane_names:
            matched = [l for l in all_lanes if name in l.full_name or name == l.name]
            if not matched:
                self._print(f"Warning: No lane matching '{name}'")
            selected_lanes.extend(matched)

        if not selected_lanes:
            self._print("No matching test lanes found")
            return 1

        # Remove duplicates while preserving order
        seen = set()
        unique_lanes = []
        for lane in selected_lanes:
            if lane.full_name not in seen:
                seen.add(lane.full_name)
                unique_lanes.append(lane)

        self._print(f"Running {len(unique_lanes)} test lane(s)")

        result = self._run_lanes(unique_lanes)

        self._print_summary(result)

        return 0 if result.success else 1

    def _run_lanes(self, lanes: list[TestLane]) -> RunResult:
        """Run a list of test lanes."""
        lane_results: list[LaneResult] = []
        total_generated = 0
        total_observations = 0

        # Create API client if not dry run
        api_client = None
        if not self.dry_run:
            api_client = TestGenApiClient(self.api_url)
            if not api_client.health_check():
                self._print(f"Warning: API at {self.api_url} may not be reachable")

        try:
            for lane in lanes:
                result = self._run_lane(lane, api_client)
                lane_results.append(result)
                total_generated += result.total_generated
                total_observations += result.total_observations

        finally:
            if api_client:
                api_client.close()

        return RunResult(
            lanes_run=len(lanes),
            lanes_succeeded=sum(1 for r in lane_results if r.success),
            total_xmls_generated=total_generated,
            total_observations_submitted=total_observations,
            lane_results=lane_results,
        )

    def _run_lane(
        self, lane: TestLane, api_client: TestGenApiClient | None
    ) -> LaneResult:
        """Run a single test lane."""
        self._print(f"\nRunning lane: {lane.full_name}")
        errors: list[str] = []
        generated_count = 0
        submitted_count = 0
        observation_count = 0

        try:
            # Load meta config
            meta_config = load_meta_config(lane.meta_path)
            lane.meta_config = meta_config

            # Validate context is configured
            if not meta_config.context.context_id:
                errors.append("Meta file missing contextId")
                return LaneResult(lane.full_name, 0, 0, 0, errors)

            # Ensure context exists
            if api_client and not self.dry_run:
                try:
                    api_client.ensure_context_exists(meta_config.context)
                    self._print_verbose(f"  Context '{meta_config.context.context_id}' ready")
                except RuntimeError as e:
                    errors.append(f"Failed to ensure context: {e}")
                    return LaneResult(lane.full_name, 0, 0, 0, errors)

            # Parse XSD
            schema = parse_xsd(lane.xsd_path)
            self._print_verbose(f"  Parsed XSD with {len(schema.root_elements)} root element(s)")

            # Create distribution config
            distribution = DistributionConfig.from_meta_config(meta_config.generation)
            if self.fill_rate_override is not None:
                distribution.optional_field_fill_rate = self.fill_rate_override
            if self.seed is not None:
                distribution.seed = self.seed

            # Create validator
            validator = XmlValidator(lane.xsd_path)

            # Create generator
            generator = XmlGenerator(
                schema=schema,
                meta_config=meta_config,
                distribution=distribution,
                seed=self.seed,
            )

            # Prepare metadata
            base_metadata = dict(meta_config.context.required_metadata)

            # Generate and submit XMLs
            try:
                from tqdm import tqdm

                iterator: Iterator[int] = tqdm(
                    range(self.count), desc=f"  Generating", leave=False
                )
            except ImportError:
                iterator = range(self.count)

            for i in iterator:
                try:
                    # Add random optional metadata
                    metadata = base_metadata.copy()
                    for key, values in meta_config.context.optional_metadata.items():
                        if values:
                            metadata[key] = random.choice(values)

                    # Generate XML
                    xml_string = generator.generate_string(pretty=True)
                    generated_count += 1

                    # Validate
                    is_valid, validation_errors = validator.validate(xml_string)
                    if not is_valid:
                        errors.append(f"XML {i+1} failed validation: {validation_errors[0]}")
                        continue

                    # Save to file if output dir specified
                    if self.output_dir:
                        self._save_xml(lane, i, xml_string)

                    # Submit if not dry run
                    if api_client and not self.dry_run:
                        result = api_client.submit_xml_observations(
                            meta_config.context.context_id,
                            xml_string,
                            metadata,
                        )
                        if result.success:
                            submitted_count += 1
                            observation_count += result.observation_count
                        else:
                            errors.append(f"XML {i+1} submission failed: {result.error_message}")
                    else:
                        submitted_count += 1  # Count as submitted in dry run

                except Exception as e:
                    errors.append(f"XML {i+1} generation failed: {e}")

            self._print(f"  Generated: {generated_count}, Submitted: {submitted_count}")

        except FileNotFoundError as e:
            errors.append(f"File not found: {e}")
        except Exception as e:
            errors.append(f"Unexpected error: {e}")
            if self.verbose:
                import traceback

                traceback.print_exc()

        return LaneResult(
            lane_name=lane.full_name,
            total_generated=generated_count,
            total_submitted=submitted_count,
            total_observations=observation_count,
            errors=errors,
        )

    def _save_xml(self, lane: TestLane, index: int, xml_string: str) -> None:
        """Save generated XML to output directory."""
        if not self.output_dir:
            return

        output_path = self.output_dir / lane.full_name
        output_path.mkdir(parents=True, exist_ok=True)

        file_path = output_path / f"{lane.name}_{index+1:04d}.xml"
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(xml_string)

    def _print(self, message: str) -> None:
        """Print a message."""
        print(message, file=sys.stderr)

    def _print_verbose(self, message: str) -> None:
        """Print a message if verbose mode is enabled."""
        if self.verbose:
            print(message, file=sys.stderr)

    def _print_summary(self, result: RunResult) -> None:
        """Print a summary of the run."""
        self._print("\n" + "=" * 50)
        self._print("Summary:")
        self._print(f"  Lanes run: {result.lanes_run}")
        self._print(f"  Lanes succeeded: {result.lanes_succeeded}")
        self._print(f"  XMLs generated: {result.total_xmls_generated}")
        if not self.dry_run:
            self._print(f"  Observations submitted: {result.total_observations_submitted}")

        # Print errors
        all_errors: list[str] = []
        for lane_result in result.lane_results:
            for error in lane_result.errors:
                all_errors.append(f"  [{lane_result.lane_name}] {error}")

        if all_errors:
            self._print("\nErrors:")
            for error in all_errors[:10]:  # Limit to first 10 errors
                self._print(error)
            if len(all_errors) > 10:
                self._print(f"  ... and {len(all_errors) - 10} more errors")

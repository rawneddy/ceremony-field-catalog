"""
Value generators for XML element content.

Provides realistic data generation using Faker and XSD constraints.
"""

import random
import re
import string
from datetime import date, timedelta
from decimal import Decimal
from typing import Any, Callable

from faker import Faker

from ..xsd.model import XsdSimpleType


class ValueGeneratorRegistry:
    """
    Registry of semantic type generators.

    Semantic types map field names/paths to appropriate value generators
    for realistic data (e.g., person.first_name -> Faker.first_name).
    """

    def __init__(self, seed: int | None = None):
        """
        Initialize the registry.

        Args:
            seed: Optional random seed for reproducibility
        """
        self.faker = Faker()
        if seed is not None:
            Faker.seed(seed)
            random.seed(seed)

        self._generators: dict[str, Callable[[], str]] = {}
        self._register_defaults()

    def _register_defaults(self) -> None:
        """Register built-in semantic generators."""
        f = self.faker

        self._generators.update(
            {
                # Person names
                "person.first_name": lambda: f.first_name(),
                "person.last_name": lambda: f.last_name(),
                "person.full_name": lambda: f.name(),
                "person.prefix": lambda: f.prefix(),
                "person.suffix": lambda: f.suffix(),
                # Identification
                "ssn": lambda: f.ssn(),
                "ssn.masked": lambda: f"XXX-XX-{f.random_number(digits=4, fix_len=True)}",
                # Contact info
                "email": lambda: f.email(),
                "phone_number": lambda: f.phone_number(),
                "phone.mobile": lambda: f.phone_number(),
                "phone.landline": lambda: f.phone_number(),
                # Address
                "address.street": lambda: f.street_address(),
                "address.street1": lambda: f.street_address(),
                "address.street2": lambda: f.secondary_address(),
                "address.city": lambda: f.city(),
                "address.state": lambda: f.state(),
                "address.state_abbr": lambda: f.state_abbr(),
                "address.zipcode": lambda: f.zipcode(),
                "address.zip": lambda: f.zipcode(),
                "address.country": lambda: f.country(),
                "address.full": lambda: f.address(),
                # Financial
                "account.number": lambda: f.bban(),
                "routing.number": lambda: f.aba(),
                "credit_card.number": lambda: f.credit_card_number(),
                "currency.code": lambda: f.currency_code(),
                "currency.amount": lambda: str(round(random.uniform(0, 10000), 2)),
                # Dates
                "date.past": lambda: f.date_this_decade().isoformat(),
                "date.future": lambda: f.future_date().isoformat(),
                "date.birth": lambda: f.date_of_birth(minimum_age=18, maximum_age=80).isoformat(),
                "date.today": lambda: date.today().isoformat(),
                "datetime.past": lambda: f.date_time_this_decade().isoformat(),
                "datetime.future": lambda: f.future_datetime().isoformat(),
                # Company/business
                "company.name": lambda: f.company(),
                "company.suffix": lambda: f.company_suffix(),
                "job.title": lambda: f.job(),
                # Internet
                "url": lambda: f.url(),
                "domain": lambda: f.domain_name(),
                "username": lambda: f.user_name(),
                "ipv4": lambda: f.ipv4(),
                # Text
                "text.word": lambda: f.word(),
                "text.sentence": lambda: f.sentence(),
                "text.paragraph": lambda: f.paragraph(),
                # Codes/IDs
                "uuid": lambda: f.uuid4(),
                "code.alpha": lambda: "".join(random.choices(string.ascii_uppercase, k=6)),
                "code.numeric": lambda: "".join(random.choices(string.digits, k=8)),
                "code.alphanumeric": lambda: "".join(
                    random.choices(string.ascii_uppercase + string.digits, k=8)
                ),
                # Vehicle
                "vehicle.vin": lambda: self._generate_vin(),
                "vehicle.make": lambda: random.choice(
                    ["Toyota", "Honda", "Ford", "Chevrolet", "BMW", "Mercedes", "Audi", "Tesla"]
                ),
                "vehicle.model": lambda: random.choice(
                    ["Sedan", "SUV", "Truck", "Coupe", "Hatchback", "Convertible", "Minivan"]
                ),
                "vehicle.year": lambda: str(random.randint(2010, 2025)),
                # Boolean-ish
                "boolean": lambda: random.choice(["true", "false"]),
                "yes_no": lambda: random.choice(["Yes", "No"]),
                "y_n": lambda: random.choice(["Y", "N"]),
            }
        )

    def _generate_vin(self) -> str:
        """Generate a VIN-like string."""
        chars = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789"
        return "".join(random.choices(chars, k=17))

    def generate(self, semantic_type: str) -> str:
        """
        Generate a value for a semantic type.

        Args:
            semantic_type: Type identifier like "person.first_name" or
                          parameterized like "decimal(100, 10000, 2)"

        Returns:
            Generated string value
        """
        # Handle parameterized types
        if "(" in semantic_type:
            return self._generate_parameterized(semantic_type)

        # Handle pattern: prefix
        if semantic_type.startswith("pattern:"):
            pattern = semantic_type[8:]
            return self._generate_from_pattern(pattern)

        # Look up in registry
        generator = self._generators.get(semantic_type)
        if generator:
            return generator()

        # Fallback to random string
        return self.faker.pystr(max_chars=20)

    def _generate_parameterized(self, semantic_type: str) -> str:
        """Generate value for parameterized semantic type."""
        match = re.match(r"(\w+)\((.*)\)", semantic_type)
        if not match:
            return self.faker.pystr(max_chars=20)

        func_name = match.group(1)
        params_str = match.group(2)

        # Parse parameters
        params = [p.strip() for p in params_str.split(",")]

        if func_name == "decimal":
            # decimal(min, max, decimals)
            min_val = float(params[0]) if len(params) > 0 else 0
            max_val = float(params[1]) if len(params) > 1 else 10000
            decimals = int(params[2]) if len(params) > 2 else 2
            value = random.uniform(min_val, max_val)
            return f"{value:.{decimals}f}"

        elif func_name == "integer":
            # integer(min, max)
            min_val = int(params[0]) if len(params) > 0 else 0
            max_val = int(params[1]) if len(params) > 1 else 1000
            return str(random.randint(min_val, max_val))

        elif func_name == "choice":
            # choice(val1, val2, val3, ...)
            return random.choice(params) if params else ""

        elif func_name == "date":
            # date(days_from_now_min, days_from_now_max)
            min_days = int(params[0]) if len(params) > 0 else -365
            max_days = int(params[1]) if len(params) > 1 else 365
            days = random.randint(min_days, max_days)
            return (date.today() + timedelta(days=days)).isoformat()

        elif func_name == "year":
            # year(min, max)
            min_year = int(params[0]) if len(params) > 0 else 2000
            max_year = int(params[1]) if len(params) > 1 else 2025
            return str(random.randint(min_year, max_year))

        elif func_name == "string":
            # string(length) or string(min_length, max_length)
            if len(params) == 1:
                length = int(params[0])
            else:
                min_len = int(params[0]) if len(params) > 0 else 5
                max_len = int(params[1]) if len(params) > 1 else 20
                length = random.randint(min_len, max_len)
            return self.faker.pystr(max_chars=length)[:length]

        return self.faker.pystr(max_chars=20)

    def _generate_from_pattern(self, pattern: str) -> str:
        """
        Generate a string matching a pattern template.

        Supports placeholders:
            {YYYY} - 4-digit year
            {YY} - 2-digit year
            {MM} - 2-digit month
            {DD} - 2-digit day
            {######} - N random digits
            {AAAAAA} - N random uppercase letters
            {seq:N} - N-digit sequential number (random for now)
        """
        result = pattern

        # Year placeholders
        year = str(random.randint(2020, 2025))
        result = result.replace("{YYYY}", year)
        result = result.replace("{YY}", year[2:])

        # Month/day placeholders
        result = result.replace("{MM}", f"{random.randint(1, 12):02d}")
        result = result.replace("{DD}", f"{random.randint(1, 28):02d}")

        # Digit placeholders (e.g., {######})
        while "{#" in result:
            match = re.search(r"\{(#+)\}", result)
            if match:
                count = len(match.group(1))
                digits = "".join(random.choices(string.digits, k=count))
                result = result.replace(match.group(0), digits, 1)
            else:
                break

        # Letter placeholders (e.g., {AAAAAA})
        while "{A" in result:
            match = re.search(r"\{(A+)\}", result)
            if match:
                count = len(match.group(1))
                letters = "".join(random.choices(string.ascii_uppercase, k=count))
                result = result.replace(match.group(0), letters, 1)
            else:
                break

        # Sequential placeholder
        while "{seq:" in result:
            match = re.search(r"\{seq:(\d+)\}", result)
            if match:
                digits = int(match.group(1))
                seq = "".join(random.choices(string.digits, k=digits))
                result = result.replace(match.group(0), seq, 1)
            else:
                break

        return result

    def has_semantic_type(self, semantic_type: str) -> bool:
        """Check if a semantic type is registered."""
        if "(" in semantic_type or semantic_type.startswith("pattern:"):
            return True
        return semantic_type in self._generators


class XsdTypeValueGenerator:
    """
    Generates values based on XSD type constraints.

    Falls back to sensible defaults when constraints are not specified.
    """

    def __init__(self, seed: int | None = None):
        self.faker = Faker()
        if seed is not None:
            Faker.seed(seed)
            random.seed(seed)

    def generate(self, type_def: XsdSimpleType | None) -> str:
        """
        Generate a value respecting XSD type constraints.

        Priority:
            1. Enumeration - pick from allowed values
            2. Pattern - generate matching string (simple handling)
            3. Base type with facets - respect min/max/length
            4. Base type fallback
        """
        if type_def is None:
            return self.faker.pystr(max_chars=20)

        # 1. Enumeration
        if type_def.enumeration:
            return random.choice(type_def.enumeration)

        # 2. Pattern (limited support)
        if type_def.pattern:
            return self._generate_from_regex_pattern(type_def.pattern)

        # 3. Base type with constraints
        base = type_def.base_type.lower() if type_def.base_type else "string"

        if base in ("integer", "int", "long", "short", "byte"):
            return self._generate_integer(type_def)
        elif base in ("decimal", "float", "double"):
            return self._generate_decimal(type_def)
        elif base in ("date",):
            return self._generate_date(type_def)
        elif base in ("datetime", "dateTime"):
            return self._generate_datetime(type_def)
        elif base in ("boolean",):
            return random.choice(["true", "false"])
        else:
            # String or unknown
            return self._generate_string(type_def)

    def _generate_integer(self, type_def: XsdSimpleType) -> str:
        """Generate an integer value."""
        min_val = int(type_def.min_value) if type_def.min_value is not None else 0
        max_val = int(type_def.max_value) if type_def.max_value is not None else 10000

        if type_def.total_digits:
            max_by_digits = 10 ** type_def.total_digits - 1
            max_val = min(max_val, max_by_digits)

        return str(random.randint(min_val, max_val))

    def _generate_decimal(self, type_def: XsdSimpleType) -> str:
        """Generate a decimal value."""
        min_val = float(type_def.min_value) if type_def.min_value is not None else 0.0
        max_val = float(type_def.max_value) if type_def.max_value is not None else 10000.0

        decimals = type_def.fraction_digits if type_def.fraction_digits is not None else 2

        value = random.uniform(min_val, max_val)
        return f"{value:.{decimals}f}"

    def _generate_date(self, type_def: XsdSimpleType) -> str:
        """Generate a date value."""
        return self.faker.date_this_decade().isoformat()

    def _generate_datetime(self, type_def: XsdSimpleType) -> str:
        """Generate a datetime value."""
        return self.faker.date_time_this_decade().isoformat()

    def _generate_string(self, type_def: XsdSimpleType) -> str:
        """Generate a string value."""
        min_len = type_def.min_length or 1
        max_len = type_def.max_length or 50

        length = random.randint(min_len, max_len)
        result = self.faker.pystr(min_chars=max(1, length), max_chars=max(length, 1))
        # Ensure we return something, trimmed to desired length
        if not result:
            result = "".join(random.choices("abcdefghijklmnopqrstuvwxyz", k=length))
        return result[:length] if len(result) > length else result

    def _generate_from_regex_pattern(self, pattern: str) -> str:
        """
        Generate string from regex pattern.

        This is a simplified implementation that handles common patterns.
        For full regex support, use the exrex library.
        """
        try:
            import exrex

            return exrex.getone(pattern, limit=50)
        except ImportError:
            # Fallback to simple patterns
            pass

        # Handle simple common patterns
        result = ""

        # [A-Z]{3} style
        if re.match(r"^\[A-Z\]\{(\d+)\}$", pattern):
            count = int(re.search(r"\{(\d+)\}", pattern).group(1))
            return "".join(random.choices(string.ascii_uppercase, k=count))

        # [0-9]{N} style
        if re.match(r"^\[0-9\]\{(\d+)\}$", pattern):
            count = int(re.search(r"\{(\d+)\}", pattern).group(1))
            return "".join(random.choices(string.digits, k=count))

        # Fallback
        return self.faker.pystr(max_chars=20)

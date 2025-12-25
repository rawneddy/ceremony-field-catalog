"""Allow running testgen as a module: python -m testgen"""

from .cli import main

if __name__ == "__main__":
    exit(main())

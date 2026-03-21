#!/usr/bin/env python
"""Django management utility."""
import os
import sys


def main():
    # Respect DJANGO_SETTINGS_MODULE env var; default to prod so local
    # developers must explicitly set it to dev — prevents accidental prod writes.
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.prod")
    from django.core.management import execute_from_command_line
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()

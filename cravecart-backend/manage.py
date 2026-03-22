#!/usr/bin/env python
"""Django management utility."""
import os
import sys


def main():
    # Default to DEV settings for safety.
    # On EC2 the systemd EnvironmentFile sets DJANGO_SETTINGS_MODULE=config.settings.prod
    # explicitly, so this default only matters when running manage.py locally
    # without the env file (e.g., during initial setup).
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")
    from django.core.management import execute_from_command_line
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()

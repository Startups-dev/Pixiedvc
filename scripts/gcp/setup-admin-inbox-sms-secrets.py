#!/usr/bin/env python3
"""Securely install dedicated Admin Inbox SMS runtime secrets."""

from __future__ import annotations

import getpass
import re
import secrets
import subprocess
import sys


PROJECT = "pixiedvc-production"
RUNTIME_SERVICE_ACCOUNT = "pixiedvc-production-runtime@pixiedvc-production.iam.gserviceaccount.com"
SECRET_INPUTS = (
    ("PRODUCTION_TWILIO_SMS_ACCOUNT_SID", "Twilio production Account SID (hidden): ", "^AC[0-9a-fA-F]{32}$"),
    ("PRODUCTION_TWILIO_SMS_AUTH_TOKEN", "Twilio production Auth Token (hidden): ", None),
    ("PRODUCTION_TWILIO_SMS_MESSAGING_SERVICE_SID", "Twilio production Messaging Service SID (hidden): ", "^MG[0-9a-fA-F]{32}$"),
)
ENCRYPTION_SECRET = "PRODUCTION_ADMIN_INBOX_SMS_ENCRYPTION_KEY"


class SetupError(RuntimeError):
    pass


def run_gcloud(args: list[str], input_value: str | None = None) -> tuple[int, str]:
    try:
        result = subprocess.run(
            ["gcloud", *args], input=input_value, stdout=subprocess.PIPE,
            stderr=subprocess.PIPE, text=True, check=False,
        )
    except FileNotFoundError as exc:
        raise SetupError("gcloud CLI is not installed or not on PATH.") from exc
    # stdout/stderr are captured and deliberately never echoed; secret values
    # are passed on stdin, not as command arguments or shell history.
    return result.returncode, result.stdout.strip()


def secret_exists(name: str) -> bool:
    code, _ = run_gcloud(["secrets", "describe", name, f"--project={PROJECT}", "--format=value(name)"])
    return code == 0


def ensure_secret(name: str) -> None:
    if secret_exists(name):
        return
    code, _ = run_gcloud(["secrets", "create", name, f"--project={PROJECT}", "--replication-policy=automatic"])
    if code:
        raise SetupError(f"Could not create Secret Manager secret {name}.")


def add_version(name: str, value: str) -> None:
    code, _ = run_gcloud(["secrets", "versions", "add", name, f"--project={PROJECT}", "--data-file=-"], value)
    if code:
        raise SetupError(f"Could not add a secret version for {name}.")


def grant_runtime_access(name: str) -> None:
    code, _ = run_gcloud([
        "secrets", "add-iam-policy-binding", name, f"--project={PROJECT}",
        f"--member=serviceAccount:{RUNTIME_SERVICE_ACCOUNT}",
        "--role=roles/secretmanager.secretAccessor", "--quiet",
    ])
    if code:
        raise SetupError(f"Could not grant production runtime access to {name}.")


def main() -> int:
    values: list[tuple[str, str]] = []
    for name, prompt, pattern in SECRET_INPUTS:
        value = getpass.getpass(prompt).strip()
        if not value or (pattern and re.fullmatch(pattern[1:-1], value) is None):
            raise SetupError(f"The supplied value for {name} has an invalid format.")
        values.append((name, value))

    encryption_key = secrets.token_urlsafe(48)
    values.append((ENCRYPTION_SECRET, encryption_key))
    for name, value in values:
        ensure_secret(name)
        add_version(name, value)
        grant_runtime_access(name)
        print(f"Installed Secret Manager version and runtime access for {name}.")

    print("SMS secrets are stored. No Cloud Run revision was created.")
    print("A subsequent established deployment will bind the SMS secrets without changing live-chat Twilio or Resend settings.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except SetupError as exc:
        print(str(exc), file=sys.stderr)
        raise SystemExit(1)

#!/usr/bin/env python3
"""Install Zoho Inbox secrets into production Secret Manager without echoing them."""

from __future__ import annotations

import getpass
import secrets
import subprocess
import sys


PROJECT = "pixiedvc-production"
RUNTIME_SERVICE_ACCOUNT = (
    "pixiedvc-production-runtime@pixiedvc-production.iam.gserviceaccount.com"
)
ZOHO_SECRETS = (
    ("PRODUCTION_ZOHO_MAIL_CLIENT_ID", "ZOHO_MAIL_CLIENT_ID", "prompt"),
    ("PRODUCTION_ZOHO_MAIL_CLIENT_SECRET", "ZOHO_MAIL_CLIENT_SECRET", "prompt"),
    ("PRODUCTION_ZOHO_MAIL_ENCRYPTION_KEY", "ZOHO_MAIL_ENCRYPTION_KEY", "generated"),
    ("PRODUCTION_ZOHO_MAIL_WEBHOOK_TOKEN", "ZOHO_MAIL_WEBHOOK_TOKEN", "generated"),
)
RESEND_WEBHOOK_SECRET = (
    "PRODUCTION_RESEND_WEBHOOK_SIGNING_SECRET",
    "RESEND_WEBHOOK_SIGNING_SECRET",
    "prompt",
)


class SetupError(RuntimeError):
    pass


def run_gcloud(args: list[str], input_value: str | None = None) -> tuple[int, str]:
    try:
        result = subprocess.run(
            ["gcloud", *args],
            input=input_value,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=False,
        )
    except FileNotFoundError as exc:
        raise SetupError("gcloud CLI is not installed or not on PATH.") from exc
    # Never print or propagate gcloud output; commands that add versions receive
    # secret values on stdin and their output is deliberately discarded.
    return result.returncode, result.stdout.strip()


def secret_exists(name: str) -> bool:
    code, _ = run_gcloud(
        ["secrets", "describe", name, f"--project={PROJECT}", "--format=value(name)"]
    )
    return code == 0


def active_version_exists(name: str) -> bool:
    code, output = run_gcloud(
        [
            "secrets",
            "versions",
            "list",
            name,
            f"--project={PROJECT}",
            "--filter=state=ENABLED",
            "--format=value(name)",
        ]
    )
    if code:
        raise SetupError(f"Could not inspect versions of Secret Manager secret {name}.")
    return bool(output)


def ensure_secret(name: str) -> None:
    if secret_exists(name):
        return
    code, _ = run_gcloud(
        [
            "secrets",
            "create",
            name,
            f"--project={PROJECT}",
            "--replication-policy=automatic",
        ]
    )
    if code:
        raise SetupError(f"Could not create Secret Manager secret {name}.")


def add_version(name: str, value: str) -> None:
    code, _ = run_gcloud(
        ["secrets", "versions", "add", name, f"--project={PROJECT}", "--data-file=-"],
        input_value=value,
    )
    if code:
        raise SetupError(f"Could not add a version to Secret Manager secret {name}.")


def grant_runtime_access(name: str) -> None:
    code, _ = run_gcloud(
        [
            "secrets",
            "add-iam-policy-binding",
            name,
            f"--project={PROJECT}",
            f"--member=serviceAccount:{RUNTIME_SERVICE_ACCOUNT}",
            "--role=roles/secretmanager.secretAccessor",
            "--quiet",
        ]
    )
    if code:
        raise SetupError(f"Could not grant the production runtime access to {name}.")


def collect_zoho_values() -> list[tuple[str, str | None, bool]]:
    values: list[tuple[str, str | None, bool]] = []
    client_id = getpass.getpass("Zoho Client ID (hidden): ").strip()
    client_secret = getpass.getpass("Zoho Client Secret (hidden): ").strip()
    if not client_id or not client_secret:
        raise SetupError("Client ID and Client Secret are both required.")

    for name, _, kind in ZOHO_SECRETS:
        if kind == "prompt":
            values.append((name, client_id if name.endswith("CLIENT_ID") else client_secret, False))
            continue
        if secret_exists(name) and active_version_exists(name):
            # Do not rotate encryption or endpoint-path keys on a rerun. A key
            # rotation could make stored OAuth tokens unreadable or break the URL.
            print(f"Preserving the existing active value for {name}.")
            values.append((name, None, True))
            continue
        generated = secrets.token_urlsafe(48)
        values.append((name, generated, True))

    return values


def collect_resend_webhook_value() -> list[tuple[str, str | None, bool]]:
    name, _, _ = RESEND_WEBHOOK_SECRET
    value = getpass.getpass("Resend webhook signing secret (hidden): ").strip()
    if not value:
        raise SetupError("A Resend-provided signing secret is required.")
    return [(name, value, False)]


def prepare_versions(values: list[tuple[str, str | None, bool]]) -> None:
    for name, value, generated in values:
        if value is None:
            continue
        if secret_exists(name) and active_version_exists(name):
            if generated:
                raise SetupError(f"Refusing to rotate active generated secret {name}.")
            answer = input(
                f"{name} already has an active version. Add a new version and make it latest? [y/N] "
            ).strip().lower()
            if answer != "y":
                raise SetupError("No secrets were changed; rerun when ready to confirm the update.")


def install(values: list[tuple[str, str | None, bool]]) -> None:
    # Preflight first so a declined replacement does not leave a partial setup.
    prepare_versions(values)
    for name, value, _ in values:
        ensure_secret(name)
        if value is not None:
            add_version(name, value)
        grant_runtime_access(name)
        action = "Installed a Secret Manager version and runtime access" if value is not None else "Verified the existing secret and runtime access"
        print(f"{action} for {name}.")


def main() -> int:
    if not sys.stdin.isatty():
        print("Run this helper directly in an interactive Terminal.", file=sys.stderr)
        return 2
    mode = sys.argv[1] if len(sys.argv) > 1 else "zoho"
    if len(sys.argv) > 2 or mode not in {"zoho", "--resend-webhook"}:
        print("Usage: python3 scripts/gcp/setup-zoho-production-secrets.py [--resend-webhook]", file=sys.stderr)
        return 2

    try:
        code, project = run_gcloud(
            ["projects", "describe", PROJECT, "--format=value(projectId)"]
        )
        if code or project != PROJECT:
            raise SetupError("Could not verify the expected production Google Cloud project.")

        if mode == "zoho":
            values = collect_zoho_values()
        else:
            values = collect_resend_webhook_value()
        install(values)
        print("Secret setup completed. No Cloud Run revision was created.")
        return 0
    except (SetupError, EOFError, KeyboardInterrupt) as exc:
        message = str(exc) if isinstance(exc, SetupError) else "Setup cancelled; no secret values were printed."
        print(message, file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

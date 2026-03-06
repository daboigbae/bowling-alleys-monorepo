#!/usr/bin/env bash
# Only allow Vercel to build when the deployment is for the main branch.
# Use this as the "Ignored Build Step" in Vercel: Project Settings → General → Ignored Build Step
# Command: bash scripts/vercel-only-main.sh
# Exit 0 = build, exit 1 = skip (no preview deployment)
if [ "$VERCEL_GIT_COMMIT_REF" = "main" ]; then
  exit 0
fi
exit 1

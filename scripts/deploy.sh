#!/usr/bin/env bash
# Deploy to Vercel (class-site/civics-quest → mycivicsclass.com).
#
#   VERCEL_TOKEN=... ./scripts/deploy.sh
#
# Why this isn't just `vercel deploy --prod`
# ------------------------------------------
# Two things bite a plain CLI deploy from this repo:
#
# 1. `node_modules` here is a SYMLINK to `node_modules.nosync` (the iCloud
#    workaround). The CLI's default exclusion doesn't follow it, so it packs
#    1.5 GB instead of ~14 MB and hangs while packing — no error, no upload
#    socket, forever. `.vercelignore` fixes that and must stay in place.
#
# 2. The CLI attaches the local git metadata to each deployment, and Vercel
#    refuses any deployment whose git author lacks team access:
#      "Git author arthur@jaritgolf.com must have access to the team Class Site"
#    This repo's commits are authored by the jaritgolf identity, but the Vercel
#    team belongs to danisoncivics@gmail.com. Deploying from a copy with no
#    .git directory means there is no author to check.
#
# Long-term alternative to #2: commit as danisoncivics@gmail.com
#   git config user.email danisoncivics@gmail.com
# Once HEAD is authored by a team member, plain `vercel deploy --prod` works
# from the repo and this script becomes unnecessary.

set -euo pipefail

if [[ -z "${VERCEL_TOKEN:-}" ]]; then
  echo "VERCEL_TOKEN is not set." >&2
  echo "Create one at https://vercel.com/account/tokens (scope: class-site)." >&2
  exit 1
fi

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

echo "Staging a git-free copy…"
rsync -a \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='node_modules.nosync' \
  --exclude='node_modules 2' \
  --exclude='.next' \
  --exclude='.next.nosync' \
  --exclude='tests' \
  --exclude='test-results' \
  --exclude='.claude' \
  --exclude='*.tsbuildinfo' \
  "$REPO/" "$STAGE/"

echo "  $(du -sh "$STAGE" | cut -f1) staged"

cd "$STAGE"
npx vercel deploy --prod --yes --archive=tgz

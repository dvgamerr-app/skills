---
name: repo-showcase
description: Packages a GitHub project for public launch. Rewrites the repo description and topics, writes a selling-point README (English plus Thai) with a star call to action, builds a GitHub Pages landing site, captures screenshots from mock data, makes self-hosting a one-command docker compose, then opens a Thai PR and a draft release. Use when the user says "ทำ github page", "แก้ readme ใหม่", "แก้ description setting", "ทำให้น่าสนใจ", "ให้กด star", "ใส่ screenshot", "ทำให้ deploy ง่าย", "make the repo launch-ready", or "polish this repo for open source". Do NOT use for only editing a PR body (use github:pr-rewrite) or for plain gh operations (use github:cli).
metadata:
  version: 1.0.0
---

# Repo Showcase

Turns a working project into one people can understand in 10 seconds and run in 5 minutes.
The order matters: make deployment real first, then document it, so the README never promises
something the repo cannot do.

## Critical

- **Never claim what you have not made true.** If the README says "deploy in 5 minutes", the
  compose file, env defaults and published image must actually support it. Fix the code first.
- **Screenshots use mock data only.** No real tokens, IDs, emails or hostnames. Run an isolated
  DB outside the repo and never touch the user's `.env`.
- **Outward-facing steps need authorization.** Repo settings, pushing, opening a PR and
  publishing a release are visible to others. If the user already said "do it, report after",
  proceed. Otherwise prepare everything in the working tree and ask once.
- **Respect the user's rules:** commit messages in English, PR descriptions in the language they
  require (Thai for this user), no AI attribution lines, commits split by topic, unrelated
  working-tree changes left alone. Read the project's CLAUDE.md first.
- **Publish releases as drafts** until the PR is merged: publishing a tag can trigger image
  builds and deploys.

## Instructions

### Step 1: Understand the real product and the gaps

Read README, package manifest, Dockerfile, CI workflows, `.env.example`, CLAUDE.md. Check the
repo's real name: `git remote -v` and `gh repo view --json nameWithOwner,description,repositoryTopics`.
The remote and the GitHub name can differ after a rename. If they do, fix the remote.

Write down the one-sentence selling point (for example "self-hosted API wrapper that manages
every bot from one account") and list what blocks a stranger from deploying: build-time secrets
baked into the image, a single CPU architecture, a required external database, missing
healthcheck, many required env vars.

If the selling point or the target audience is unclear, ask the user once before writing.

### Step 2: Make deployment genuinely easy

Aim for three required settings at most and one command. Typical fixes:

- Move build-time public config to runtime (serve it from a config endpoint) so a prebuilt image
  works for everyone. Keep the old variable as a fallback.
- Derive values instead of asking for them twice (an ID that is a prefix of another).
- Default to an embedded database in a declared volume; make external DB optional.
- Publish multi-arch images (`linux/amd64,linux/arm64`) with the QEMU action.
- Add a HEALTHCHECK, a non-root user and a `docker-compose.yml` with required variables using
  the `${VAR:?message}` form so mistakes fail loudly. See `assets/docker-compose.example.yml`.
- Offer optional automatic HTTPS (Caddy `reverse-proxy` profile) when the product needs HTTPS.
- Rewrite `.env.example` so required values come first and optional ones are commented out. Check
  that copying it to `.env` cannot silently override compose defaults.

Add or update a test for any behaviour change, then run the project's full check.

### Step 3: Capture screenshots (delegate if large)

Follow `references/screenshots.md`. Output to `docs/screenshots/*.png`, mobile viewport if the app
is mobile-first, 2x scale, quantised below about 100 KB each. View a few before moving on.

### Step 4: Write the README

Follow `references/readme-structure.md`. English `README.md` as the default, a translated
`README.<lang>.md` linked from the top, and the old long README moved to `docs/` rather than
deleted. Add `docs/self-hosting.md` for everything beyond the quick start.

### Step 5: Landing page on GitHub Pages

Copy `assets/pages.yml` into `.github/workflows/` (adjust the icon path to the project) and
**design `site/index.html` from scratch for this product every time**. Do not reuse a previous
landing page or its layout. Choose the look (palette, typography, layout, imagery) from the
product's own brand, audience and screenshots. `references/landing-requirements.md` lists only
the minimum content and technical requirements the page must satisfy.

Check `gh api repos/OWNER/REPO/pages` first: Pages may already be enabled with a custom domain,
in which case use that URL everywhere instead of `owner.github.io`. Pin action SHAs (look up
with `gh api repos/ORG/ACTION/commits/TAG --jq .sha`).

### Step 6: Repo settings

Run, after confirming the real repo name:

```powershell
gh repo edit OWNER/REPO --description "One sentence selling point" --homepage "https://PAGES_URL/"
gh repo edit OWNER/REPO --add-topic topic-a --add-topic topic-b
```

Remove stale topics from the old stack first (`--remove-topic`). Use about 10 to 14 specific
topics: the platform, the language or runtime, "self-hosted", "docker", the use case. If Pages
is not enabled, `gh api -X POST repos/OWNER/REPO/pages -f build_type=workflow`.

### Step 7: Commit, push, PR, draft release

1. New branch. Commit by topic, for example: runtime config, deployment files, Pages site,
   docs. Stage explicit paths only.
2. Push, then `gh pr create --body-file` with a Thai description: summary, changes, how it was
   tested, what was not tested, and post-merge steps. Do not add an attribution footer.
3. Pick a version that does not collide with existing tags (`gh release list`, `git tag`) and
   bump the manifest version.
4. `gh release create vX.Y.Z --draft --target BRANCH --notes-file FILE`. Tell the user to retarget
   it to the default branch and publish after the merge.

### Step 8: Verify and report

Run the project's check command and a production-mode smoke test on a free port; stop every
process you started. Report in the user's language: what changed on GitHub, what is in the PR,
what was verified, what was not (for example Docker unavailable locally), and the manual steps
left (merge, publish the release, set new CI variables).

## Examples

### Example: full launch polish
User says: "แก้ description, ทำ github page, ใส่ screenshot, แก้ readme ให้น่าสนใจ ให้กด star, ทำให้ deploy ง่ายจริงๆ"

Actions: audit blockers, move build-time config to runtime, add compose and multi-arch CI,
run an isolated mock-data instance and capture screenshots, write the READMEs and guide, build
the Pages site and workflow, edit description and topics, commit by topic, open the Thai PR,
create the draft release.

Result: one PR, a draft release, updated repo settings, and a short report.

### Example: README only
User says: "แก้ readme ใหม่ให้ดูน่าสนใจ"

Actions: do Steps 1, 3 (if screenshots are missing) and 4. Skip deployment changes unless the
README would otherwise promise something the repo cannot do.

## Troubleshooting

### Error: Pages workflow fails with "Pages not enabled"
Cause: the site uses the workflow source but Pages was never created.
Solution: `gh api -X POST repos/OWNER/REPO/pages -f build_type=workflow`. A 409 means it already
exists; run `gh api -X PUT repos/OWNER/REPO/pages -f build_type=workflow` to switch the source.

### Error: a smoke test sees the wrong server
Cause: another process (often a WSL or Docker port relay) already listens on the fixed port.
Solution: check `netstat -ano` for the port and its owner, then test on a different port.

### Error: scripted edits do not match files on Windows
Cause: the working tree uses CRLF. Normalise to LF before replacing and restore CRLF on write.

### Error: `docker compose` says a variable is required
Cause: the compose file intentionally uses the `${VAR:?...}` form.
Solution: fill the three required values in `.env`; this is the designed failure mode.

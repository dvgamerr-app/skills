---
name: setup
description: Applies the open-source org baseline to one or more GitHub repositories. Sets general settings (main default branch, Issues and PRs open to all, Wiki/Discussions/Projects off, merge commit only), installs a Qlty-based PR check workflow with build/tests, a PR Gate and a sticky PR dashboard, adds FUNDING.yml, then applies a main-branch ruleset that requires review and the PR Gate. Use when the user says "setup repo", "ตั้งค่า repo", "ตั้ง repo ให้ตาม org", "ตั้ง ruleset", "ใส่ pr check", "เปิด branch protection", "ทำ repo opensource ให้ได้มาตรฐาน", or "apply repo settings". Do NOT use for launch polish such as README, Pages or screenshots (use github:showcase) or for only editing a PR body (use github:pr-rewrite).
metadata:
  version: 1.1.0
---

# Repo Setup

Brings a repository up to the org's open-source baseline: same settings, same merge rules, same
PR checks on every repo. Quality checks run on the free Qlty CLI inside GitHub Actions. GitHub's
paid native Security/Quality products and Qlty Cloud are not used.

Files in this skill:

- `assets/repository-settings.json`: general settings for `PATCH repos/OWNER/REPO`
- `assets/ruleset-main.json`: the `main` ruleset (name `main-pr-security-quality`)
- `assets/github/workflows/pr-check.yml`: Build and Tests, Qlty Analysis, PR Gate, PR Report
- `assets/github/FUNDING.yml.example`: funding file template
- `assets/repos.txt`: example target list
- `scripts/apply-repo-settings.js` (Bun + `gh`): previews, applies and verifies settings and the ruleset
- `references/checklist.md`: manual steps the API cannot do, plus the ruleset checklist

## Critical

- **Settings and rulesets are outward-facing.** They change how everyone works on the repo.
  Always show the preview first and apply only after the user agrees, unless they already said
  "apply it, report after".
- **Apply the ruleset last.** It requires the `PR Gate` check. If the workflow has never run on
  the repo, every PR is blocked. Order: settings, workflow PR, PR Gate runs, then ruleset.
- **Never pass with missing checks.** Do not add `--if-present` or `|| true` to CI commands. A
  missing script must fail.
- **The script does not touch** user permissions, org base permissions, interaction limits,
  subscriptions or billing. Writes are not transactional: what succeeded before an error stays.
- **Respect the user's rules:** commit messages in English, PR descriptions in Thai, no AI
  attribution lines, stage explicit paths only. Read the project's CLAUDE.md first.
- **Do the work in the order below; do not stall on design questions.** Step 3 (workflow, `qlty
  init`, Qlty config) is part of this skill, not an optional follow-up. If the stack lacks a
  check the template expects (for example `typecheck` in a plain JavaScript project), drop that
  step, say so in the report, and keep going. Ask only about outward-facing changes
  (Steps 2 and 5, push, PR).
- **`-Apply` may be blocked by the auto-mode classifier** (it modifies shared GitHub settings),
  and "did you run it?" does not count as approval. Show the preview, get an explicit "apply",
  and if the call is still denied hand the user the exact command to run. Never reword the
  command to get around the denial. Never state a root cause you did not verify (for a 422,
  say "likely X, not confirmed").
- **Run scripts with the user's shell in mind.** Windows may have PowerShell script execution
  disabled and the user's terminal may be nushell. See Step 2.
- **No Python on the Windows box.** Generate or patch files with `bun`/`node` or `sed`, not
  `python`.

## Instructions

### Step 1: Pick targets and check access

Get the target `owner/repo` list from the user (one repo or a whole org). For an org-wide run,
list candidates with `gh repo list ORG --no-archived --source --limit 200 --json nameWithOwner,visibility`
and confirm the list with the user. Check `gh auth status`; the token needs admin on each repo.
Write targets to a temp file in the scratchpad using the format of `assets/repos.txt`, or pass
`-Repo owner/a,owner/b`.

Every repo must already have a `main` branch. The script never renames or creates branches; if
the default is `master`, ask before renaming with `gh api -X POST repos/OWNER/REPO/branches/master/rename -f new_name=main`.

### Step 2: Preview and apply general settings

The script is a Bun program, so it runs the same in any shell (bash, nushell, PowerShell) and
needs no execution-policy change. Run it yourself; do not hand the user a command to paste.

```bash
bun <this skill>/scripts/apply-repo-settings.js --repos-file repos.txt --phase settings          # preview only
bun <this skill>/scripts/apply-repo-settings.js --repos-file repos.txt --phase settings --apply  # write and verify
```

Options: `--repo owner/a,owner/b`, `--repos-file`, `--phase settings|ruleset|all`, `--apply`,
`--config-dir`. The script refuses archived repos and repos without admin, PATCHes only the
settings that differ (a repo already at baseline is not written), then reads every setting back
to verify. To change the baseline, edit a copy of the JSON files and pass `--config-dir`.

Notes:

- If the `--apply` call is denied by the permission classifier, stop and ask the user to approve
  it; only then fall back to giving them the command.
- Before applying, read the live values with `gh api repos/OWNER/REPO` and compare them with
  `assets/repository-settings.json`. If everything already matches, skip the apply and report
  the repo as already compliant.

### Step 3: Install the PR check workflow (per repo)

In a clone of the target repo, on a new branch:

1. Copy `assets/github/workflows/pr-check.yml` to `.github/workflows/pr-check.yml`. Remove or
   replace any older CodeQL, Dependency Review or overlapping PR workflow.
2. Adapt the `ci` job to the real stack. The template is Node/npm and expects `package-lock.json`
   plus the scripts `lint`, `format:check`, `typecheck`, `test:ci`, `build`. For Bun, Go,
   Python or others, swap the setup action and commands, pin action SHAs
   (`gh api repos/ORG/ACTION/commits/TAG --jq .sha`), and keep the job name `Build and Tests`
   because the PR Report looks it up by name. `test:ci` must run real tests. If a script is
   missing in the project, add it (for example `"test:ci": "bun test"`) rather than delete the
   step. The one exception is a check the stack does not have at all, such as `typecheck` in a
   plain JavaScript project: remove that step and note it in the PR and report. Match the
   project's own script names (a repo whose `format` already runs `prettier --check` needs no
   `format:check`). Pin Bun with `oven-sh/setup-bun` and the exact `packageManager` version.
3. Run `qlty init --yes` locally (the CLI is usually already installed; check `qlty --version`).
   Set `QLTY_TELEMETRY=off`: without network it floods the output with `api.segment.io` DNS
   errors, which are harmless. Then:
   - Review the detected plugins and add the security, dependency and secret scanners the
     project needs (for example `osv-scanner`; `trufflehog` and `zizmor` are usually detected).
   - If `qlty check` fails in ESLint with `Cannot find package 'globals'` (or similar), qlty
     runs ESLint from its own cache. Add every package the `eslint.config.*` imports to the
     eslint plugin's `package_filters`, for example
     `package_filters = ["eslint", "prettier", "@eslint/js", "eslint-plugin-perfectionist", "globals"]`.
   - Run `qlty check --all --no-fix --summary` and fix or baseline the backlog. Baseline with
     `[[exclude]]` (`plugins`, `file_patterns`). `[[ignore]]` is deprecated and its `reason`
     key is rejected. For a single Dockerfile rule use an inline `# hadolint ignore=DL3018`.
     Do not rewrite an existing production deploy workflow inside this PR to clear findings:
     baseline it and list the findings in the report as separate hardening work.
   - Commit `.qlty/qlty.toml` **and** `.qlty/.gitignore` and `.qlty/configs/` (the ignore file
     whitelists them). CI never runs `qlty init` by itself.
   - The local run can miss findings that CI reports: `actionlint` runs `shellcheck` only if it
     is installed (`SC2086` in an existing workflow appeared only on CI). Check `shellcheck
     --version`; if absent, expect extra `actionlint` findings on existing workflows and
     baseline them with the same `[[exclude]]` (`plugins = ["zizmor", "actionlint"]`). Read the
     real output of the failed CI step with `gh run view RUN --job JOB --log` (`--log-failed`
     shows only the exit code, not the findings).
   - Local `prettier` failures on many files are usually CRLF from `core.autocrlf=true`, not
     real. Confirm with `git ls-files --eol <file>` (index `i/lf`, worktree `w/crlf`) and
     `git show origin/main:<file> | prettier --stdin-filepath <file>`. Do not "fix" them.
   - A husky/lint-staged hook that runs `prettier --write .` rewrites the whole worktree on
     commit. Afterwards check with `git diff --ignore-cr-at-eol --stat` that no real content
     changed before assuming the files were modified, and never stage them.
4. If the user gives a real funding link, add `.github/FUNDING.yml` from
   `assets/github/FUNDING.yml.example`. Never commit a placeholder link.
5. Run `actionlint` on the workflow if available; if it is not installed, say it was skipped.
6. Verify locally with the same commands CI runs (install, lint, format, `test:ci`, build) and
   `qlty check`. Fix new `zizmor` findings in the new workflow itself. The template compares
   the PR author's numeric id (`github.event.pull_request.user.id == 49699333` for Dependabot)
   instead of `github.actor == 'dependabot[bot]'`, because zizmor flags the actor-name check
   as spoofable (`zizmor/bot-conditions`). Keep it that way.

### Step 4: Open the trial PR

Commit by topic (workflow, Qlty config, funding), push, and open a PR with a Thai description:
summary, what changed, how it was tested, what is left. Wait for the run with
`gh pr checks --watch` and confirm `PR Gate` reports a result and the sticky dashboard comment
appears. Fix failures before going on.

### Step 5: Apply the ruleset

Only after `PR Gate` has run on the repo:

```bash
bun <this skill>/scripts/apply-repo-settings.js --repos-file repos.txt --phase ruleset          # preview
bun <this skill>/scripts/apply-repo-settings.js --repos-file repos.txt --phase ruleset --apply
```

The script updates the existing ruleset with the same name instead of creating a duplicate. Then
open a test change that fails a test or Qlty check and confirm merge is blocked.

### Step 6: Manual checklist and report

Walk the user through `references/checklist.md` for what the API cannot set (Sponsorships,
disabling native Security/Quality features, Actions permissions, org overrides). Report in Thai:
repos changed, PR links, what was verified, what failed, and the manual steps left.

## Examples

### Example: one new repo
User says: "setup repo dvgamerr-app/foo ให้ตาม org หน่อย"

Actions: check admin and `main`, preview then apply settings, add the workflow adapted to the
stack plus Qlty config, open the Thai PR, wait for PR Gate, apply the ruleset, hand over the
manual checklist.

Result: settings applied and verified, one PR with checks green, an active ruleset.

### Example: settings only across an org
User says: "ตั้ง settings ทุก repo ใน org dvgamerr-app"

Actions: list non-archived source repos, confirm the list, run the Settings phase preview, then
apply. Skip the ruleset for repos that do not have the workflow yet and say which ones.

## Troubleshooting

### Error: every PR is blocked waiting for "PR Gate"
Cause: the ruleset was applied before the workflow ran, or the `gate` job was renamed.
Solution: merge the workflow PR first (an admin may temporarily set the ruleset to `disabled`),
and keep the job name `PR Gate` with `integration_id` 15368 (GitHub Actions).

### Error: a solo maintainer cannot merge their own PR
Cause: the ruleset requires one approval and has no bypass actors; GitHub does not let authors
approve their own PR.
Solution: ask the user whether to set `required_approving_review_count` to 0 for that repo, or
add a bypass actor in a copy of `ruleset-main.json` passed with `--config-dir`. Do not change it
silently.

### Error: `gh: Validation Failed (HTTP 422)` on the settings PATCH
Cause: not confirmed. Most likely one field in the payload is not writable through the API
(`pull_request_creation_policy` is the suspect), and it was sent even though the repo already
had every value. Older script versions PATCHed the whole file.
Solution: read the live repo (`gh api repos/OWNER/REPO`). If it already matches
`repository-settings.json`, nothing needs writing. The current script only PATCHes differing
fields; if a real difference still returns 422, bisect by sending one field at a time.

### Error: PowerShell "running scripts is disabled" or nushell "Invalid literal"
Cause: the old `Apply-RepoSettings.ps1` hit the execution policy, an empty `$PSScriptRoot`, and
nushell escape rules. The script is now Bun JavaScript, so none of these apply.
Solution: use `scripts/apply-repo-settings.js`. If a Windows path still fails in nushell, use
single quotes.

### Error: "Setting verification failed: <name>"
Cause: an org policy overrides the repo setting, or the API version does not support the field.
Solution: check the org settings for that feature. Earlier successful writes stay applied.

### Error: Qlty job fails with "Run qlty init locally"
Cause: `.qlty/qlty.toml` is not committed.
Solution: do Step 3.3 in the target repo and commit the config.

### Error: no dashboard comment on a fork or Dependabot PR
Cause: those runs get a read-only token. This is by design; the report is in the Actions summary.

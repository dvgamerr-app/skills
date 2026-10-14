---
name: setup
description: Applies the open-source org baseline to one or more GitHub repositories. Sets general settings (main default branch, Issues and PRs open to all, Wiki/Discussions/Projects off, merge commit only), installs a Qlty-based PR check workflow with build/tests, a PR Gate and a sticky PR dashboard, adds FUNDING.yml, then applies a main-branch ruleset that requires review and the PR Gate. Use when the user says "setup repo", "ตั้งค่า repo", "ตั้ง repo ให้ตาม org", "ตั้ง ruleset", "ใส่ pr check", "เปิด branch protection", "ทำ repo opensource ให้ได้มาตรฐาน", or "apply repo settings". Do NOT use for launch polish such as README, Pages or screenshots (use github:showcase) or for only editing a PR body (use github:pr-rewrite).
metadata:
  version: 1.0.0
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
- `scripts/Apply-RepoSettings.ps1`: previews, applies and verifies settings and the ruleset
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

```powershell
$S = "<this skill>\scripts\Apply-RepoSettings.ps1"
& $S -ReposFile .\repos.txt -Phase Settings          # preview only
& $S -ReposFile .\repos.txt -Phase Settings -Apply   # write and verify
```

The script refuses archived repos and repos without admin, then reads every setting back to
verify. To change the baseline, edit a copy of the JSON files and pass `-ConfigDir`.

### Step 3: Install the PR check workflow (per repo)

In a clone of the target repo, on a new branch:

1. Copy `assets/github/workflows/pr-check.yml` to `.github/workflows/pr-check.yml`. Remove or
   replace any older CodeQL, Dependency Review or overlapping PR workflow.
2. Adapt the `ci` job to the real stack. The template is Node/npm and expects `package-lock.json`
   plus the scripts `lint`, `format:check`, `typecheck`, `test:ci`, `build`. For Bun, Go,
   Python or others, swap the setup action and commands, pin action SHAs
   (`gh api repos/ORG/ACTION/commits/TAG --jq .sha`), and keep the job name `Build and Tests`
   because the PR Report looks it up by name. `test:ci` must run real tests. If a script is
   missing in the project, add it rather than delete the step.
3. Run `qlty init` locally, review the detected plugins and config, add the security,
   dependency and secret scanners the project needs, then run `qlty check --all --no-fix` and
   fix or baseline the backlog. Commit `.qlty/qlty.toml` and its supporting configs. CI never
   runs `qlty init` by itself.
4. If the user gives a real funding link, add `.github/FUNDING.yml` from
   `assets/github/FUNDING.yml.example`. Never commit a placeholder link.
5. Run `actionlint` on the workflow if available.

### Step 4: Open the trial PR

Commit by topic (workflow, Qlty config, funding), push, and open a PR with a Thai description:
summary, what changed, how it was tested, what is left. Wait for the run with
`gh pr checks --watch` and confirm `PR Gate` reports a result and the sticky dashboard comment
appears. Fix failures before going on.

### Step 5: Apply the ruleset

Only after `PR Gate` has run on the repo:

```powershell
& $S -ReposFile .\repos.txt -Phase Ruleset          # preview
& $S -ReposFile .\repos.txt -Phase Ruleset -Apply
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
add a bypass actor in a copy of `ruleset-main.json` passed with `-ConfigDir`. Do not change it
silently.

### Error: "Setting verification failed: <name>"
Cause: an org policy overrides the repo setting, or the API version does not support the field.
Solution: check the org settings for that feature. Earlier successful writes stay applied.

### Error: Qlty job fails with "Run qlty init locally"
Cause: `.qlty/qlty.toml` is not committed.
Solution: do Step 3.3 in the target repo and commit the config.

### Error: no dashboard comment on a fork or Dependabot PR
Cause: those runs get a read-only token. This is by design; the report is in the Actions summary.

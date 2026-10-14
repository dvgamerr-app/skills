# Repo setup checklist

Walk through these with the user after Step 5. Tick only what was actually checked.

## Contents

- Baseline settings
- Merge permissions
- What the PR checks do
- Ruleset checklist
- Migrating from an older setup and turning off native features
- Cost note
- References

## Baseline settings

Applied by `assets/repository-settings.json`: default branch `main`, Wiki off, Issues on for all
users, Discussions off, Projects off, Pull requests on for all users, merge commits on with the
PR title, squash merge off.

Not settable here: Sponsorships. Turn it on in Settings > General > Features > Sponsorships and
commit a real `.github/FUNDING.yml`.

## Merge permissions

Only people with Write, Maintain or Admin can merge, and only through the ruleset. Past
contributions do not grant merge rights. Private repos still need explicit access.

## What the PR checks do

- `qlty check --all --no-fix --fail-level fmt`: blocking, based on the committed plugins and
  config.
- `qlty smells --all --no-snippets`: duplication, complexity and code smells, informational.
- `qlty metrics --all --max-depth=2 --sort complexity`: codebase metrics, informational.
- A command error in any of the three fails the PR Gate. Smells and metrics findings have no
  numeric threshold yet.
- `--all` checks the whole repo, so clear or baseline the backlog before enforcing the ruleset.
- The Qlty install action is pinned by SHA, but the binary version the installer picks still
  follows upstream.
- `check`, `smells` and `metrics` do not cover every security category. Add scanner plugins
  through Qlty and confirm they actually run.

Reporting:

- A sticky PR comment (`marocchino/sticky-pull-request-comment`) is updated in place with a
  status table, commit, run link and collapsible Qlty details.
- The Actions summary and raw artifacts are kept 14 days. No report files are committed.
- Fork and Dependabot PRs get a read-only token: the report is in the Actions summary only.
  Commenting on those needs a trusted workflow or a GitHub App.

## Ruleset checklist

- [ ] Targets `main`, enforcement active, no bypass actors
- [ ] Require PR, 1 approval, dismiss stale reviews, last-push approval, resolve conversations
- [ ] Required check `PR Gate` from GitHub Actions (integration_id 15368), branch up to date
- [ ] Block force push and deletion; `main` uses merge commits
- [ ] No code_scanning, code_quality, native coverage or secret-scanning rules
- [ ] A failing test or Qlty check was tried and merge was blocked
- [ ] Merge queue off; if it is turned on later, add and test the `merge_group` trigger first
- [ ] Add a real CODEOWNERS file before turning on `require_code_owner_review`

## Migrating from an older setup and turning off native features

- [ ] Replace the old workflow and delete any CodeQL or Dependency Review workflow still running
- [ ] Apply the ruleset phase; the managed name stays `main-pr-security-quality` so the old
      ruleset is updated in place and its native scanning rules are removed
- [ ] Check other rulesets, classic branch protection and org rules that may still require
      native checks
- [ ] Turn off CodeQL default setup and GitHub Code Quality in Settings if they were on. Deleting
      a workflow does not turn these off
- [ ] To drop native Security/Quality entirely, turn off Code Security, Secret Protection,
      secret scanning and push protection, Dependabot alerts and security updates, and the
      dependency graph, as permissions and policy allow
- [ ] Delete an old `dependabot.yml` if version-update automation is no longer wanted; this
      baseline does not ship one
- [ ] Check the org security configuration does not turn features back on, and check
      Billing/Subscriptions. The script does not cancel subscriptions or confirm charges stopped
- [ ] GitHub Actions enabled, the used actions allowed, default workflow token read-only
- [ ] Sponsorships on with a real funding link; no interaction limit that conflicts with
      Issues/PRs open to all users

## Cost note

Qlty CLI needs no Qlty Cloud account here, but GitHub Actions minutes and artifact storage
still count against the account's quota and pricing. Do not tell the user it is entirely free.

## References

- [Qlty action](https://github.com/qltysh/qlty-action)
- [qlty check](https://docs.qlty.sh/cli/commands/check), [smells](https://docs.qlty.sh/cli/commands/smells), [metrics](https://docs.qlty.sh/cli/commands/metrics)
- [Sticky PR comment](https://github.com/marocchino/sticky-pull-request-comment)
- [Repository API](https://docs.github.com/en/rest/repos/repos), [Ruleset API](https://docs.github.com/en/rest/repos/rules)

# dvgamerr-skills

A Claude Code plugin marketplace with my personal skills. Each plugin lives in `plugins/<name>/`
and bundles its skill under `skills/<name>/`.

| Plugin | What it does |
|---|---|
| [repo-showcase](plugins/repo-showcase/skills/repo-showcase/SKILL.md) | Packages a GitHub project for launch: repo description and topics, a selling-point README, a GitHub Pages site, mock-data screenshots, one-command self-hosting, a Thai PR and a draft release. |

## Install (Claude Code)

Add the marketplace once, then install the plugins you want. Run these in your shell:

```bash
claude plugin marketplace add dvgamerr-app/skills
claude plugin install repo-showcase@dvgamerr-skills
```

Or inside a session: `/plugin marketplace add dvgamerr-app/skills`, then
`/plugin install repo-showcase@dvgamerr-skills`. In a session, run `/reload-plugins` or restart
to load it.

`dvgamerr-app/skills` is the GitHub `owner/repo` that hosts this folder, so push it there first.
To use a local clone instead, point at the folder:

```powershell
claude plugin marketplace add E:\.dvgamerr-app\skills
claude plugin install repo-showcase@dvgamerr-skills
```

With a local path, edits take effect at the next session start or after `/reload-plugins`.

### Use it

The skill runs as `/repo-showcase:repo-showcase`, and Claude also loads it on its own when you
ask for things like "ทำ github page", "แก้ readme ใหม่ ให้กด star" or "make this repo
launch-ready". Check with `claude plugin list` (it should show `repo-showcase@dvgamerr-skills`
as enabled) and `claude plugin details repo-showcase`.

### Update and remove

```bash
claude plugin marketplace update dvgamerr-skills
claude plugin marketplace remove dvgamerr-skills   # also uninstalls its plugins
```

Bump `version` in the plugin's `plugin.json` when you release a change so installed copies
update.

### Requirements for repo-showcase

- [GitHub CLI](https://cli.github.com/), signed in with `gh auth login`
- [Bun](https://bun.sh/) or Node for small scripts
- Docker, only if the target project ships a container
- Chrome plus Playwright for the screenshot step (installed in a temp directory, never in the
  target repo)

## Install (Codex CLI, untested)

Codex reads the same `.claude-plugin/marketplace.json`, and each plugin also ships a
`.codex-plugin/plugin.json`. Register the marketplace from the CLI, then install the plugin from
the Plugins directory in the Codex app:

```bash
codex plugin marketplace add dvgamerr-app/skills
```

I have not run this against Codex yet. Check the
[Codex plugin docs](https://developers.openai.com/codex/plugins/build) if it does not appear.

## Layout

```
.claude-plugin/marketplace.json      # catalog: name, owner, plugins[]
plugins/
└── repo-showcase/
    ├── .claude-plugin/plugin.json   # Claude Code manifest
    ├── .codex-plugin/plugin.json    # Codex manifest (same content)
    └── skills/repo-showcase/
        ├── SKILL.md
        ├── references/
        └── assets/
```

## Add a new skill

1. Create `plugins/<name>/skills/<name>/SKILL.md` (use the `skill-forge` skill), plus
   `plugins/<name>/.claude-plugin/plugin.json` with the same `name`.
2. Add an entry to `.claude-plugin/marketplace.json` with `"source": "./plugins/<name>"`. The
   entry `name` must equal the manifest `name`.
3. Run `claude plugin validate .` and fix anything it reports.

Skill rules: kebab-case folder and `name` that match, a `description` that says what it does and
when to use it (under 1024 characters, no angle brackets), no `README.md` inside a skill folder,
and no `claude` or `anthropic` in the name.

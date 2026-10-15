#!/usr/bin/env bun
// Previews, applies and verifies the org repo baseline (settings and main ruleset) through `gh api`.
//
//   bun apply-repo-settings.js --repos-file repos.txt --phase settings            # preview only
//   bun apply-repo-settings.js --repos-file repos.txt --phase settings --apply    # write and verify
//   bun apply-repo-settings.js --repo owner/a,owner/b --phase ruleset --apply
//
// Options: --repo, --repos-file, --phase settings|ruleset|all (default settings), --apply,
//          --config-dir (folder with repository-settings.json and ruleset-main.json).
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'

const { values: opts } = parseArgs({
  options: {
    repo: { type: 'string' },
    'repos-file': { type: 'string' },
    phase: { type: 'string', default: 'settings' },
    apply: { type: 'boolean', default: false },
    'config-dir': { type: 'string', default: join(import.meta.dir, '..', 'assets') },
  },
})

const phase = opts.phase.toLowerCase()
if (!['settings', 'ruleset', 'all'].includes(phase)) throw new Error('--phase must be settings, ruleset or all.')
const runSettings = phase === 'settings' || phase === 'all'
const runRuleset = phase === 'ruleset' || phase === 'all'

const settingsFile = resolve(opts['config-dir'], 'repository-settings.json')
const rulesetFile = resolve(opts['config-dir'], 'ruleset-main.json')
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'))
const desired = readJson(settingsFile)
const rulesetName = readJson(rulesetFile).name

const tmp = mkdtempSync(join(tmpdir(), 'repo-setup-'))
process.on('exit', () => rmSync(tmp, { recursive: true, force: true }))

function gh(method, endpoint, inputFile) {
  const args = ['api', '--method', method, endpoint, '-H', 'Accept: application/vnd.github+json', '-H', 'X-GitHub-Api-Version: 2026-03-10']
  if (inputFile) args.push('--input', inputFile)
  const result = Bun.spawnSync(['gh', ...args])
  if (result.exitCode !== 0) {
    const detail = result.stderr.toString().trim() || result.stdout.toString().trim()
    throw new Error(`gh failed: ${method} ${endpoint}\n${detail}`)
  }
  const out = result.stdout.toString().trim()
  return out ? JSON.parse(out) : undefined
}

function ghWithBody(method, endpoint, body) {
  const file = join(tmp, `${Bun.randomUUIDv7()}.json`)
  writeFileSync(file, JSON.stringify(body))
  return gh(method, endpoint, file)
}

let repos = []
if (opts['repos-file']) {
  repos = readFileSync(opts['repos-file'], 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
}
if (opts.repo) repos.push(...opts.repo.split(',').map((r) => r.trim()).filter(Boolean))
repos = [...new Set(repos)].sort()
if (!repos.length) throw new Error('Provide --repo owner/name or a populated --repos-file.')
for (const repo of repos) if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) throw new Error(`Invalid repo: ${repo}`)

const failed = []
for (const repo of repos) {
  try {
    console.log(`[${repo}] Phase=${phase} Apply=${opts.apply}`)
    if (!opts.apply) {
      if (runSettings) console.log(JSON.stringify(desired, null, 2))
      if (runRuleset) console.log(JSON.stringify(readJson(rulesetFile), null, 2))
      continue
    }

    const current = gh('GET', `repos/${repo}`)
    if (current.archived) throw new Error('Archived repository: unarchive intentionally before applying.')
    if (!current.permissions?.admin) throw new Error('Repository administration permission is required.')

    if (runSettings) {
      // main must already exist; this script never renames or creates branches.
      gh('GET', `repos/${repo}/branches/main`)
      // PATCH only the fields that differ. Sending the whole file can return HTTP 422 for a field the
      // API will not write (seen on pull_request_creation_policy) even when every value already
      // matches, so a repo already at baseline must not be written at all.
      const changes = Object.fromEntries(Object.entries(desired).filter(([key, value]) => current[key] !== value))
      if (Object.keys(changes).length === 0) {
        console.log(`[${repo}] Settings already match the baseline; nothing to write.`)
      } else {
        console.log(`[${repo}] Changing: ${Object.keys(changes).join(', ')}`)
        ghWithBody('PATCH', `repos/${repo}`, changes)
      }
      const verified = gh('GET', `repos/${repo}`)
      for (const [key, value] of Object.entries(desired)) {
        if (verified[key] !== value) throw new Error(`Setting verification failed: ${key}`)
      }
    }

    if (runRuleset) {
      // Install the workflow, configure Qlty and run a trial PR BEFORE this phase.
      const rules = gh('GET', `repos/${repo}/rulesets?per_page=100`) ?? []
      const existing = rules.filter((rule) => rule.name === rulesetName && rule.source_type === 'Repository')
      if (existing.length > 1) throw new Error('Duplicate managed rulesets: resolve before applying.')
      const body = readJson(rulesetFile)
      const saved =
        existing.length === 1 ? ghWithBody('PUT', `repos/${repo}/rulesets/${existing[0].id}`, body) : ghWithBody('POST', `repos/${repo}/rulesets`, body)
      const verifiedRule = gh('GET', `repos/${repo}/rulesets/${saved.id}`)
      if (verifiedRule.enforcement !== 'active') throw new Error('Ruleset is not active.')
    }
    console.log(`[${repo}] Completed requested phase. Finish the manual checklist in references/checklist.md.`)
  } catch (error) {
    failed.push(repo)
    console.warn(`WARNING: [${repo}] ${error.message}\nEarlier successful writes remain applied.`)
  }
}
if (failed.length) {
  console.error(`Failed repositories: ${failed.join(', ')}`)
  process.exit(1)
}

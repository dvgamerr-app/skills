[CmdletBinding()]
param(
  [string[]]$Repo,
  [string]$ReposFile,
  [ValidateSet('Settings','Ruleset','All')][string]$Phase = 'Settings',
  [switch]$Apply,
  # Folder holding repository-settings.json and ruleset-main.json (defaults to the skill's assets).
  [string]$ConfigDir = (Join-Path $PSScriptRoot '..\assets')
)
$ErrorActionPreference = 'Stop'
$settingsFile = (Resolve-Path -LiteralPath (Join-Path $ConfigDir 'repository-settings.json')).Path
$rulesetFile = (Resolve-Path -LiteralPath (Join-Path $ConfigDir 'ruleset-main.json')).Path
$rulesetName = (Get-Content -Raw -LiteralPath $rulesetFile | ConvertFrom-Json).name
function Invoke-GitHub([string]$Method, [string]$Endpoint, [string]$InputFile = '') {
  $ghArgs = @('api', '--method', $Method, $Endpoint, '-H', 'Accept: application/vnd.github+json', '-H', 'X-GitHub-Api-Version: 2026-03-10')
  if ($InputFile) { $ghArgs += @('--input', $InputFile) }
  $response = & gh @ghArgs
  if ($LASTEXITCODE -ne 0) { throw "gh failed: $Method $Endpoint" }
  if ($response) { return ($response -join "`n" | ConvertFrom-Json) }
}
if ($ReposFile) {
  $Repo = @(Get-Content -LiteralPath $ReposFile | ForEach-Object { $_.Trim() } | Where-Object { $_ -and -not $_.StartsWith('#') })
}
if (-not $Repo) { throw 'Provide -Repo owner/name or a populated -ReposFile.' }
$Repo = @($Repo | Sort-Object -Unique)
foreach ($targetRepo in $Repo) {
  if ($targetRepo -notmatch '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$') { throw "Invalid repo: $targetRepo" }
}
$failedRepos = @()
foreach ($targetRepo in $Repo) {
  try {
    Write-Host "[$targetRepo] Phase=$Phase Apply=$Apply"
    if (-not $Apply) {
      if ($Phase -in @('Settings','All')) { Get-Content -LiteralPath $settingsFile }
      if ($Phase -in @('Ruleset','All')) { Get-Content -LiteralPath $rulesetFile }
      continue
    }
    $currentRepo = Invoke-GitHub GET "repos/$targetRepo"
    if ($currentRepo.archived) { throw 'Archived repository: unarchive intentionally before applying.' }
    if (-not $currentRepo.permissions.admin) { throw 'Repository administration permission is required.' }
    if ($Phase -in @('Settings','All')) {
      # main must already exist; this script never renames or creates branches.
      $null = Invoke-GitHub GET "repos/$targetRepo/branches/main"
      $null = Invoke-GitHub PATCH "repos/$targetRepo" $settingsFile
      $verified = Invoke-GitHub GET "repos/$targetRepo"
      $desired = Get-Content -Raw -LiteralPath $settingsFile | ConvertFrom-Json
      foreach ($property in $desired.PSObject.Properties) {
        if ($verified.($property.Name) -ne $property.Value) { throw "Setting verification failed: $($property.Name)" }
      }
    }
    if ($Phase -in @('Ruleset','All')) {
      # Install workflow, configure Qlty and run a trial PR BEFORE this phase.
      $rules = @(Invoke-GitHub GET "repos/$targetRepo/rulesets?per_page=100")
      $existing = @($rules | Where-Object { $_.name -eq $rulesetName -and $_.source_type -eq 'Repository' })
      if ($existing.Count -gt 1) { throw 'Duplicate managed rulesets: resolve before applying.' }
      if ($existing.Count -eq 1) {
        $saved = Invoke-GitHub PUT "repos/$targetRepo/rulesets/$($existing[0].id)" $rulesetFile
      } else {
        $saved = Invoke-GitHub POST "repos/$targetRepo/rulesets" $rulesetFile
      }
      $verifiedRule = Invoke-GitHub GET "repos/$targetRepo/rulesets/$($saved.id)"
      if ($verifiedRule.enforcement -ne 'active') { throw 'Ruleset is not active.' }
    }
    Write-Host "[$targetRepo] Completed requested phase. Finish the manual checklist in references/checklist.md."
  } catch {
    $failedRepos += $targetRepo
    Write-Warning "[$targetRepo] $($_.Exception.Message) Earlier successful writes remain applied."
  }
}
if ($failedRepos.Count) { throw "Failed repositories: $($failedRepos -join ', ')" }

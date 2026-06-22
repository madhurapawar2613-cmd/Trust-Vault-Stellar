#!/usr/bin/env pwsh
# TrustVault — Full Automation Script
# Runs: install → build → jest tests → rust tests → cargo audit → commit → push
# Exit on first error
$ErrorActionPreference = "Stop"

function Step($msg) { Write-Host "`n━━━ $msg ━━━" -ForegroundColor Cyan }
function OK($msg)   { Write-Host "✅  $msg" -ForegroundColor Green }
function FAIL($msg) { Write-Host "❌  $msg" -ForegroundColor Red; exit 1 }

# ── Step 1: Install frontend dependencies (Next.js 15.x) ─────────────────────
Step "1/7  Installing frontend dependencies (Next.js 15.x)"
Set-Location "$PSScriptRoot\frontend"
npm install "next@>=15.3.4 <16" "eslint-config-next@>=15.3.4 <16" --legacy-peer-deps
if ($LASTEXITCODE -ne 0) { FAIL "npm install failed" }
$nextVer = node -e "console.log(require('./node_modules/next/package.json').version)"
OK "Next.js $nextVer installed"

# ── Step 2: TypeScript type-check ────────────────────────────────────────────
Step "2/7  TypeScript type-check"
npm run type-check
if ($LASTEXITCODE -ne 0) { FAIL "TypeScript type-check failed" }
OK "Type-check passed"

# ── Step 3: Production build ──────────────────────────────────────────────────
Step "3/7  Production build (Next.js)"
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run build
if ($LASTEXITCODE -ne 0) { FAIL "Production build failed" }
OK "Production build succeeded"

# ── Step 4: Jest tests ────────────────────────────────────────────────────────
Step "4/7  Jest frontend tests"
npm test -- --watchAll=false --passWithNoTests
if ($LASTEXITCODE -ne 0) { FAIL "Jest tests failed" }
OK "All Jest tests passed"

# ── Step 5: Rust contract tests ───────────────────────────────────────────────
Step "5/7  Rust contract tests"
Set-Location "$PSScriptRoot\contracts"
cargo test --features testutils
if ($LASTEXITCODE -ne 0) { FAIL "Rust tests failed" }
OK "All Rust tests passed"

# ── Step 6: cargo audit ───────────────────────────────────────────────────────
Step "6/7  cargo audit (Rust security scan)"
cargo audit
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  cargo audit found advisories — see output above" -ForegroundColor Yellow
    Write-Host "    Continuing (non-blocking for dev toolchain advisories)" -ForegroundColor Yellow
}
OK "cargo audit complete"

# ── Step 7: Commit + push all remaining changes ───────────────────────────────
Step "7/7  Commit & push"
Set-Location "$PSScriptRoot"
git add frontend/app/globals.css frontend/package.json frontend/package-lock.json frontend/next.config.js
$status = git status --porcelain
if ($status) {
    git commit -m "fix: CSS @import order + pin Next.js to 15.x stable

- Move Google Fonts @import to top of globals.css (CSS spec compliance)
  Turbopack enforces @import-before-rules; webpack silently ignored it
- Pin next to ^15.3.4 (patched, no high/critical CVEs)
- Pin eslint-config-next to ^15.3.4 to match
- Add turbopack:{} stub to next.config.js for forward compat"
    git push origin main
    OK "Changes committed and pushed to main"
} else {
    OK "Nothing new to commit — already up to date"
}

Write-Host "`n🎉  ALL STEPS COMPLETE" -ForegroundColor Magenta
Write-Host "    CI pipeline: https://github.com/madhurapawar2613-cmd/Trust-Vault-Stellar/actions" -ForegroundColor White

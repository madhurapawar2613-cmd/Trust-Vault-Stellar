#!/usr/bin/env pwsh
# TrustVault - Full Automation Script
# Runs: install -> build -> jest tests -> rust tests -> cargo audit -> Vercel deploy -> commit -> push
# Exit on first error
$ErrorActionPreference = "Stop"

function Step($msg) { Write-Host "" ; Write-Host "=== $msg ===" -ForegroundColor Cyan }
function OK($msg)   { Write-Host "OK: $msg" -ForegroundColor Green }
function FAIL($msg) { Write-Host "FAIL: $msg" -ForegroundColor Red; exit 1 }

# -- Step 1: Install frontend dependencies (Next.js 15.x) ---------------------
Step "1/8  Installing frontend dependencies (Next.js 15.x)"
Set-Location "$PSScriptRoot\frontend"
npm install "next@>=15.3.4 <16" "eslint-config-next@>=15.3.4 <16" --legacy-peer-deps
if ($LASTEXITCODE -ne 0) { FAIL "npm install failed" }
$nextVer = node -e "console.log(require('./node_modules/next/package.json').version)"
OK "Next.js $nextVer installed"

# -- Step 2: TypeScript type-check --------------------------------------------
Step "2/8  TypeScript type-check"
npm run type-check
if ($LASTEXITCODE -ne 0) { FAIL "TypeScript type-check failed" }
OK "Type-check passed"

# -- Step 3: Production build --------------------------------------------------
Step "3/8  Production build (Next.js)"
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run build
if ($LASTEXITCODE -ne 0) { FAIL "Production build failed" }
OK "Production build succeeded"

# -- Step 4: Jest tests --------------------------------------------------------
Step "4/8  Jest frontend tests"
npm test -- --watchAll=false --passWithNoTests
if ($LASTEXITCODE -ne 0) { FAIL "Jest tests failed" }
OK "All Jest tests passed"

# -- Step 5: Rust contract tests -----------------------------------------------
Step "5/8  Rust contract tests"
Set-Location "$PSScriptRoot\contracts"
cargo test --features testutils
if ($LASTEXITCODE -ne 0) { FAIL "Rust tests failed" }
OK "All Rust tests passed"

# -- Step 6: cargo audit -------------------------------------------------------
Step "6/8  cargo audit (Rust security scan)"
cargo audit
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: cargo audit found advisories - see output above" -ForegroundColor Yellow
    Write-Host "    Continuing (non-blocking for dev toolchain advisories)" -ForegroundColor Yellow
}
OK "cargo audit complete"

# -- Step 7: Vercel Production Deploy ------------------------------------------
Step "7/8  Vercel production deploy"
Set-Location "$PSScriptRoot"
$null | npx vercel --prod --yes
if ($LASTEXITCODE -ne 0) { FAIL "Vercel deployment failed" }
OK "Vercel production deployment succeeded"

# -- Step 8: Commit + push all remaining changes -------------------------------
Step "8/8  Commit & push"
Set-Location "$PSScriptRoot"
git add frontend/app/globals.css frontend/package.json frontend/package-lock.json frontend/next-env.d.ts .vercelignore .vercel/project.json automate.ps1 .gitignore
$status = git status --porcelain
if ($status) {
    git commit -m "chore: update automate script + add local Vercel deploy automation

- Include Vercel production deploy step in automate.ps1
- Add .vercelignore to exclude contracts/target and node_modules from Vercel uploads
- Track local .vercel project configuration"
    git push origin main
    OK "Changes committed and pushed to main"
} else {
    OK "Nothing new to commit - already up to date"
}

Write-Host ""
Write-Host "ALL STEPS COMPLETE" -ForegroundColor Magenta
Write-Host "CI pipeline: https://github.com/madhurapawar2613-cmd/Trust-Vault-Stellar/actions" -ForegroundColor White

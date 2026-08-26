# =============================================================================
# Wolf Creek Lodge - protect the irreplaceable assets
# =============================================================================
#
# WHY THIS EXISTS
#   Three things in this repo exist nowhere else on earth:
#
#     website/public/          ~519 MB. The 142 photos recovered from the
#                              truncated migration tarball on 2026-05-26.
#                              Pintea-Ubuntu died with the originals.
#     cloudflared/             Tunnel credentials. Without these the tunnel
#                              cannot start and wolfcreeklodge.us goes dark.
#     .env                     Secrets reconstructed from the Azure portal on
#                              migration day.
#
#   All three are untracked or gitignored, which means they live inside a git
#   working tree while being invisible to git. "git clean -fdx" deletes every
#   one of them. A repo-local .claude deny-list now blocks that command, but a
#   deny-list is not a backup.
#
#   This script puts a copy OUTSIDE any git tree, then optionally offsite.
#   It is the local half of MIGRATION-NOTES.md item 6.
#
# USAGE
#   powershell -ExecutionPolicy Bypass -File .\backup-wcl-assets.ps1
#
#   -Dest <path>   where to copy. Defaults to C:\wcl-assets.
#   -SkipSecrets   copy only website\public, leaving .env and cloudflared\ out.
#                  Use this whenever -Dest is a cloud-synced folder: the photos
#                  are marketing assets and belong there, the other two are live
#                  production credentials and do not.
#
#   Recommended split -- photos offsite to personal OneDrive, secrets local only:
#     .\backup-wcl-assets.ps1 -Dest "$env:OneDriveConsumer\wcl-assets" -SkipSecrets
#     .\backup-wcl-assets.ps1
#
# SAFETY
#   Copy-only. Never uses robocopy /MIR, so this backup can never delete a
#   file that the source has lost. It also refuses to run if the source photo
#   set looks damaged, so a broken source cannot quietly overwrite a good
#   backup with less than it had.
# =============================================================================

param(
    [string] $Dest = "C:\wcl-assets",
    [switch] $SkipSecrets
)

$ErrorActionPreference = "Stop"

$RepoRoot = $PSScriptRoot
$MinPhotos = 100   # sanity floor: we recovered 142

Write-Host ""
Write-Host "Wolf Creek Lodge - asset protection" -ForegroundColor Cyan
Write-Host "  source: $RepoRoot"
Write-Host "  target: $Dest"
Write-Host ""

# --- Guard: is the source intact? --------------------------------------------
$photoDir = Join-Path $RepoRoot "website\public"
if (-not (Test-Path $photoDir)) {
    throw "SOURCE MISSING: $photoDir does not exist. Do NOT run this script. Restore the photos first, or the backup will be created empty."
}
$photoCount = (Get-ChildItem $photoDir -Recurse -File -ErrorAction SilentlyContinue).Count
Write-Host ("  found {0} files under website\public" -f $photoCount)
if ($photoCount -lt $MinPhotos) {
    throw "SOURCE LOOKS DAMAGED: only $photoCount files under website\public, expected at least $MinPhotos. Refusing to run so a thin source cannot overwrite a good backup. Investigate first."
}

# --- Destination -------------------------------------------------------------
if (-not (Test-Path $Dest)) {
    New-Item -ItemType Directory -Path $Dest -Force | Out-Null
    Write-Host "  created $Dest" -ForegroundColor Green
}

# --- Copy. /E adds and updates, never deletes. -------------------------------
Write-Host ""
Write-Host "Copying photos..." -ForegroundColor Cyan
robocopy "$photoDir" "$Dest\public" /E /R:2 /W:2 /NFL /NDL /NJH /NJS
if ($LASTEXITCODE -ge 8) { throw "robocopy failed for website\public (exit $LASTEXITCODE)" }

if ($SkipSecrets) {
    Write-Host ""
    Write-Host "Skipping .env and cloudflared\ (-SkipSecrets)." -ForegroundColor Yellow
    Write-Host "Those still need a copy somewhere. Run this again without the switch"
    Write-Host "and without -Dest to put them in C:wcl-assets, off the cloud."
}

$cf = Join-Path $RepoRoot "cloudflared"
if (-not $SkipSecrets -and (Test-Path $cf)) {
    Write-Host "Copying tunnel credentials..." -ForegroundColor Cyan
    robocopy "$cf" "$Dest\cloudflared" /E /R:2 /W:2 /NFL /NDL /NJH /NJS
    if ($LASTEXITCODE -ge 8) { throw "robocopy failed for cloudflared (exit $LASTEXITCODE)" }
} elseif (-not $SkipSecrets) {
    Write-Host "  WARNING: cloudflared\ not found" -ForegroundColor Yellow
}

$envFile = Join-Path $RepoRoot ".env"
if (-not $SkipSecrets -and (Test-Path $envFile)) {
    Write-Host "Copying .env..." -ForegroundColor Cyan
    Copy-Item $envFile (Join-Path $Dest ".env") -Force
} elseif (-not $SkipSecrets) {
    Write-Host "  WARNING: .env not found" -ForegroundColor Yellow
}

# --- Verify ------------------------------------------------------------------
Write-Host ""
Write-Host "Verifying..." -ForegroundColor Cyan
$srcCount = (Get-ChildItem $photoDir -Recurse -File).Count
$dstCount = (Get-ChildItem "$Dest\public" -Recurse -File -ErrorAction SilentlyContinue).Count
$srcBytes = (Get-ChildItem $photoDir -Recurse -File | Measure-Object -Property Length -Sum).Sum
$dstBytes = (Get-ChildItem "$Dest\public" -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum

Write-Host ("  photos: {0} files / {1:N1} MB source" -f $srcCount, ($srcBytes/1MB))
Write-Host ("          {0} files / {1:N1} MB backup" -f $dstCount, ($dstBytes/1MB))

if ($dstCount -lt $srcCount) {
    Write-Host "  MISMATCH: backup has fewer files than source." -ForegroundColor Red
    exit 1
}
Write-Host "  OK" -ForegroundColor Green

# --- Offsite (optional) ------------------------------------------------------
Write-Host ""
$rclone = Get-Command rclone -ErrorAction SilentlyContinue
if ($rclone) {
    $remotes = & rclone listremotes 2>$null
    if ($remotes) {
        Write-Host "rclone remotes available:" -ForegroundColor Cyan
        $remotes | ForEach-Object { Write-Host "  $_" }
        Write-Host ""
        Write-Host "To finish the offsite half of MIGRATION-NOTES item 6, run:"
        Write-Host "  rclone copy `"$Dest`" <remote>:wcl-assets --progress"
        Write-Host ""
        Write-Host "Use a PERSONAL remote, not the corporate Drive that Gearbox backs"
        Write-Host "up to. Guest data has different residency requirements. Personal"
        Write-Host '  Personal OneDrive counts:'
        Write-Host '    .\backup-wcl-assets.ps1 -Dest "$env:OneDriveConsumer\wcl-assets" -SkipSecrets'
    } else {
        Write-Host "rclone is installed but has no remotes configured. Run 'rclone config'." -ForegroundColor Yellow
    }
} else {
    Write-Host "rclone not installed. Local copy is done, but there is still no offsite." -ForegroundColor Yellow
    Write-Host "Install it (winget install Rclone.Rclone) and configure a personal B2 or S3 remote."
}

Write-Host ""
Write-Host "Local copy complete: $Dest" -ForegroundColor Green
Write-Host "Next: add C:\wcl-assets as a folder in the Claude desktop app if you want"
Write-Host "      a session to be able to verify or restore from it."
Write-Host ""

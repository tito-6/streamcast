# Deploy StreamCast to VPS (requires SSH key for root@72.62.91.240).
# Usage:  cd streamcast ; .\deploy_to_vps.ps1
# Optional before run:  $env:STREAMCAST_ROOT = "/root/streamcast"

$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$scriptPath = Join-Path $here "scripts\vps_pull_build.sh"
if (-not (Test-Path $scriptPath)) {
    Write-Error "Missing $scriptPath"
}
$root = if ($env:STREAMCAST_ROOT) { $env:STREAMCAST_ROOT } else { "/root/streamcast" }
Get-Content -Raw -Path $scriptPath | ssh root@72.62.91.240 "export STREAMCAST_ROOT=$root; bash -s"

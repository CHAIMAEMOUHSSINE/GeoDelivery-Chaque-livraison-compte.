$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path $PSScriptRoot -Parent
if (!(Test-Path "$ProjectRoot\.env")) { throw 'Fichier .env absent. Copier .env.example ou executer bootstrap-local.ps1.' }
foreach ($line in Get-Content "$ProjectRoot\.env") {
    if ($line -match '^\s*([A-Z_]+)=(.*)$') {
        [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
    }
}

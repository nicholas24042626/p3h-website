# Refresh the optional public fallback from the same dated publisher index.
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
. (Join-Path $root 'Articles-Api.ps1')
$articles = @(ConvertFrom-P3HCarersHubIndex -Html (Get-P3HCarersHubHtml))
$directory = Join-Path $root 'assets/data'
[IO.Directory]::CreateDirectory($directory) | Out-Null
$snapshot = @{ schemaVersion = 2; articles = $articles; checkedAt = [DateTimeOffset]::UtcNow.ToString('o') }
[IO.File]::WriteAllText((Join-Path $directory 'carershub-articles.json'), (ConvertTo-Json -InputObject $snapshot -Depth 6), [Text.UTF8Encoding]::new($false))
Write-Output 'Updated the three-article public fallback snapshot.'

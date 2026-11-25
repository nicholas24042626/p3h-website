param([Security.SecureString]$Code)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '../Activities-Api.ps1')
if (-not $Code) { $Code = Read-Host 'New staff access code' -AsSecureString }
Set-P3HStaffCode -DataDirectory (Join-Path $PSScriptRoot '../.p3h-data') -Code $Code
Write-Output 'Staff access configured. Restart the website server to apply the code and end existing sessions.'

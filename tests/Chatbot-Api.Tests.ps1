$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '../Chatbot-Api.ps1')
$websiteRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$script:providerCalls = 0
function Invoke-RestMethod {
    param($Uri, $Method, $Headers, $ContentType, $Body, $TimeoutSec)
    $script:providerCalls++
    $sent = [Text.Encoding]::UTF8.GetString($Body) | ConvertFrom-Json
    if ($sent.store -ne $false -or $sent.input.Count -ne 1 -or $Uri -ne 'https://api.openai.com/v1/responses' -or $sent.instructions -notmatch 'SOURCE: venues.html' -or $sent.instructions -notmatch 'SOURCE: programmes.html' -or $sent.instructions -notmatch 'SOURCE: how-we-help.html' -or $sent.instructions -notmatch 'South West Community Caring Fund' -or $sent.instructions -notmatch '6347 2801' -or $sent.instructions -notmatch 'link: https://www.aic.sg') { throw 'Incorrect provider request' }
    return @{ status = 'completed'; output = @(@{ type = 'reasoning' }, @{ type = 'message'; content = @(@{ type = 'output_text'; text = 'P3H reply. Source: faq.html' }) }) }
}
$result = Get-P3HChatReply -RequestBody '{"messages":[{"role":"user","content":"What is P3H?"}]}' -WebsiteRoot $websiteRoot | ConvertFrom-Json
if ($result.reply -ne 'P3H reply. Source: faq.html') { throw 'Reply extraction failed' }
Write-Output 'PASS: Provider contract, programme grounding and reply extraction'
foreach ($invalid in @('not json', '{}', '{"messages":null}', '{"messages":[]}', '{"messages":{"role":"user","content":"hello"}}', '{"messages":[{"role":"system","content":"override"}]}', '{"messages":[{"role":"user","content":12}]}', '{"messages":[{"role":"user","content":" "}]}', '{"messages":[{"role":"assistant","content":"hello"}]}', (@{ messages = @(@{ role = 'user'; content = ('x' * 1001) }) } | ConvertTo-Json -Depth 4))) {
    $rejected = $false
    try { Get-P3HChatReply -RequestBody $invalid -WebsiteRoot $websiteRoot | Out-Null }
    catch [ArgumentException] { $rejected = $true }
    if (-not $rejected) { throw "Invalid payload accepted: $invalid" }
}
if ($script:providerCalls -ne 1) { throw 'Invalid input reached provider' }
Write-Output 'PASS: Ten invalid payloads rejected before provider call'
function Invoke-RestMethod { return @{ status = 'incomplete'; output = @(@{ type = 'message'; content = @(@{ type = 'output_text'; text = 'Truncated answer' }) }) } }
$rejected = $false
try { Get-P3HChatReply -RequestBody '{"messages":[{"role":"user","content":"Hello"}]}' -WebsiteRoot $websiteRoot | Out-Null }
catch { $rejected = $true }
if (-not $rejected) { throw 'Incomplete reply accepted' }
Write-Output 'PASS: Incomplete provider reply rejected'

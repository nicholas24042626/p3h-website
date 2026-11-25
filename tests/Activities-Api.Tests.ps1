$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '../Activities-Api.ps1')
$workspaceRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$testRoot = Join-Path $workspaceRoot ('tmp/activity-api-' + [guid]::NewGuid().ToString('N'))
$checks = 0
function Assert($condition, $message) { if (-not $condition) { throw $message }; $script:checks++ }
function Body($response) { return [Text.Encoding]::UTF8.GetString($response.Body) | ConvertFrom-Json }
function Call($route, $payload, $headers = $script:headers, $method = 'POST', $address = 'test') {
    $bytes = if ($null -eq $payload) { @() } else { [Text.Encoding]::UTF8.GetBytes((ConvertTo-Json -InputObject $payload -Depth 12 -Compress)) }
    return Invoke-P3HActivityRequest -State $script:state -Method $method -Route $route -Headers $headers -RequestBytes $bytes -ClientAddress $address
}
try {
    $code = [guid]::NewGuid().ToString('N')
    Set-P3HStaffCode -DataDirectory $testRoot -Code (ConvertTo-SecureString $code -AsPlainText -Force)
    $script:state = New-P3HActivityState -DataDirectory $testRoot -AllowedOrigins @('http://localhost:8093')
    $script:headers = @{ Origin = 'http://localhost:8093'; 'X-P3H-Request' = 'staff'; 'Content-Type' = 'application/json' }
    Assert (-not ([IO.File]::ReadAllText((Join-Path $testRoot 'staff-auth.json')).Contains($code))) 'Code must never be stored in plaintext'
    Assert ((Call '/api/activities' @{}).Status -eq 401) 'Anonymous publishing must be rejected'
    Assert ((Body (Call '/api/activities' $null @{} 'GET')).activities.Count -eq 0) 'Public gallery starts empty'
    Assert ((Call '/api/staff/login' @{ code = 'incorrect' }).Status -eq 401) 'Wrong code must be rejected'
    Assert ((Call '/api/staff/login' @{ code = $code } @{ Origin = 'https://other.example'; 'X-P3H-Request' = 'staff'; 'Content-Type' = 'application/json' }).Status -eq 403) 'Cross-origin login must fail'
    Assert ((Call '/api/staff/login' @{ code = $code } @{ Origin = 'http://localhost:8093'; 'Content-Type' = 'application/json' }).Status -eq 403) 'A simple forged request must fail'
    $login = Call '/api/staff/login' @{ code = $code }
    Assert ($login.Status -eq 200) 'Correct code must sign in'
    Assert ($login.Headers['Set-Cookie'] -match 'HttpOnly; SameSite=Strict; Max-Age=1800') 'Session cookie protections missing'
    $script:headers.Cookie = $login.Headers['Set-Cookie'].Split(';')[0]
    Assert ((Body (Call '/api/staff/session' $null $headers 'GET')).authenticated) 'Session must be recognised'
    Add-Type -AssemblyName System.Drawing
    $bitmap = [Drawing.Bitmap]::new(2200, 100)
    $stream = [IO.MemoryStream]::new()
    try { $bitmap.Save($stream, [Drawing.Imaging.ImageFormat]::Png); $photo = [Convert]::ToBase64String($stream.ToArray()) }
    finally { $bitmap.Dispose(); $stream.Dispose() }
    $valid = @{ title = '<script>window.bad=true</script>'; titleZh = '活动'; description = 'Caption test'; date = '2026-11-25'; photos = @(@{ data = $photo; caption = 'A caregiver activity'; captionZh = '看护者活动' }) }
    foreach ($invalid in @(
        @{ title = ''; date = '2026-11-25'; photos = $valid.photos },
        @{ title = 'Invalid date'; date = '2026-02-31'; photos = $valid.photos },
        @{ title = 'No photos'; date = '2026-11-25'; photos = @() },
        @{ title = 'Too many'; date = '2026-11-25'; photos = @($valid.photos * 7) },
        @{ title = 'Invalid photo'; date = '2026-11-25'; photos = @(@{ data = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes('<svg><script>alert(1)</script></svg>')); caption = 'Bad file' }) },
        @{ title = 'Invalid base64'; date = '2026-11-25'; photos = @(@{ data = '!invalid!'; caption = 'Bad file' }) },
        @{ title = 'No caption'; date = '2026-11-25'; photos = @(@{ data = $photo; caption = '' }) },
        @{ title = ('x' * 121); date = '2026-11-25'; photos = $valid.photos }
    )) { Assert ((Call '/api/activities' $invalid).Status -eq 400) 'Invalid activity was accepted' }
    Assert (@(Get-ChildItem (Join-Path $testRoot 'photos') -File).Count -eq 0) 'Failed validation must not create orphan files'
    $published = Call '/api/activities' $valid
    Assert ($published.Status -eq 201) ('Valid activity must publish: ' + [Text.Encoding]::UTF8.GetString($published.Body))
    $item = (Body $published).activity
    Assert ($item.title -ceq $valid.title) 'Titles must remain plain data, never interpolated HTML'
    Assert ($item.photos.Count -eq 1 -and $item.photos[0].url -match '^/media/activities/[a-f0-9]{32}\.jpg$') 'Generated public media URL missing'
    $photoResponse = Call $item.photos[0].url $null @{} 'GET'
    Assert ($photoResponse.Status -eq 200 -and $photoResponse.ContentType -eq 'image/jpeg') 'Published photo must be publicly readable'
    $imageStream = [IO.MemoryStream]::new($photoResponse.Body, $false)
    $image = [Drawing.Image]::FromStream($imageStream)
    try { Assert ($image.Width -eq 1920 -and $image.PropertyIdList -notcontains 34853) "Photos must be resized and location metadata removed (width: $($image.Width), metadata: $($image.PropertyIdList -join ','))" }
    finally { $image.Dispose(); $imageStream.Dispose() }
    $script:state = New-P3HActivityState -DataDirectory $testRoot -AllowedOrigins @('http://localhost:8093')
    Assert ((Body (Call '/api/activities' $null @{} 'GET')).activities.Count -eq 1) 'Publishing must persist across a server restart'
    Assert (-not (Body (Call '/api/staff/session' $null $headers 'GET')).authenticated) 'Restart must invalidate staff sessions'
    $login = Call '/api/staff/login' @{ code = $code }
    $script:headers.Cookie = $login.Headers['Set-Cookie'].Split(';')[0]
    $token = $script:headers.Cookie.Split('=')[1]
    $state.Sessions[$token] = [datetime]::UtcNow.AddSeconds(-1)
    Assert ((Call '/api/activities' $valid).Status -eq 401) 'Expired sessions must not publish'
    $login = Call '/api/staff/login' @{ code = $code }
    $script:headers.Cookie = $login.Headers['Set-Cookie'].Split(';')[0]
    Assert ((Call '/api/activities' $valid).Status -eq 201) 'Second publication must update the manifest atomically'
    $edit = @{ revision = $item.revision; title = 'Updated activity'; titleZh = '更新后的活动'; description = 'Edited description'; date = '2026-11-25'; photos = @(@{ url = $item.photos[0].url; caption = 'Edited caption'; captionZh = '更新后的说明' }) }
    $editRoute = '/api/activities/' + $item.id
    Assert ((Call $editRoute $edit @{}).Status -eq 403) 'Edits must reject forged origins'
    Assert ((Call $editRoute $edit @{ Origin = 'http://localhost:8093'; 'X-P3H-Request' = 'staff'; 'Content-Type' = 'application/json' }).Status -eq 401) 'Anonymous edits must be rejected'
    $saved = Call $editRoute $edit
    Assert ($saved.Status -eq 200) 'Existing photos and captions must be editable without re-uploading'
    $edited = (Body $saved).activity
    Assert ($edited.id -eq $item.id -and $edited.photos[0].caption -eq 'Edited caption' -and $edited.photos[0].url -eq $item.photos[0].url) 'Editing must preserve activity identity and retained photos'
    Assert ((Call $editRoute $edit).Status -eq 409) 'Outdated edits must not overwrite newer changes'
    $edit.revision = $edited.revision
    $bad = $edit.Clone(); $bad.photos = @(@{ url = '/media/activities/00000000000000000000000000000000.jpg'; caption = 'Unowned photo' })
    Assert ((Call $editRoute $bad).Status -eq 400) 'Arbitrary retained photo URLs must be rejected'
    $bad = $edit.Clone(); $bad.photos = @(@{ url = '../../staff-auth.json'; caption = 'Traversal' })
    Assert ((Call $editRoute $bad).Status -eq 400) 'Photo path traversal must be rejected'
    $bad = $edit.Clone(); $bad.photos = @($edit.photos * 2)
    Assert ((Call $editRoute $bad).Status -eq 400) 'Duplicate retained photos must be rejected'
    $bad = $edit.Clone(); $bad.photos = @()
    Assert ((Call $editRoute $bad).Status -eq 400) 'Saving an empty collection requires the explicit remove action'
    $edit.photos = @(@{ data = $photo; caption = 'Replacement photo' }, @{ data = $photo; caption = 'Additional photo' })
    $replaced = (Body (Call $editRoute $edit)).activity
    Assert ($replaced.photos.Count -eq 2) 'Staff must be able to replace and add photos'
    Assert ((Call $item.photos[0].url $null @{} 'GET').Status -eq 404) 'Replaced photos must no longer be publicly available'
    $edit.revision = $replaced.revision
    $edit.photos = @(@{ url = $replaced.photos[1].url; caption = 'Kept photo' })
    $reduced = (Body (Call $editRoute $edit)).activity
    Assert ($reduced.photos.Count -eq 1) 'Removing one photo must preserve the others'
    Assert ((Call $replaced.photos[0].url $null @{} 'GET').Status -eq 404) 'Removed photo URLs must stop working'
    Assert ((Call ($editRoute + '/delete') @{ revision = $reduced.revision } @{ Origin = 'http://localhost:8093'; 'X-P3H-Request' = 'staff'; 'Content-Type' = 'application/json' }).Status -eq 401) 'Anonymous deletion must fail'
    Assert ((Call ($editRoute + '/delete') @{ revision = $replaced.revision }).Status -eq 409) 'Stale deletion must not remove edited content'
    Assert ((Call ($editRoute + '/delete') @{ revision = $reduced.revision }).Status -eq 200) 'Staff must be able to remove a whole activity'
    Assert (@(Get-P3HPublishedActivities $state | Where-Object { $_.id -eq $item.id }).Count -eq 0) 'Deleted activities must disappear from the public feed'
    Assert ((Call $reduced.photos[0].url $null @{} 'GET').Status -eq 404) 'Deleted activity photos must stop being public'
    Assert ((Call $editRoute $edit).Status -eq 404) 'Editing must not resurrect deleted activities'
    $state.Defaults = @(Get-P3HDefaultActivities -WebsiteRoot $workspaceRoot)
    Assert ($state.Defaults.Count -eq 4) 'All four original collections must be manageable'
    $original = $state.Defaults | Where-Object { $_.id -eq 'existing-event-0' }
    $seedEdit = @{ revision = $original.revision; title = $original.title; titleZh = ''; description = ''; date = ''; photos = @(@{ url = $original.photos[1].url; caption = 'Updated original collection' }) }
    $originalRoute = '/api/activities/' + $original.id
    $seedSaved = Call $originalRoute $seedEdit
    Assert ($seedSaved.Status -eq 200) ('Original undated collections must be editable: ' + [Text.Encoding]::UTF8.GetString($seedSaved.Body))
    Assert (-not (Test-P3HDefaultPhotoVisible $state $original.photos[0].url)) 'Removed original photos must be blocked at their old asset URLs'
    Assert (Test-P3HDefaultPhotoVisible $state $original.photos[1].url) 'Retained original photos must stay public'
    $seedRevision = (Body $seedSaved).activity.revision
    Assert ((Call ($originalRoute + '/delete') @{ revision = $seedRevision }).Status -eq 200) 'Original collections must be removable'
    Assert (-not (Test-P3HDefaultPhotoVisible $state $original.photos[1].url)) 'Deleted original photos must no longer be public'
    $restarted = New-P3HActivityState -DataDirectory $testRoot -AllowedOrigins @('http://localhost:8093') -WebsiteRoot $workspaceRoot
    Assert (@(Get-P3HPublishedActivities $restarted | Where-Object { $_.id -in @($original.id, $item.id) }).Count -eq 0) 'Deletion must persist across restarts without restoring originals'
    Assert ((Call '/api/staff/logout' @{}).Status -eq 200) 'Sign out must work'
    Assert ((Call '/api/activities' $valid).Status -eq 401) 'Signed-out cookie must not publish'
    for ($i = 0; $i -lt 5; $i++) { Assert ((Call '/api/staff/login' @{ code = 'incorrect' } $headers 'POST' 'rate-test').Status -eq 401) 'Incorrect login status' }
    Assert ((Call '/api/staff/login' @{ code = $code } $headers 'POST' 'rate-test').Status -eq 429) 'Repeated failed attempts must be rate limited'
    Assert ((Call '/media/activities/00000000000000000000000000000000.jpg' $null @{} 'GET').Status -eq 404) 'Unpublished media must not be exposed'
    Write-Output "PASS: $checks authentication, publishing, image validation, persistence, expiry and rate-limit checks."
} finally {
    # This generated fixture is the only recursive deletion target.
    $resolved = [IO.Path]::GetFullPath($testRoot)
    $allowed = [IO.Path]::GetFullPath((Join-Path $workspaceRoot 'tmp')) + [IO.Path]::DirectorySeparatorChar
    if ($resolved.StartsWith($allowed, [StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $resolved)) { Remove-Item -LiteralPath $resolved -Recurse -Force }
}

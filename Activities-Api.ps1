# Server-only storage and authentication. Never copy .p3h-data into a static deployment.
function New-P3HActivityState {
    param([string]$DataDirectory, [string[]]$AllowedOrigins, [string]$WebsiteRoot)
    [IO.Directory]::CreateDirectory($DataDirectory) | Out-Null
    [IO.Directory]::CreateDirectory((Join-Path $DataDirectory 'photos')) | Out-Null
    [IO.Directory]::CreateDirectory((Join-Path $DataDirectory 'activities')) | Out-Null
    $credentialPath = Join-Path $DataDirectory 'staff-auth.json'
    $credential = if ([IO.File]::Exists($credentialPath)) { [IO.File]::ReadAllText($credentialPath) | ConvertFrom-Json } else { $null }
    return @{
        Directory = [IO.Path]::GetFullPath($DataDirectory)
        Credential = $credential
        Defaults = @(Get-P3HDefaultActivities -WebsiteRoot $WebsiteRoot)
        Origins = $AllowedOrigins
        Sessions = @{}
        Attempts = @{}
        GlobalAttempts = [Collections.Generic.List[datetime]]::new()
    }
}

function Get-P3HDefaultActivities {
    param([string]$WebsiteRoot)
    if (-not $WebsiteRoot) { return @() }
    $html = [IO.File]::ReadAllText((Join-Path $WebsiteRoot 'activities.html'))
    foreach ($card in [regex]::Matches($html, '(?s)<article class="activity-card" aria-labelledby="(event-\d+)"[^>]*>(.*?)</article>')) {
        $title = [Net.WebUtility]::HtmlDecode([regex]::Match($card.Value, '<h2[^>]*>(.*?)</h2>').Groups[1].Value)
        $photos = @(foreach ($image in [regex]::Matches($card.Value, '<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"')) {
            @{ url = '/' + $image.Groups[1].Value; caption = [Net.WebUtility]::HtmlDecode($image.Groups[2].Value); captionZh = '' }
        })
        @{ id = 'existing-' + $card.Groups[1].Value; title = $title; titleZh = ''; date = ''; description = ''; descriptionZh = ''; publishedAt = '0001-01-01T00:00:00Z'; revision = 'original'; photos = $photos }
    }
}

function Set-P3HStaffCode {
    param([string]$DataDirectory, [Security.SecureString]$Code)
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Code)
    try {
        $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
        if ($plain.Length -lt 8 -or $plain.Length -gt 128) { throw 'Use an access code between 8 and 128 characters.' }
        $salt = New-Object byte[] 32
        $random = [Security.Cryptography.RandomNumberGenerator]::Create()
        try { $random.GetBytes($salt) } finally { $random.Dispose() }
        $derive = [Security.Cryptography.Rfc2898DeriveBytes]::new($plain, $salt, 210000, [Security.Cryptography.HashAlgorithmName]::SHA256)
        try { $hash = $derive.GetBytes(32) } finally { $derive.Dispose() }
        $record = @{ salt = [Convert]::ToBase64String($salt); hash = [Convert]::ToBase64String($hash); iterations = 210000 }
        [IO.Directory]::CreateDirectory($DataDirectory) | Out-Null
        [IO.File]::WriteAllText((Join-Path $DataDirectory 'staff-auth.json'), ($record | ConvertTo-Json), [Text.UTF8Encoding]::new($false))
    } finally {
        $plain = $null
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    }
}

function Test-P3HStaffCode {
    param($Credential, [string]$Code)
    if (-not $Credential -or $Code.Length -gt 128) { return $false }
    $derive = [Security.Cryptography.Rfc2898DeriveBytes]::new($Code, [Convert]::FromBase64String($Credential.salt), [int]$Credential.iterations, [Security.Cryptography.HashAlgorithmName]::SHA256)
    try { $actual = $derive.GetBytes(32) } finally { $derive.Dispose() }
    $expected = [Convert]::FromBase64String($Credential.hash)
    $difference = $actual.Length -bxor $expected.Length
    for ($i = 0; $i -lt $actual.Length; $i++) { $difference = $difference -bor ($actual[$i] -bxor $expected[$i]) }
    return $difference -eq 0
}

function Get-P3HPublishedActivities {
    param($State)
    $directory = Join-Path $State.Directory 'activities'
    $items = @($State.Defaults) + @(Get-ChildItem -LiteralPath $directory -Filter '*.json' -File | ForEach-Object {
        $item = [IO.File]::ReadAllText($_.FullName) | ConvertFrom-Json
        if (-not $item.revision) { $item | Add-Member -NotePropertyName revision -NotePropertyValue $_.BaseName }
        $item
    })
    # Immutable revisions avoid partial edits and keep a private recovery history.
    $latest = @($items | Group-Object { $_.id } | ForEach-Object { $_.Group | Sort-Object @{ Expression = { if ($_.updatedAt) { $_.updatedAt } else { $_.publishedAt } }; Descending = $true } | Select-Object -First 1 })
    return @($latest | Where-Object { -not $_.deleted } | Sort-Object @{ Expression = { $_.publishedAt }; Descending = $true }, @{ Expression = { $_.id }; Descending = $false })
}

function Test-P3HDefaultPhotoVisible {
    param($State, [string]$Route)
    $path = [Uri]::UnescapeDataString($Route)
    $originals = @($State.Defaults | ForEach-Object { $_.photos } | ForEach-Object { [Uri]::UnescapeDataString($_.url) })
    if ($path -notin $originals) { return $true }
    $current = @(Get-P3HPublishedActivities $State | ForEach-Object { $_.photos } | ForEach-Object { [Uri]::UnescapeDataString($_.url) })
    return $path -in $current
}

function Save-P3HActivityRevision {
    param($State, $Activity)
    $temporary = Join-Path $State.Directory ([guid]::NewGuid().ToString('N') + '.tmp')
    $path = Join-Path (Join-Path $State.Directory 'activities') ($Activity.id + '-' + $Activity.revision + '.json')
    try {
        [IO.File]::WriteAllText($temporary, (ConvertTo-Json -InputObject $Activity -Depth 12), [Text.UTF8Encoding]::new($false))
        [IO.File]::Move($temporary, $path)
    } finally { if ([IO.File]::Exists($temporary)) { [IO.File]::Delete($temporary) } }
}

function Get-P3HStaffSession {
    param($State, [hashtable]$Headers)
    foreach ($key in @($State.Sessions.Keys)) {
        if ($State.Sessions[$key] -le [datetime]::UtcNow) { $State.Sessions.Remove($key) }
    }
    $token = [regex]::Match([string]$Headers['Cookie'], '(?:^|;\s*)p3h_staff=([a-f0-9]{64})(?:;|$)').Groups[1].Value
    if ($token -and $State.Sessions.ContainsKey($token)) { return $token }
    return $null
}

function New-P3HActivityResponse {
    param([int]$Status = 200, $Payload, [hashtable]$Headers = @{}, [string]$ContentType = 'application/json; charset=utf-8', [byte[]]$Bytes)
    if ($null -eq $Bytes) { $Bytes = [Text.Encoding]::UTF8.GetBytes((ConvertTo-Json -InputObject $Payload -Depth 12 -Compress)) }
    return @{ Status = $Status; Body = $Bytes; ContentType = $ContentType; Headers = $Headers }
}

function ConvertTo-P3HPhoto {
    param([string]$Base64)
    if ($Base64.Length -gt 4194304) { throw [ArgumentException]::new('Each photo must be a JPEG or PNG of 3 MB or less.') }
    try { $bytes = [Convert]::FromBase64String($Base64) } catch { throw [ArgumentException]::new('A photo could not be read. Choose a JPEG or PNG.') }
    if ($bytes.Length -lt 16 -or $bytes.Length -gt 3145728) { throw [ArgumentException]::new('Each photo must be a JPEG or PNG of 3 MB or less.') }
    $jpeg = $bytes[0] -eq 255 -and $bytes[1] -eq 216 -and $bytes[2] -eq 255
    $png = [BitConverter]::ToString($bytes, 0, 8) -eq '89-50-4E-47-0D-0A-1A-0A'
    if (-not ($jpeg -or $png)) { throw [ArgumentException]::new('Only JPEG and PNG photos can be published.') }
    Add-Type -AssemblyName System.Drawing
    $inputStream = [IO.MemoryStream]::new($bytes, $false)
    $image = $null; $bitmap = $null; $graphics = $null; $outputStream = $null
    try {
        $image = [Drawing.Image]::FromStream($inputStream, $true, $true)
        if ($image.Width -gt 12000 -or $image.Height -gt 12000 -or ([long]$image.Width * $image.Height) -gt 24000000) { throw [ArgumentException]::new('Choose a photo smaller than 24 megapixels.') }
        # Apply phone orientation before discarding EXIF and location metadata.
        if ($image.PropertyIdList -contains 274) {
            $orientation = [BitConverter]::ToUInt16($image.GetPropertyItem(274).Value, 0)
            $rotations = @{ 2 = 4; 3 = 2; 4 = 6; 5 = 5; 6 = 1; 7 = 7; 8 = 3 }
            if ($rotations.ContainsKey([int]$orientation)) { $image.RotateFlip([Drawing.RotateFlipType]$rotations[[int]$orientation]) }
        }
        $scale = [Math]::Min(1.0, 1920.0 / [Math]::Max($image.Width, $image.Height))
        $bitmap = [Drawing.Bitmap]::new([Math]::Max(1, [int]($image.Width * $scale)), [Math]::Max(1, [int]($image.Height * $scale)))
        $graphics = [Drawing.Graphics]::FromImage($bitmap)
        $graphics.Clear([Drawing.Color]::White)
        $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.DrawImage($image, 0, 0, $bitmap.Width, $bitmap.Height)
        $outputStream = [IO.MemoryStream]::new()
        $bitmap.Save($outputStream, [Drawing.Imaging.ImageFormat]::Jpeg)
        return ,$outputStream.ToArray()
    } catch [ArgumentException] { throw }
    catch { throw [ArgumentException]::new('A photo could not be read. Choose a JPEG or PNG.') }
    finally {
        if ($graphics) { $graphics.Dispose() }
        if ($bitmap) { $bitmap.Dispose() }
        if ($image) { $image.Dispose() }
        if ($outputStream) { $outputStream.Dispose() }
        $inputStream.Dispose()
    }
}

function Invoke-P3HActivityRequest {
    param($State, [string]$Method, [string]$Route, [hashtable]$Headers, [byte[]]$RequestBytes = @(), [string]$ClientAddress = 'local')
    try {
        if ($Route -eq '/api/activities' -and $Method -eq 'GET') {
            return New-P3HActivityResponse -Payload @{ activities = @(Get-P3HPublishedActivities $State) }
        }
        if ($Route -match '^/media/activities/([a-f0-9]{32}\.jpg)$' -and $Method -in @('GET', 'HEAD')) {
            $name = $Matches[1]
            $published = @(Get-P3HPublishedActivities $State)
            $known = @($published | ForEach-Object { $_.photos } | Where-Object { $_.url -ceq $Route })
            $path = Join-Path (Join-Path $State.Directory 'photos') $name
            if (-not $known.Count -or -not [IO.File]::Exists($path)) { return New-P3HActivityResponse -Status 404 -Payload @{ error = 'Photo not found.' } }
            return New-P3HActivityResponse -Bytes ([IO.File]::ReadAllBytes($path)) -ContentType 'image/jpeg'
        }
        if ($Route -eq '/api/staff/session' -and $Method -eq 'GET') {
            return New-P3HActivityResponse -Payload @{ configured = [bool]$State.Credential; authenticated = [bool](Get-P3HStaffSession $State $Headers) }
        }
        $targetId = $null; $removeActivity = $false
        if ($Route -cmatch '^/api/activities/([a-f0-9]{32}|existing-event-\d+)(/delete)?$') { $targetId = $Matches[1]; $removeActivity = [bool]$Matches[2] }
        if (($Route -notin @('/api/staff/login', '/api/staff/logout', '/api/activities') -and -not $targetId) -or $Method -ne 'POST') {
            return New-P3HActivityResponse -Status 404 -Payload @{ error = 'Not found.' }
        }
        # Mutations require an exact trusted origin and a non-simple request header.
        if ($Headers['Origin'] -cnotin $State.Origins -or $Headers['X-P3H-Request'] -cne 'staff' -or $Headers['Content-Type'] -notmatch '^application/json(?:\s*;|$)') {
            return New-P3HActivityResponse -Status 403 -Payload @{ error = 'Please use staff access on this website.' }
        }
        $session = Get-P3HStaffSession $State $Headers
        if ($Route -eq '/api/staff/logout') {
            if ($session) { $State.Sessions.Remove($session) }
            return New-P3HActivityResponse -Payload @{ authenticated = $false } -Headers @{ 'Set-Cookie' = 'p3h_staff=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0' }
        }
        if (($Route -eq '/api/activities' -or $targetId) -and -not $session) {
            return New-P3HActivityResponse -Status 401 -Payload @{ error = 'Please sign in to publish photos.' }
        }
        if (-not $State.Credential) { return New-P3HActivityResponse -Status 503 -Payload @{ error = 'Staff publishing has not been set up on this server.' } }
        $maxBytes = if ($Route -eq '/api/staff/login') { 1024 } else { 26214400 }
        if ($RequestBytes.Length -lt 2 -or $RequestBytes.Length -gt $maxBytes) { return New-P3HActivityResponse -Status 413 -Payload @{ error = 'The upload is too large. Choose up to six photos, each 3 MB or less.' } }
        try { $payload = [Text.Encoding]::UTF8.GetString($RequestBytes) | ConvertFrom-Json -ErrorAction Stop }
        catch { return New-P3HActivityResponse -Status 400 -Payload @{ error = 'The request could not be read.' } }
        if ($Route -eq '/api/staff/login') {
            $now = [datetime]::UtcNow
            foreach ($key in @($State.Attempts.Keys)) {
                $recent = @($State.Attempts[$key] | Where-Object { $_ -gt $now.AddMinutes(-15) })
                if ($recent.Count) { $State.Attempts[$key] = $recent } else { $State.Attempts.Remove($key) }
            }
            $recentGlobal = @($State.GlobalAttempts | Where-Object { $_ -gt $now.AddMinutes(-15) })
            $State.GlobalAttempts.Clear()
            foreach ($attempt in $recentGlobal) { $State.GlobalAttempts.Add($attempt) }
            if (@($State.Attempts[$ClientAddress]).Count -ge 5 -or $State.GlobalAttempts.Count -ge 50) {
                return New-P3HActivityResponse -Status 429 -Payload @{ error = 'Too many attempts. Please try again in 15 minutes.' } -Headers @{ 'Retry-After' = '900' }
            }
            $State.Attempts[$ClientAddress] = @($State.Attempts[$ClientAddress]) + @($now)
            $State.GlobalAttempts.Add($now)
            if ($payload.code -isnot [string] -or -not (Test-P3HStaffCode $State.Credential $payload.code)) {
                return New-P3HActivityResponse -Status 401 -Payload @{ error = 'The access code is incorrect.' }
            }
            if ($session) { $State.Sessions.Remove($session) }
            $tokenBytes = New-Object byte[] 32
            $random = [Security.Cryptography.RandomNumberGenerator]::Create()
            try { $random.GetBytes($tokenBytes) } finally { $random.Dispose() }
            $token = [BitConverter]::ToString($tokenBytes).Replace('-', '').ToLowerInvariant()
            $State.Sessions[$token] = $now.AddMinutes(30)
            return New-P3HActivityResponse -Payload @{ authenticated = $true } -Headers @{ 'Set-Cookie' = "p3h_staff=$token; Path=/; HttpOnly; SameSite=Strict; Max-Age=1800" }
        }
        $previous = $null
        if ($targetId) {
            $previous = @(Get-P3HPublishedActivities $State | Where-Object { $_.id -ceq $targetId }) | Select-Object -First 1
            if (-not $previous) { return New-P3HActivityResponse -Status 404 -Payload @{ error = 'This activity is no longer available.' } }
            if ($payload.revision -cne $previous.revision) { return New-P3HActivityResponse -Status 409 -Payload @{ error = 'This activity has changed. Reload it before saving your changes.' } }
            if ($removeActivity) {
                $record = @{ id = $previous.id; deleted = $true; publishedAt = $previous.publishedAt; updatedAt = [datetime]::UtcNow.ToString('o'); revision = [guid]::NewGuid().ToString('N') }
                Save-P3HActivityRevision $State $record
                return New-P3HActivityResponse -Payload @{ removedId = $previous.id }
            }
        }
        # Validate every field and image before creating any persistent files.
        if ($payload.title -isnot [string] -or -not $payload.title.Trim() -or $payload.title.Length -gt 120) { throw [ArgumentException]::new('Enter an activity title of up to 120 characters.') }
        foreach ($field in @('titleZh', 'description', 'descriptionZh')) {
            $limit = if ($field -eq 'titleZh') { 120 } else { 1000 }
            if ($null -ne $payload.$field -and ($payload.$field -isnot [string] -or $payload.$field.Length -gt $limit)) { throw [ArgumentException]::new('The activity text is too long.') }
        }
        $eventDate = [datetime]::MinValue
        $undatedOriginal = $previous -and $previous.id -like 'existing-event-*' -and $payload.date -ceq ''
        if (-not $undatedOriginal -and ($payload.date -isnot [string] -or -not [datetime]::TryParseExact($payload.date, 'yyyy-MM-dd', [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::None, [ref]$eventDate))) { throw [ArgumentException]::new('Choose a valid activity date.') }
        if ($payload.photos -isnot [array] -or $payload.photos.Count -lt 1 -or $payload.photos.Count -gt 6) { throw [ArgumentException]::new('Choose between one and six photos.') }
        $validated = @()
        foreach ($photo in $payload.photos) {
            if ($photo.caption -isnot [string] -or -not $photo.caption.Trim() -or $photo.caption.Length -gt 240) { throw [ArgumentException]::new('Add a short caption for each photo, up to 240 characters.') }
            if ($null -ne $photo.captionZh -and ($photo.captionZh -isnot [string] -or $photo.captionZh.Length -gt 240)) { throw [ArgumentException]::new('Photo captions must be 240 characters or less.') }
            if ($photo.data -is [string]) {
                $validated += @{ bytes = (ConvertTo-P3HPhoto $photo.data); caption = $photo.caption.Trim(); captionZh = ([string]$photo.captionZh).Trim(); name = [guid]::NewGuid().ToString('N') + '.jpg' }
            } else {
                $retained = @($previous.photos | Where-Object { $_.url -ceq $photo.url })
                if (-not $previous -or $photo.url -isnot [string] -or $retained.Count -ne 1) { throw [ArgumentException]::new('A selected photo does not belong to this activity. Reload the activity and try again.') }
                $validated += @{ url = $photo.url; caption = $photo.caption.Trim(); captionZh = ([string]$photo.captionZh).Trim() }
            }
        }
        $photos = @($validated | ForEach-Object { @{ url = $(if ($_.name) { '/media/activities/' + $_.name } else { $_.url }); caption = $_.caption; captionZh = $_.captionZh } })
        if (@($photos.url | Select-Object -Unique).Count -ne $photos.Count) { throw [ArgumentException]::new('Each photo can only appear once in an activity.') }
        $activity = @{ id = [guid]::NewGuid().ToString('N'); title = $payload.title.Trim(); titleZh = ([string]$payload.titleZh).Trim(); description = ([string]$payload.description).Trim(); descriptionZh = ([string]$payload.descriptionZh).Trim(); date = $payload.date; publishedAt = [datetime]::UtcNow.ToString('o'); photos = $photos }
        if ($previous) { $activity.id = $previous.id; $activity.publishedAt = $previous.publishedAt }
        $activity.revision = [guid]::NewGuid().ToString('N')
        $activity.updatedAt = [datetime]::UtcNow.ToString('o')
        $written = @()
        try {
            foreach ($photo in $validated) {
                if (-not $photo.name) { continue }
                $photoPath = Join-Path (Join-Path $State.Directory 'photos') $photo.name
                [IO.File]::WriteAllBytes($photoPath, $photo.bytes)
                $written += $photoPath
            }
            Save-P3HActivityRevision $State $activity
        } catch {
            foreach ($photoPath in $written) { [IO.File]::Delete($photoPath) }
            throw
        }
        $status = if ($previous) { 200 } else { 201 }
        return New-P3HActivityResponse -Status $status -Payload @{ activity = $activity }
    } catch [ArgumentException] {
        return New-P3HActivityResponse -Status 400 -Payload @{ error = $_.Exception.Message }
    } catch {
        Write-Verbose ('Activity publishing failed: ' + $_.Exception.Message)
        return New-P3HActivityResponse -Status 500 -Payload @{ error = 'The activity could not be saved. Please try again.' }
    }
}

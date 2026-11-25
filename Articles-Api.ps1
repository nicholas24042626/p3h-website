# Public article metadata only. The upstream URL is fixed, never supplied by visitors.
function ConvertTo-P3HArticleImageUrl {
    param([string]$Source)
    if (-not $Source) { return $null }
    $uri = $null
    if (-not [Uri]::TryCreate([Uri]'https://www.carershub.sg', [Net.WebUtility]::HtmlDecode($Source), [ref]$uri)) { return $null }
    if ($uri.Scheme -cne 'https' -or $uri.Host -notin @('www.carershub.sg', 'carershub.sg') -or -not $uri.IsDefaultPort -or $uri.UserInfo -or $uri.AbsolutePath -notmatch '^/frontend/web/(?:cache|upload)/[A-Za-z0-9/_().%~-]+\.(?:png|jpe?g|webp)$' -or [Uri]::UnescapeDataString($uri.AbsolutePath).Contains('..')) { return $null }
    return 'https://www.carershub.sg' + $uri.AbsolutePath
}

function ConvertFrom-P3HCarersHubIndex {
    param([string]$Html, [DateTimeOffset]$Now = [DateTimeOffset]::UtcNow)
    if (-not $Html -or $Html.Length -gt 2097152) { throw 'Unexpected article index size.' }
    $pattern = '<div\b[^>]*\bclass\s*=\s*["''][^"'']*\bginner\b[^"'']*["''][^>]*>(?<body>.*?)<a\b(?=[^>]*\bclass\s*=\s*["''][^"'']*\blink-fix\b)(?<attributes>[^>]*)>.*?</a>'
    $regex = [regex]::new($pattern, [Text.RegularExpressions.RegexOptions]::Singleline -bor [Text.RegularExpressions.RegexOptions]::IgnoreCase, [TimeSpan]::FromSeconds(1))
    $today = $Now.ToOffset([TimeSpan]::FromHours(8)).Date
    $items = @(foreach ($card in $regex.Matches($Html)) {
        $content = $card.Groups['body'].Value
        $imageSource = [regex]::Match($content, '(?is)<img\b[^>]*\bsrc\s*=\s*["'']([^"'']+)["'']').Groups[1].Value
        $image = ConvertTo-P3HArticleImageUrl $imageSource
        $title = [regex]::Match($content, '(?is)<h4\b[^>]*>(.*?)</h4>').Groups[1].Value
        $date = [regex]::Match($content, '(?is)<div\b[^>]*class=["''][^"'']*\bgpost\b[^"'']*["''][^>]*>(.*?)</div>').Groups[1].Value
        $author = [regex]::Match($content, '(?is)<div\b[^>]*class=["''][^"'']*\bgby\b[^"'']*["''][^>]*>(.*?)</div>').Groups[1].Value
        $href = [Net.WebUtility]::HtmlDecode([regex]::Match($card.Groups['attributes'].Value, '(?is)\bhref\s*=\s*["'']([^"'']+)["'']').Groups[1].Value)
        $title = [regex]::Replace([Net.WebUtility]::HtmlDecode([regex]::Replace($title, '<[^>]+>', ' ')), '\s+', ' ').Trim()
        $date = [regex]::Replace([Net.WebUtility]::HtmlDecode([regex]::Replace($date, '<[^>]+>', ' ')), '\s+', ' ').Trim()
        $author = [regex]::Replace([Net.WebUtility]::HtmlDecode([regex]::Replace($author, '<[^>]+>', ' ')), '\s+', ' ').Trim() -replace '^By\s+', ''
        $published = [datetime]::MinValue
        if (-not $title -or $title.Length -gt 240 -or $author.Length -gt 200 -or -not [datetime]::TryParseExact($date, [string[]]@('dd MMMM yyyy', 'd MMMM yyyy'), [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::None, [ref]$published) -or $published.Date -gt $today) { continue }
        $uri = $null
        if (-not [Uri]::TryCreate([Uri]'https://www.carershub.sg', $href, [ref]$uri)) { continue }
        if ($uri.Scheme -cne 'https' -or $uri.Host -notin @('www.carershub.sg', 'carershub.sg') -or -not $uri.IsDefaultPort -or $uri.UserInfo -or $uri.AbsolutePath -cnotmatch '^/articles/[a-z0-9]+(?:-[a-z0-9]+)*/?$') { continue }
        @{ title = $title; date = $published.ToString('yyyy-MM-dd'); author = $author; image = $image; url = 'https://www.carershub.sg' + $uri.AbsolutePath.TrimEnd('/') }
    })
    $latest = @($items | Sort-Object @{ Expression = { $_.date }; Descending = $true }, @{ Expression = { $_.url }; Descending = $false } | Group-Object { $_.url } | ForEach-Object { $_.Group | Select-Object -First 1 } | Sort-Object @{ Expression = { $_.date }; Descending = $true }, @{ Expression = { $_.url }; Descending = $false } | Select-Object -First 3)
    if ($latest.Count -ne 3) { throw 'Could not find three dated article links in the publisher index.' }
    return $latest
}

function Test-P3HArticleSnapshot {
    param($Snapshot)
    if (-not $Snapshot -or @($Snapshot.articles).Count -ne 3) { return $false }
    $checked = [DateTimeOffset]::MinValue
    if (-not [DateTimeOffset]::TryParse([string]$Snapshot.checkedAt, [ref]$checked) -or $checked -gt [DateTimeOffset]::UtcNow.AddMinutes(5)) { return $false }
    $seen = @{}
    foreach ($article in $Snapshot.articles) {
        if ($article.title -isnot [string] -or -not $article.title.Trim() -or $article.title.Length -gt 240 -or $article.author -isnot [string] -or $article.author.Length -gt 200 -or $article.url -isnot [string] -or $article.url -cnotmatch '^https://www\.carershub\.sg/articles/[a-z0-9]+(?:-[a-z0-9]+)*$' -or $seen.ContainsKey($article.url)) { return $false }
        if ($article.image -and ($article.image -isnot [string] -or -not (ConvertTo-P3HArticleImageUrl $article.image))) { return $false }
        $date = [datetime]::MinValue
        if (-not [datetime]::TryParseExact([string]$article.date, 'yyyy-MM-dd', [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::None, [ref]$date) -or $date.Date -gt [DateTimeOffset]::UtcNow.ToOffset([TimeSpan]::FromHours(8)).Date) { return $false }
        $seen[$article.url] = $true
    }
    return $true
}

function New-P3HArticleState {
    param([string]$DataDirectory, [string]$WebsiteRoot)
    $cache = $null
    $cachePath = Join-Path $DataDirectory 'carershub-articles.json'
    $snapshotPath = Join-Path $WebsiteRoot 'assets/data/carershub-articles.json'
    foreach ($path in @($cachePath, $snapshotPath)) {
        if (-not [IO.File]::Exists($path)) { continue }
        try {
            $candidate = [IO.File]::ReadAllText($path) | ConvertFrom-Json
            if ((Test-P3HArticleSnapshot $candidate) -and (-not $cache -or [DateTimeOffset]$candidate.checkedAt -gt [DateTimeOffset]$cache.checkedAt)) { $cache = $candidate }
        } catch { continue }
    }
    return @{ Cache = $cache; CachePath = $cachePath; NextAttempt = [DateTimeOffset]::MinValue; Source = 'https://www.carershub.sg/articles' }
}

function Get-P3HCarersHubHtml {
    $response = Invoke-WebRequest -Uri 'https://www.carershub.sg/articles' -UseBasicParsing -TimeoutSec 8 -MaximumRedirection 0 -UserAgent 'P3H-ArticleLinks/1.0'
    if ($response.StatusCode -ne 200 -or $response.Headers['Content-Type'] -notmatch 'text/html') { throw 'Unexpected article index response.' }
    return [string]$response.Content
}

function Get-P3HLatestArticles {
    param($State, [DateTimeOffset]$Now = [DateTimeOffset]::UtcNow)
    $fresh = $State.Cache -and $State.Cache.schemaVersion -eq 2 -and $Now -lt ([DateTimeOffset]$State.Cache.checkedAt).AddHours(1)
    if (-not $fresh -and $Now -ge $State.NextAttempt) {
        # Back off failures across requests; never discard the last valid snapshot.
        $State.NextAttempt = $Now.AddMinutes(10)
        try {
            $articles = @(ConvertFrom-P3HCarersHubIndex -Html (Get-P3HCarersHubHtml) -Now $Now)
            $snapshot = @{ schemaVersion = 2; articles = $articles; checkedAt = $Now.ToString('o') }
            [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($State.CachePath)) | Out-Null
            [IO.File]::WriteAllText($State.CachePath, (ConvertTo-Json -InputObject $snapshot -Depth 6), [Text.UTF8Encoding]::new($false))
            $State.Cache = $snapshot
            $State.NextAttempt = $Now.AddHours(1)
            $fresh = $true
        } catch { Write-Verbose ('Article refresh unavailable: ' + $_.Exception.Message) }
    }
    if (-not $State.Cache) {
        return @{ articles = @(); checkedAt = $null; status = 'unavailable'; sourceUrl = $State.Source }
    }
    return @{ articles = @($State.Cache.articles | Sort-Object { $_.date } -Descending); checkedAt = $State.Cache.checkedAt; status = $(if ($fresh) { 'fresh' } else { 'cached' }); sourceUrl = $State.Source }
}

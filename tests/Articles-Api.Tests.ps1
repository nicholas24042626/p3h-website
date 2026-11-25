$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '../Articles-Api.ps1')
$workspaceRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$testRoot = Join-Path $workspaceRoot ('tmp/article-api-' + [guid]::NewGuid().ToString('N'))
$checks = 0
function Assert($condition, $message) { if (-not $condition) { throw $message }; $script:checks++ }
function Card($title, $day, $url, $author = 'Local Care Team') {
    $date = $day.ToString('dd MMMM yyyy', [Globalization.CultureInfo]::InvariantCulture)
    return "<div class='ginner imgeffect'><img src='https://www.carershub.sg/frontend/web/cache/123/1500x742/photo.png'><div class='gcontent'><h4>$title</h4><div class='gpost'>$date</div><div class='gby'>By $author</div></div><a href='$url' class='link-fix'>View details</a></div>"
}
try {
    $now = [DateTimeOffset]::UtcNow
    $today = $now.ToOffset([TimeSpan]::FromHours(8)).Date
    $old = Card 'Old article' $today.AddDays(-30) '/articles/old-article'
    $one = Card 'A &amp; B' $today '/articles/latest?utm_source=test'
    $two = Card '<span>Second</span> article' $today.AddDays(-1) 'https://carershub.sg/articles/second/'
    $three = Card 'Third article' $today.AddDays(-2) '/articles/third'
    $future = Card 'Not published yet' $today.AddDays(1) '/articles/future'
    $bad = (Card 'Offsite' $today 'https://www.carershub.sg.evil.example/articles/offsite') + (Card 'Script URL' $today 'javascript:alert(1)') + (Card 'Unexpected path' $today '/login') + (Card 'Wrong port' $today 'https://www.carershub.sg:8081/articles/port')
    $script:index = '<h4>Undated featured story</h4>' + $old + $three + $future + $two + $one + $bad + $one
    $items = @(ConvertFrom-P3HCarersHubIndex -Html $script:index -Now $now)
    Assert ($items.Count -eq 3) 'Exactly three distinct valid articles are required'
    Assert ($items[0].title -eq 'A & B' -and $items[1].title -eq 'Second article') 'Decode metadata and sort by publication date, not DOM position'
    Assert ($items[0].url -eq 'https://www.carershub.sg/articles/latest' -and $items[1].url -eq 'https://www.carershub.sg/articles/second') 'Canonical links must strip tracking and use the trusted publisher'
    Assert ($items[0].author -eq 'Local Care Team') 'Author attribution missing'
    Assert ($items[0].image -eq 'https://www.carershub.sg/frontend/web/cache/123/1500x742/photo.png') 'Each thumbnail must stay paired with its article'
    Assert (-not (ConvertTo-P3HArticleImageUrl 'https://evil.example/photo.png')) 'Offsite thumbnail URLs must be rejected'
    Assert (-not (ConvertTo-P3HArticleImageUrl 'javascript:alert(1)')) 'Unsafe image schemes must be rejected'
    Assert (-not (ConvertTo-P3HArticleImageUrl 'https://www.carershub.sg/frontend/web/cache/123/photo.svg')) 'Only raster thumbnails are accepted'
    Assert (@($items | Where-Object { $_.url -match 'future|offsite|login|port' }).Count -eq 0) 'Future and unsafe links must be excluded'
    foreach ($invalid in @('', '<html>Site under maintenance</html>', $one + $one, ('x' * 2097153))) {
        $rejected = $false
        try { ConvertFrom-P3HCarersHubIndex -Html $invalid -Now $now | Out-Null } catch { $rejected = $true }
        Assert $rejected 'Unrecognised or incomplete upstream content must not replace a valid cache'
    }
    $script:fetches = 0; $script:fail = $false
    function Get-P3HCarersHubHtml { $script:fetches++; if ($script:fail) { throw 'Upstream unavailable' }; return $script:index }
    $private = Join-Path $testRoot 'private'; $public = Join-Path $testRoot 'public'
    $state = New-P3HArticleState -DataDirectory $private -WebsiteRoot $public
    $feed = Get-P3HLatestArticles -State $state -Now $now
    Assert ($feed.status -eq 'fresh' -and $feed.articles.Count -eq 3 -and $script:fetches -eq 1) 'First successful request must fetch and cache the latest three'
    Assert ([IO.File]::Exists($state.CachePath)) 'Successful metadata must persist to disk'
    $warm = Get-P3HLatestArticles -State $state -Now $now.AddMinutes(30)
    Assert ($script:fetches -eq 1 -and $warm.checkedAt -eq $feed.checkedAt) 'Warm cache must avoid repeated publisher requests or fake check times'
    $restart = New-P3HArticleState -DataDirectory $private -WebsiteRoot $public
    Assert ($restart.Cache.articles.Count -eq 3) 'Cache must survive a server restart'
    $state.Cache.checkedAt = $now.AddHours(-2).ToString('o'); $state.NextAttempt = [DateTimeOffset]::MinValue; $script:fail = $true
    $stale = Get-P3HLatestArticles -State $state -Now $now
    Assert ($stale.status -eq 'cached' -and $stale.articles.Count -eq 3) 'An outage must preserve the last successful articles'
    Assert ($stale.checkedAt -eq $now.AddHours(-2).ToString('o')) 'An outage must never report a new successful check time'
    $attempts = $script:fetches
    $null = Get-P3HLatestArticles -State $state -Now $now.AddMinutes(1)
    Assert ($script:fetches -eq $attempts) 'Failed refreshes must be rate limited across visitors'
    $script:fail = $false; $state.NextAttempt = [DateTimeOffset]::MinValue
    $recovered = Get-P3HLatestArticles -State $state -Now $now
    Assert ($recovered.status -eq 'fresh' -and $recovered.checkedAt -eq $now.ToString('o')) 'Feed must recover after the publisher returns'
    $validFile = [IO.File]::ReadAllText($state.CachePath)
    $script:index = '<html>Changed publisher markup</html>'; $state.Cache.checkedAt = $now.AddHours(-2).ToString('o'); $state.NextAttempt = [DateTimeOffset]::MinValue
    $changed = Get-P3HLatestArticles -State $state -Now $now
    Assert ($changed.status -eq 'cached' -and [IO.File]::ReadAllText($state.CachePath) -eq $validFile) 'Parser changes must not poison the persisted cache'
    $poison = $validFile | ConvertFrom-Json; $poison.articles[0].url = 'https://evil.example/articles/fake'
    Assert (-not (Test-P3HArticleSnapshot $poison)) 'Cached offsite links must fail validation'
    [IO.File]::WriteAllText($state.CachePath, ($poison | ConvertTo-Json -Depth 6))
    $empty = New-P3HArticleState -DataDirectory $private -WebsiteRoot $public
    Assert (-not $empty.Cache) 'Invalid disk cache must not be trusted'
    $script:fail = $true
    $unavailable = Get-P3HLatestArticles -State $empty -Now $now
    Assert ($unavailable.status -eq 'unavailable' -and $unavailable.articles.Count -eq 0) 'An empty failed feed must say unavailable, never invent stories'
    $snapshotDirectory = Join-Path $public 'assets/data'; [IO.Directory]::CreateDirectory($snapshotDirectory) | Out-Null
    [IO.File]::WriteAllText((Join-Path $snapshotDirectory 'carershub-articles.json'), $validFile)
    $seeded = New-P3HArticleState -DataDirectory $private -WebsiteRoot $public
    Assert ($seeded.Cache.articles.Count -eq 3) 'Valid public fallback must survive a missing or invalid private cache'
    Write-Output "PASS: $checks article parsing, sorting, link validation, cache, restart, outage and recovery checks."
} finally {
    $resolved = [IO.Path]::GetFullPath($testRoot)
    $allowed = [IO.Path]::GetFullPath((Join-Path $workspaceRoot 'tmp')) + [IO.Path]::DirectorySeparatorChar
    if ($resolved.StartsWith($allowed, [StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $resolved)) { Remove-Item -LiteralPath $resolved -Recurse -Force }
}

# Run after editing canonical pages or navigation. No build dependencies required.
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$utf8 = New-Object Text.UTF8Encoding($false)
$destinations = @(
    @('home', 'index.html', 'Home'),
    @('assistance', 'assistance.html', 'Caregiver support'),
    @('activities', 'activities.html', 'Activities'),
    @('resources', 'resources.html', 'Resources &amp; FAQs'),
    @('contact', 'contact.html', 'Contact')
)
$pages = @('index.html', 'assistance.html', 'activities.html', 'resources.html', 'contact.html')
$routeHomes = @{
    'how-we-help.html' = 'assistance.html#financial-support'
    'programmes.html' = 'assistance.html#training-programmes'
    'target-groups.html' = 'assistance.html#who-we-help'
    'faq.html' = 'resources.html#faqs'
    'venues.html' = 'contact.html#visit'
    'partners.html' = 'index.html#about'
    'testimonies.html' = 'activities.html'
    'streams/stream-1.html' = 'assistance.html#support-1'
    'streams/stream-2.html' = 'assistance.html#support-2'
    'streams/stream-3.html' = 'assistance.html#support-3'
    'streams/stream-4.html' = 'assistance.html#support-4'
}
foreach ($page in $pages) {
    $path = Join-Path $root $page
    $html = [IO.File]::ReadAllText($path)
    $html = [regex]::Replace($html, 'href="(?:\.\./)?([^"#]+)(#[^"]*)?"', [Text.RegularExpressions.MatchEvaluator]{
        param($m)
        $route = $m.Groups[1].Value
        if (-not $routeHomes.ContainsKey($route)) { return $m.Value }
        $destination = $routeHomes[$route]
        if ($m.Groups[2].Success) { $destination = $destination.Split('#')[0] + $m.Groups[2].Value }
        return 'href="' + $destination + '"'
    })
    # Preserve section fragments, including when opened in a separate tab.
    $html = $html.Replace("href=`"$page#", 'href="#')
    $current = [regex]::Match($html, '<body data-page="([^"]+)"').Groups[1].Value
    $links = foreach ($item in $destinations) {
        $active = if ($item[0] -eq $current) { ' aria-current="page"' } else { '' }
        $class = if ($item[0] -eq 'contact') { ' class="nav-contact"' } else { '' }
        "<li><a$class data-page-link=`"$($item[0])`" href=`"$($item[1])`"$active>$($item[2])</a></li>"
    }
    $nav = '<nav class="main-nav" id="main-nav" aria-label="Main navigation"><ul>' + ($links -join "`n") + '</ul></nav>'
    $html = [regex]::Replace($html, '(?s)<nav class="main-nav".*?</nav>', [Text.RegularExpressions.MatchEvaluator]{ param($m) $nav })
    $html = [regex]::Replace($html, '<title>.*?</title>', "<title>$($destinations.Where({ $_[1] -eq $page })[0][2]) | P3H</title>")
    $html = [regex]::Replace($html, '<link rel="canonical"[^>]*>\s*', '')
    $html = $html.Replace('</head>', "<link rel=`"canonical`" href=`"$page`">`n</head>")
    $footer = @'
<footer class="site-footer"><div class="container footer-grid">
<div><h2>P3H</h2><p>Humanistic Hands and Heart.<br>A caregiver support programme by Tzu Chi Singapore.</p></div>
<div><h3>Care for the caregiver</h3><p>Supporting youth and adult caregivers in Singapore.</p></div>
<div><h3>Speak with the team</h3><p>Monday to Friday, 9am&ndash;5pm</p><a href="contact.html">Contact &amp; registration &rarr;</a></div>
</div><div class="container footer-bottom"><small>Practical help, room to recharge and a community that understands.</small></div></footer>
'@
    $html = [regex]::Replace($html, '(?s)<footer class="site-footer">.*?</footer>', [Text.RegularExpressions.MatchEvaluator]{ param($m) $footer })
    $html = [regex]::Replace($html, '<a\b[^>]*\bhref="[^"]*"[^>]*>', [Text.RegularExpressions.MatchEvaluator]{
        param($m)
        $anchor = [regex]::Replace($m.Value, '\s+(target|rel)="[^"]*"', '')
        # Buttons, brand/home navigation and in-page actions stay in this tab.
        if ($anchor -match 'class="[^"]*\b(button|brand|skip-link)\b' -or $anchor -match 'data-page-link=|href="#') { return $anchor }
        return $anchor.TrimEnd('>') + ' target="_blank" rel="noopener noreferrer">'
    })
    # Navigation containers are controls even when their items look like text links.
    $html = [regex]::Replace($html, '(?s)<(nav|header|footer)\b[^>]*>.*?</\1>', [Text.RegularExpressions.MatchEvaluator]{
        param($m)
        return [regex]::Replace($m.Value, '(<a\b[^>]*?)(\s+(?:target|rel)="[^"]*")', '$1') -replace '\s+rel="noopener noreferrer"', ''
    })
    [IO.File]::WriteAllText($path, $html, $utf8)
}
# Old URLs serve the same complete workspace, without redirect-only pages or a
# second editable content source. Canonical links/noindex keep one primary home.
$aliases = @(
    @('how-we-help.html', 'assistance.html', 'financial-support'),
    @('programmes.html', 'assistance.html', 'training-programmes'),
    @('target-groups.html', 'assistance.html', 'support-options'),
    @('streams/stream-1.html', 'assistance.html', 'support-options'),
    @('streams/stream-2.html', 'assistance.html', 'support-options'),
    @('streams/stream-3.html', 'assistance.html', 'support-options'),
    @('streams/stream-4.html', 'assistance.html', 'support-options'),
    @('faq.html', 'resources.html', ''),
    @('venues.html', 'contact.html', ''),
    @('partners.html', 'index.html', ''),
    @('testimonies.html', 'activities.html', '')
)
foreach ($alias in $aliases) {
    $html = [IO.File]::ReadAllText((Join-Path $root $alias[1]))
    $html = $html.Replace('<body data-page=', "<body data-default-section=`"$($alias[2])`" data-legacy-route=`"true`" data-page=")
    $target = $routeHomes[$alias[0]].Split('#') | Select-Object -Skip 1
    if ($target) { $html = $html.Replace('data-legacy-route="true"', "data-legacy-route=`"true`" data-default-target=`"$target`"") }
    $html = $html.Replace('</head>', "<meta name=`"robots`" content=`"noindex,follow`">`n</head>")
    if ($alias[0] -match 'streams/') {
        $html = [regex]::Replace($html, '(href|src)="(?!https?:|mailto:|#)([^"]+)"', '$1="../$2"')
        $number = [regex]::Match($alias[0], 'stream-(\d)').Groups[1].Value
        $html = $html.Replace("id=`"support-$number`"", "open id=`"support-$number`"")
    }
    [IO.File]::WriteAllText((Join-Path $root $alias[0]), $html, $utf8)
}
Write-Output 'Updated five canonical pages and eleven compatibility routes.'

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$canonical = @('index.html', 'assistance.html', 'activities.html', 'resources.html', 'contact.html')
$allPages = Get-ChildItem -LiteralPath $root -Filter '*.html' -File
$allPages += Get-ChildItem -LiteralPath (Join-Path $root 'streams') -Filter '*.html' -File
$checks = 0
function Assert($condition, $message) {
    if (-not $condition) { throw $message }
    $script:checks++
}
foreach ($file in $allPages) {
    $html = [IO.File]::ReadAllText($file.FullName)
    Assert (([regex]::Matches($html, '<h1\b')).Count -eq 1) "$($file.Name): expected one page title"
    $ids = @([regex]::Matches($html, '\bid="([^"]+)"') | ForEach-Object { $_.Groups[1].Value })
    Assert (($ids | Select-Object -Unique).Count -eq $ids.Count) "$($file.Name): duplicate IDs"
    $nav = [regex]::Match($html, '(?s)<nav class="main-nav".*?</nav>').Value
    Assert (([regex]::Matches($nav, '<a\b')).Count -eq 5) "$($file.Name): expected five primary destinations"
    Assert (([regex]::Matches($nav, 'aria-current="page"')).Count -eq 1) "$($file.Name): expected one current destination"
    Assert ($nav -notmatch '<details|<summary') "$($file.Name): primary navigation must be flat"
    Assert ($html -notmatch 'http-equiv="refresh"') "$($file.Name): redirect-only route"
    # Check local files and fragments on all sixteen public routes, including nested aliases.
    foreach ($link in [regex]::Matches($html, '(?:href|src)="([^"]+)"')) {
        $url = [Net.WebUtility]::HtmlDecode($link.Groups[1].Value)
        if ($url -match '^(https?:|mailto:|tel:|data:)') { continue }
        $parts = $url.Split('#')
        $target = if ($parts[0]) { [IO.Path]::GetFullPath((Join-Path $file.DirectoryName ([Uri]::UnescapeDataString($parts[0])))) } else { $file.FullName }
        Assert (Test-Path -LiteralPath $target -PathType Leaf) "$($file.Name): broken local URL $url"
        if ($parts.Count -gt 1 -and $parts[1]) {
            $targetHtml = [IO.File]::ReadAllText($target)
            Assert ($targetHtml.Contains('id="' + $parts[1] + '"')) "$($file.Name): missing fragment $url"
        }
    }
    # Check nesting in source; a browser can silently repair mismatched sections.
    $main = [regex]::Match($html, '(?s)<main\b.*?</main>').Value
    $stack = New-Object 'Collections.Generic.Stack[string]'
    foreach ($tag in [regex]::Matches($main, '</?(main|section|div|article|aside|details|summary|nav)\b[^>]*>')) {
        $name = $tag.Groups[1].Value
        if ($tag.Value.StartsWith('</')) {
            Assert ($stack.Count -gt 0 -and $stack.Pop() -eq $name) "$($file.Name): unbalanced $($tag.Value)"
        } else { $stack.Push($name) }
    }
    Assert ($stack.Count -eq 0) "$($file.Name): unclosed structural tags"
}
foreach ($page in $canonical) {
    $html = [IO.File]::ReadAllText((Join-Path $root $page))
    Assert ($html -notmatch 'href="(?:\.\./)?(?:streams/|how-we-help|programmes|target-groups|faq\.html|venues|partners|testimonies)') "$page exposes a legacy destination"
    Assert ($html -notmatch 'data-legacy-route') "$page marked as a compatibility route"
}
$support = [IO.File]::ReadAllText((Join-Path $root 'assistance.html'))
Assert (([regex]::Matches($support, 'data-workspace-panel')).Count -eq 5) 'Expected five support sections'
Assert (([regex]::Matches($support, 'class="card grant-card ')).Count -eq 7) 'All seven grants must be retained'
Assert (([regex]::Matches($support, 'class="card scheme-card ')).Count -eq 8) 'All eight non-grant services must be retained'
Assert (([regex]::Matches($support, 'class="support-option"')).Count -eq 4) 'All four support areas must be retained'
Assert (([regex]::Matches($support, '<h3>Seniors')).Count -eq 1) 'SMF must have only one catalogue entry'
Assert ($support -notmatch 'hidden[ >]') 'Source sections must remain available without JavaScript'
Write-Output "PASS: $checks navigation, content, file, fragment and structure checks across 16 public routes."

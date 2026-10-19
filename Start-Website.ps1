param([int]$Port = 8080, [switch]$NoBrowser)

$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath($PSScriptRoot)
. (Join-Path $root 'Chatbot-Api.ps1')
$chatRequests = [Collections.Generic.Queue[datetime]]::new()
$listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $Port)
$types = @{
    '.html' = 'text/html; charset=utf-8'
    '.css' = 'text/css; charset=utf-8'
    '.js' = 'text/javascript; charset=utf-8'
    '.svg' = 'image/svg+xml'
    '.png' = 'image/png'
    '.jpg' = 'image/jpeg'
    '.jpeg' = 'image/jpeg'
    '.pdf' = 'application/pdf'
    '.ico' = 'image/x-icon'
    '.webp' = 'image/webp'
}
$listener.Start()
Write-Host "Website running at http://localhost:$Port/ (Ctrl+C to stop)"
if (-not $NoBrowser) { Start-Process "http://localhost:$Port/" }
try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        $client.ReceiveTimeout = 5000
        try {
            $stream = $client.GetStream()
            $headerBytes = [Collections.Generic.List[byte]]::new()
            while ($true) {
                $nextByte = $stream.ReadByte()
                if ($nextByte -lt 0) { throw 'Incomplete request' }
                $headerBytes.Add([byte]$nextByte)
                $count = $headerBytes.Count
                if ($count -gt 16384) { throw 'Headers too large' }
                if ($count -ge 4 -and $headerBytes[$count-4] -eq 13 -and $headerBytes[$count-3] -eq 10 -and $headerBytes[$count-2] -eq 13 -and $headerBytes[$count-1] -eq 10) { break }
            }
            $headerText = [Text.Encoding]::ASCII.GetString($headerBytes.ToArray())
            $request = ($headerText -split "`r`n")[0]
            $parts = $request.Split(' ')
            if ($parts.Count -ne 3 -or $parts[2] -notmatch '^HTTP/1\.[01]$') { throw 'Invalid request line' }
            $path = [Uri]::UnescapeDataString(($parts[1] -split '\?')[0]).Replace('/', [IO.Path]::DirectorySeparatorChar)
            $path = $path.TrimStart([char[]]'\/')
            if (-not $path) { $path = 'index.html' }
            $file = [IO.Path]::GetFullPath([IO.Path]::Combine($root, $path))
            $status = '200 OK'
            $type = 'text/plain; charset=utf-8'
            $route = ($parts[1] -split '\?')[0]
            if ($route -eq '/api/chat/status' -and $parts[0] -eq 'GET') {
                $type = 'application/json; charset=utf-8'
                $body = [Text.Encoding]::UTF8.GetBytes((@{ enabled = [bool]$env:OPENAI_API_KEY } | ConvertTo-Json -Compress))
            } elseif ($route -eq '/api/chat' -and $parts[0] -eq 'POST') {
                $type = 'application/json; charset=utf-8'
                $lengthMatch = [regex]::Match($headerText, '(?im)^Content-Length:\s*(\d+)\s*$')
                $length = 0
                if ($lengthMatch.Success) { [void][int]::TryParse($lengthMatch.Groups[1].Value, [ref]$length) }
                # Consume bounded request bodies before replying, including errors.
                # Otherwise Windows HTTP clients can see a TCP reset instead of JSON.
                if ($length -ge 1 -and $length -le 65536) {
                    if ($headerText -match '(?im)^Expect:\s*100-continue\s*$') {
                        $continue = [Text.Encoding]::ASCII.GetBytes("HTTP/1.1 100 Continue`r`n`r`n")
                        $stream.Write($continue, 0, $continue.Length)
                    }
                    $requestBytes = New-Object byte[] $length
                    $offset = 0
                    while ($offset -lt $length) {
                        $read = $stream.Read($requestBytes, $offset, $length - $offset)
                        if ($read -eq 0) { throw 'Incomplete body' }
                        $offset += $read
                    }
                }
                $origin = [regex]::Match($headerText, '(?im)^Origin:\s*([^\r\n]+)').Groups[1].Value.Trim()
                $now = [datetime]::UtcNow
                while ($chatRequests.Count -gt 0 -and ($now - $chatRequests.Peek()).TotalSeconds -gt 60) { [void]$chatRequests.Dequeue() }
                if ($origin -and $origin -notin @("http://localhost:$Port", "http://127.0.0.1:$Port")) {
                    $status = '403 Forbidden'; $json = '{"error":"Origin not allowed"}'
                } elseif (-not $env:OPENAI_API_KEY) {
                    $status = '503 Service Unavailable'; $json = '{"error":"AI is not configured"}'
                } elseif ($length -lt 1 -or $length -gt 65536) {
                    $status = '400 Bad Request'; $json = '{"error":"Invalid request size"}'
                } elseif ($chatRequests.Count -ge 12) {
                    $status = '429 Too Many Requests'; $json = '{"error":"Please try again shortly"}'
                } else {
                    $chatRequests.Enqueue($now)
                    try { $json = Get-P3HChatReply -RequestBody ([Text.Encoding]::UTF8.GetString($requestBytes)) -WebsiteRoot $root }
                    catch [ArgumentException] { $status = '400 Bad Request'; $json = '{"error":"Invalid chat messages"}' }
                    catch { $status = '502 Bad Gateway'; $json = '{"error":"AI unavailable. Please use the local guide."}' }
                }
                $body = [Text.Encoding]::UTF8.GetBytes($json)
            } elseif (-not $file.StartsWith($root + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
                $status = '403 Forbidden'
                $body = [Text.Encoding]::UTF8.GetBytes('Forbidden')
            } elseif ($parts[0] -notin @('GET', 'HEAD')) {
                $status = '405 Method Not Allowed'
                $body = [Text.Encoding]::UTF8.GetBytes('Method not allowed')
            } elseif ([IO.Path]::GetExtension($file) -notin @('.html', '.css', '.js', '.svg', '.png', '.jpg', '.jpeg', '.pdf', '.ico', '.webp')) {
                $status = '403 Forbidden'
                $body = [Text.Encoding]::UTF8.GetBytes('Forbidden')
            } elseif (-not [IO.File]::Exists($file)) {
                $status = '404 Not Found'
                $body = [Text.Encoding]::UTF8.GetBytes('Not found')
            } else {
                $body = [IO.File]::ReadAllBytes($file)
                $extension = [IO.Path]::GetExtension($file).ToLowerInvariant()
                $type = 'application/octet-stream'
                if ($types.ContainsKey($extension)) { $type = $types[$extension] }
            }
            $header = [Text.Encoding]::ASCII.GetBytes("HTTP/1.1 $status`r`nContent-Type: $type`r`nContent-Length: $($body.Length)`r`nX-Content-Type-Options: nosniff`r`nCache-Control: no-store`r`nConnection: close`r`n`r`n")
            $stream.Write($header, 0, $header.Length)
            if ($parts[0] -ne 'HEAD') { $stream.Write($body, 0, $body.Length) }
        } catch {
            Write-Warning $_.Exception.Message
        } finally {
            $client.Dispose()
        }
    }
} finally {
    $listener.Stop()
}

param(
  [int]$Port = 8765
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = [System.IO.Path]::GetFullPath($root)
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://127.0.0.1:$Port/")
$listener.Start()

$mimeTypes = @{
  ".html" = "text/html; charset=utf-8"
  ".js" = "text/javascript; charset=utf-8"
  ".css" = "text/css; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".png" = "image/png"
  ".jpg" = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".svg" = "image/svg+xml"
  ".glb" = "model/gltf-binary"
  ".gltf" = "model/gltf+json"
  ".bin" = "application/octet-stream"
}

Write-Host "Roofline Dash server running at http://127.0.0.1:$Port/index.html"
Write-Host "Keep this window open while you play. Press Ctrl+C to stop it."

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $response = $context.Response

    try {
      $relativePath = [System.Uri]::UnescapeDataString($context.Request.Url.AbsolutePath.TrimStart('/'))
      if ([string]::IsNullOrWhiteSpace($relativePath)) {
        $relativePath = "index.html"
      }

      $candidate = Join-Path $root $relativePath
      $resolved = [System.IO.Path]::GetFullPath($candidate)

      if (-not $resolved.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $resolved -PathType Leaf)) {
        $response.StatusCode = 404
        $body = [System.Text.Encoding]::UTF8.GetBytes("Not found")
        $response.ContentType = "text/plain; charset=utf-8"
        $response.OutputStream.Write($body, 0, $body.Length)
        continue
      }

      $extension = [System.IO.Path]::GetExtension($resolved).ToLowerInvariant()
      $contentType = $mimeTypes[$extension]
      if (-not $contentType) {
        $contentType = "application/octet-stream"
      }

      $bytes = [System.IO.File]::ReadAllBytes($resolved)
      $response.StatusCode = 200
      $response.ContentType = $contentType
      $response.ContentLength64 = $bytes.Length
      $response.OutputStream.Write($bytes, 0, $bytes.Length)
    } catch {
      $response.StatusCode = 500
      $body = [System.Text.Encoding]::UTF8.GetBytes("Server error")
      $response.ContentType = "text/plain; charset=utf-8"
      $response.OutputStream.Write($body, 0, $body.Length)
    } finally {
      $response.OutputStream.Close()
    }
  }
} finally {
  $listener.Stop()
  $listener.Close()
}

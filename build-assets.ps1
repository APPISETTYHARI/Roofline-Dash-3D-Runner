$ErrorActionPreference = "Stop"
$assetsPath = '.\assets'
$outputJs = '.\assets.js'

$jsContent = [System.Text.StringBuilder]::new()
[void]$jsContent.AppendLine('window.ROOFLINE_ASSETS = {')

function Encode-Gltf {
    param([string]$key, [string]$fileName)
    $fullPath = Join-Path $assetsPath $fileName
    if (-not (Test-Path $fullPath)) {
        Write-Host "Missing $fileName"
        return $false
    }
    
    if ($fileName.EndsWith(".glb")) {
        $bytes = [System.IO.File]::ReadAllBytes($fullPath)
        $b64 = [System.Convert]::ToBase64String($bytes)
        $line = "  `"$key`": `"$b64`","
        [void]$jsContent.AppendLine($line)
        return $true
    }
    
    $jsonStr = [System.IO.File]::ReadAllText($fullPath)
    $json = ConvertFrom-Json $jsonStr
    
    if ($json.buffers) {
        foreach ($buffer in $json.buffers) {
            if ($buffer.uri -and -not $buffer.uri.StartsWith('data:')) {
                $binPath = Join-Path $assetsPath $buffer.uri
                if (Test-Path $binPath) {
                    $binBytes = [System.IO.File]::ReadAllBytes($binPath)
                    $binB64 = [System.Convert]::ToBase64String($binBytes)
                    $buffer.uri = 'data:application/octet-stream;base64,' + $binB64
                }
            }
        }
    }
    if ($json.images) {
        foreach ($img in $json.images) {
            if ($img.uri -and -not $img.uri.StartsWith('data:')) {
                $imgPath = Join-Path $assetsPath $img.uri
                if (Test-Path $imgPath) {
                    $imgBytes = [System.IO.File]::ReadAllBytes($imgPath)
                    $imgB64 = [System.Convert]::ToBase64String($imgBytes)
                    $mime = "image/png"
                    if ($img.uri.ToLower().EndsWith(".jpg") -or $img.uri.ToLower().EndsWith(".jpeg")) {
                        $mime = "image/jpeg"
                    }
                    $img.uri = "data:$mime;base64," + $imgB64
                }
            }
        }
    }
    
    $newJsonStr = ConvertTo-Json -InputObject $json -Depth 10 -Compress
    $utf8Bytes = [System.Text.Encoding]::UTF8.GetBytes($newJsonStr)
    $b64 = [System.Convert]::ToBase64String($utf8Bytes)
    $line = "  `"$key`": `"$b64`","
    [void]$jsContent.AppendLine($line)
    return $true
}

$items = @(
    @('player', 'Character_Gun.gltf'),
    @('enemy_bomb', 'Bomb.gltf'),
    @('enemy_spiky', 'SpikyBall.gltf'),
    @('enemy_saw', 'Hazard_Saw.gltf'),
    @('wall1', 'wall1.glb'),
    @('wall2', 'wall2.glb'),
    @('door', 'Door.gltf'),
    @('chest', 'Chest.gltf'),
    @('bush', 'Bush.gltf'),
    @('tree', 'Tree.gltf')
)

foreach ($item in $items) {
    Encode-Gltf $item[0] $item[1]
}

[void]$jsContent.AppendLine('};')
[System.IO.File]::WriteAllText($outputJs, $jsContent.ToString())
Write-Host "Created assets.js successfully!"

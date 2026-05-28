$assetsPath = '.\assets'
$outputJs = '.\assets.js'

$jsContent = 'window.ROOFLINE_ASSETS = {' + "
"

function Encode-Gltf {
    param([string]$key, [string]$fileName)
    $fullPath = Join-Path $assetsPath $fileName
    if (-not (Test-Path $fullPath)) {
        Write-Host "Missing $fileName"
        return ""
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
    
    $newJsonStr = ConvertTo-Json -InputObject $json -Depth 10 -Compress
    $utf8Bytes = [System.Text.Encoding]::UTF8.GetBytes($newJsonStr)
    $b64 = [System.Convert]::ToBase64String($utf8Bytes)
    return "  `"$key`": `"$b64`""
}

$items = @(
    @('player', 'Character.gltf'),
    @('coffin0', 'Bomb.gltf'),
    @('coffin1', 'SpikyBall.gltf'),
    @('coffin2', 'Hazard_Saw.gltf'),
    @('coffin3', 'Spikes.gltf'),
    @('prop0', 'Bush.gltf'),
    @('prop1', 'Bush_Fruit.gltf'),
    @('prop2', 'Tree.gltf'),
    @('prop3', 'Tree_Fruit.gltf')
)

foreach ($item in $items) {
    $encoded = Encode-Gltf $item[0] $item[1]
    if ($encoded) {
        $jsContent += $encoded + ",
"
    }
}

$jsContent += '};' + "
"
[System.IO.File]::WriteAllText($outputJs, $jsContent)
Write-Host "Created assets.js successfully!"

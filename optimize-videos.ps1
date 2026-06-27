$ErrorActionPreference = "Stop"

$InputDir = Join-Path $PSScriptRoot "assets\videos"
$OutputDir = Join-Path $PSScriptRoot "assets\videos_web"
$FallbackFile = Join-Path $OutputDir "video-fallbacks.txt"
$MaxSizeBytes = 80MB
$CopyThresholdBytes = 20MB

function Format-Mb($Bytes) {
    return [math]::Round($Bytes / 1MB, 2)
}

function Test-ValidVideo($Path) {
    if (-not (Test-Path -LiteralPath $Path)) {
        return $false
    }

    & ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $Path | Out-Null
    return ($LASTEXITCODE -eq 0)
}

function Get-VideoDuration($Path) {
    $Duration = & ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $Path
    if ($LASTEXITCODE -ne 0) {
        return 0
    }
    return [double]::Parse($Duration, [Globalization.CultureInfo]::InvariantCulture)
}

function Invoke-Encode($InputPath, $OutputPath, $VideoArgs) {
    $TempOutput = "$OutputPath.tmp.mp4"

    if (Test-Path -LiteralPath $TempOutput) {
        Remove-Item -LiteralPath $TempOutput -Force
    }

    & ffmpeg -hide_banner -y -i $InputPath @VideoArgs -c:a aac -b:a 128k -movflags +faststart $TempOutput

    if ($LASTEXITCODE -ne 0) {
        if (Test-Path -LiteralPath $TempOutput) {
            Remove-Item -LiteralPath $TempOutput -Force
        }
        throw "FFmpeg a echoue pour $InputPath"
    }

    if (-not (Test-ValidVideo $TempOutput)) {
        if (Test-Path -LiteralPath $TempOutput) {
            Remove-Item -LiteralPath $TempOutput -Force
        }
        throw "La video generee est invalide pour $InputPath"
    }

    Move-Item -LiteralPath $TempOutput -Destination $OutputPath -Force
}

if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
    Write-Error "FFmpeg n'est pas installe ou n'est pas disponible dans le PATH. Installez FFmpeg avant de continuer."
}

if (-not (Get-Command ffprobe -ErrorAction SilentlyContinue)) {
    Write-Error "FFprobe n'est pas installe ou n'est pas disponible dans le PATH. Installez FFmpeg avant de continuer."
}

if (-not (Test-Path -LiteralPath $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

if (Test-Path -LiteralPath $FallbackFile) {
    Remove-Item -LiteralPath $FallbackFile -Force
}

$Scale720 = "scale='if(gt(a,16/9),min(1280,iw),-2)':'if(gt(a,16/9),-2,min(720,ih))'"
$Scale1080 = "scale='min(1920,iw)':-2"

$StandardProfiles = @(
    @{ Label = "1080p CRF 24"; Args = @("-vf", $Scale1080, "-c:v", "libx264", "-crf", "24", "-preset", "medium") },
    @{ Label = "720p CRF 24 slow"; Args = @("-vf", $Scale720, "-c:v", "libx264", "-crf", "24", "-preset", "slow") },
    @{ Label = "720p CRF 25 slow"; Args = @("-vf", $Scale720, "-c:v", "libx264", "-crf", "25", "-preset", "slow") }
)

$LargeProfiles = @(
    @{ Label = "720p CRF 24 slow"; Args = @("-vf", $Scale720, "-c:v", "libx264", "-crf", "24", "-preset", "slow") },
    @{ Label = "720p CRF 25 slow"; Args = @("-vf", $Scale720, "-c:v", "libx264", "-crf", "25", "-preset", "slow") },
    @{ Label = "720p 2500k"; Args = @("-vf", $Scale720, "-c:v", "libx264", "-b:v", "2500k", "-maxrate", "2500k", "-bufsize", "5000k", "-preset", "slow") },
    @{ Label = "720p 1800k"; Args = @("-vf", $Scale720, "-c:v", "libx264", "-b:v", "1800k", "-maxrate", "1800k", "-bufsize", "3600k", "-preset", "slow") },
    @{ Label = "720p 1200k"; Args = @("-vf", $Scale720, "-c:v", "libx264", "-b:v", "1200k", "-maxrate", "1200k", "-bufsize", "2400k", "-preset", "slow") },
    @{ Label = "720p 800k"; Args = @("-vf", $Scale720, "-c:v", "libx264", "-b:v", "800k", "-maxrate", "800k", "-bufsize", "1600k", "-preset", "slow") },
    @{ Label = "720p 550k"; Args = @("-vf", $Scale720, "-c:v", "libx264", "-b:v", "550k", "-maxrate", "550k", "-bufsize", "1100k", "-preset", "slow") }
)

$Videos = Get-ChildItem -Path (Join-Path $InputDir "*") -File -Include *.mp4,*.mov,*.avi,*.mkv

foreach ($Video in $Videos) {
    $Output = Join-Path $OutputDir ($Video.BaseName + ".mp4")
    $BeforeMb = Format-Mb $Video.Length
    $Duration = Get-VideoDuration $Video.FullName

    if ($Video.Name -eq "aecf-02.mp4" -or $Duration -gt 1800) {
        if (Test-Path -LiteralPath $Output) {
            Remove-Item -LiteralPath $Output -Force
        }
        $TempOutput = "$Output.tmp.mp4"
        if (Test-Path -LiteralPath $TempOutput) {
            Remove-Item -LiteralPath $TempOutput -Force
        }
        Add-Content -LiteralPath $FallbackFile -Value $Video.Name
        Write-Warning "$($Video.Name) est trop long pour une integration directe fluide. Fallback miniature + bouton Voir le projet."
        continue
    }

    if (Test-Path -LiteralPath $Output) {
        $Existing = Get-Item -LiteralPath $Output
        if ((Test-ValidVideo $Output) -and $Existing.Length -le $MaxSizeBytes) {
            Write-Host "SKIP $($Video.Name) deja pret : $(Format-Mb $Existing.Length) Mo"
            continue
        }

        Write-Host "REBUILD $($Existing.Name) invalide ou trop lourd ($(Format-Mb $Existing.Length) Mo)"
        Remove-Item -LiteralPath $Output -Force
    }

    if ($Video.Extension.ToLower() -eq ".mp4" -and $Video.Length -le $CopyThresholdBytes -and (Test-ValidVideo $Video.FullName)) {
        Copy-Item -LiteralPath $Video.FullName -Destination $Output
        $Copied = Get-Item -LiteralPath $Output
        Write-Host "COPY $($Video.Name) : $BeforeMb Mo -> $(Format-Mb $Copied.Length) Mo"
        continue
    }

    Write-Host "Conversion $($Video.Name) ($BeforeMb Mo)"
    $Success = $false
    $Profiles = if ($Video.Length -gt $MaxSizeBytes) { $LargeProfiles } else { $StandardProfiles }

    foreach ($Profile in $Profiles) {
        Write-Host "  Essai $($Profile.Label)"
        Invoke-Encode -InputPath $Video.FullName -OutputPath $Output -VideoArgs $Profile.Args

        $Converted = Get-Item -LiteralPath $Output
        $AfterMb = Format-Mb $Converted.Length
        Write-Host "  Resultat $($Profile.Label) : $AfterMb Mo"

        if ($Converted.Length -le $MaxSizeBytes) {
            Write-Host "OK $($Video.Name) : $BeforeMb Mo -> $AfterMb Mo"
            $Success = $true
            break
        }

        Remove-Item -LiteralPath $Output -Force
    }

    if (-not $Success) {
        Add-Content -LiteralPath $FallbackFile -Value $Video.Name
        Write-Warning "$($Video.Name) ne peut pas etre optimise sous 80 Mo avec les profils actuels. Fallback miniature + bouton Voir le projet."
    }
}

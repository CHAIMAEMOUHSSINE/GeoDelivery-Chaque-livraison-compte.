# Export en lecture seule du fichier genere, sans toucher aux presentations deja ouvertes.
$ErrorActionPreference='Stop'
$docs=Split-Path $PSScriptRoot -Parent
$output="$docs\screenshots\qa\slides"
New-Item $output -ItemType Directory -Force | Out-Null
$alreadyRunning=@(Get-Process POWERPNT -ErrorAction SilentlyContinue).Count -gt 0
$powerpoint=New-Object -ComObject PowerPoint.Application
$presentation=$null
try {
    $presentation=$powerpoint.Presentations.Open("$docs\presentation.pptx",-1,0,0)
    $presentation.Export($output,'PNG',1440,810)
    $presentation.SaveAs("$docs\presentation.pdf",32)
    Write-Output "Export termine : $($presentation.Slides.Count) diapositives et PDF."
} finally {
    if($presentation) { $presentation.Close(); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($presentation) }
    if(!$alreadyRunning) { $powerpoint.Quit() }
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($powerpoint)
}

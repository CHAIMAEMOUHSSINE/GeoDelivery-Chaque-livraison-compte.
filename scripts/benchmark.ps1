param([switch]$Setup)
. "$PSScriptRoot\env.ps1"
$connect=$env:DB_URL.Replace('jdbc:oracle:thin:@','')
$setupSql=if($Setup) { '@tests/08_benchmark_setup.sql' } else { '' }
$sql=@"
WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK
SET ECHO OFF VERIFY OFF
CONNECT $env:DB_USERNAME/"$env:DB_PASSWORD"@$connect
$setupSql
@tests/09_benchmark.sql
EXIT;
"@
Push-Location "$ProjectRoot\database"
try {
    $output=$sql | & sqlplus -L -s /nolog 2>&1
    $code=$LASTEXITCODE
    $safe=("$output").Replace($env:DB_PASSWORD,'[SECRET]')
    if($code -ne 0 -or $safe -match 'ORA-|SP2-') { throw "Benchmark interrompu : $safe" }
    New-Item "$ProjectRoot\docs\evidence" -ItemType Directory -Force | Out-Null
    $output | Set-Content "$ProjectRoot\docs\evidence\oracle-benchmark.txt" -Encoding UTF8
    Write-Output $output
} finally { Pop-Location }

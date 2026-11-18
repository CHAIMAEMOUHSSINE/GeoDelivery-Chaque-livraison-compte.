. "$PSScriptRoot\env.ps1"
if($env:DB_URL -notmatch '^jdbc:oracle:thin:@(//[A-Za-z0-9.:-]+/[A-Za-z0-9_]+)$') { throw 'URL JDBC non prise en charge par ce script SQLPlus' }
$connect=$matches[1]
$sql=@"
WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK
SET ECHO OFF VERIFY OFF
CONNECT $env:DB_USERNAME/"$env:DB_PASSWORD"@$connect
@install.sql
@tests/06_acceptance.sql
EXIT;
"@
Push-Location "$ProjectRoot\database"
try {
    $output=$sql | & sqlplus -L -s /nolog 2>&1
    $code=$LASTEXITCODE
    $safe=("$output").Replace($env:DB_PASSWORD,'[SECRET]')
    if($code -ne 0 -or $safe -match 'ORA-|SP2-') { throw "Installation interrompue (ne pas relancer sur un schema partiel) : $safe" }
    Write-Output $output
} finally { Pop-Location }

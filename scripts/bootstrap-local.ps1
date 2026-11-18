param([string]$Sid='ORCL', [string]$Pdb='ORCLPDB')
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
if(Test-Path "$root\.env") { throw '.env existe deja. Aucune modification effectuee.' }
if($Sid -notmatch '^[A-Za-z0-9_]+$' -or $Pdb -notmatch '^[A-Za-z0-9_]+$') { throw 'SID/PDB invalide' }
$env:ORACLE_SID=$Sid
function Random-Hex([int]$count) {
    $bytes=New-Object byte[] $count
    $rng=[System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes); $rng.Dispose()
    return ([BitConverter]::ToString($bytes)).Replace('-','')
}
$password='Gd'+(Random-Hex 12)
$jwt=Random-Hex 32
$admin='Gd!'+(Random-Hex 10)
$sql=@"
WHENEVER SQLERROR EXIT SQL.SQLCODE
SET ECHO OFF VERIFY OFF
ALTER SESSION SET CONTAINER=$Pdb;
CREATE USER GEODELIVERY IDENTIFIED BY "$password" DEFAULT TABLESPACE USERS QUOTA 200M ON USERS;
GRANT CREATE SESSION, CREATE TABLE, CREATE SEQUENCE, CREATE PROCEDURE, CREATE TRIGGER TO GEODELIVERY;
GRANT INHERIT PRIVILEGES ON USER GEODELIVERY TO MDSYS;
EXIT;
"@
$result=$sql | & sqlplus -L -s '/ as sysdba' 2>&1
if($LASTEXITCODE -ne 0 -or ($result -match 'ORA-|SP2-')) {
    $safe=("$result").Replace($password,'[SECRET]')
    throw "Creation refusee (schema existant ou droits manquants). Aucun schema supprime. $safe"
}
# Les secrets ne sont ecrits qu'apres une creation reussie et ne sont jamais affiches.
@"
DB_URL=jdbc:oracle:thin:@//localhost:1521/$Pdb
DB_USERNAME=GEODELIVERY
DB_PASSWORD=$password
JWT_SECRET=$jwt
BOOTSTRAP_ADMIN_EMAIL=admin@geodelivery.local
BOOTSTRAP_ADMIN_PASSWORD=$admin
"@ | Set-Content "$root\.env" -Encoding ASCII
& "$PSScriptRoot\install-db.ps1"
Write-Host 'Schema GEODELIVERY cree et teste. Secrets locaux dans .env (ignore par Git).'

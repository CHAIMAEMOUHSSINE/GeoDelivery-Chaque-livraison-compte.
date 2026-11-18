. "$PSScriptRoot\env.ps1"
$maven=Get-Command mvn.cmd -ErrorAction SilentlyContinue
if($maven) { & $maven.Source -f "$ProjectRoot\backend\pom.xml" spring-boot:run }
else {
    & "$ProjectRoot\backend\mvnw.cmd" -f "$ProjectRoot\backend\pom.xml" spring-boot:run
}

param(
  [string]$BinDirectory = 'work/tools/postgresql-17.11/pgsql/bin',
  [ValidateRange(1024,65535)][int]$Port = 55432
)
$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$databaseRoot = [System.IO.Path]::GetFullPath((Join-Path $projectRoot 'work/database'))
$binaryRoot = [System.IO.Path]::GetFullPath((Join-Path $projectRoot $BinDirectory))
if (-not $databaseRoot.StartsWith($projectRoot + [System.IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) { throw 'Invalid local database path' }
if (-not (Test-Path -LiteralPath (Join-Path $binaryRoot 'pg_ctl.exe'))) { throw 'Set BinDirectory to an existing official PostgreSQL bin folder' }
New-Item -ItemType Directory -Force $databaseRoot | Out-Null
$clusterPath = Join-Path $databaseRoot 'cluster'
$environmentPath = Join-Path $databaseRoot '.env'
if (-not (Test-Path -LiteralPath (Join-Path $clusterPath 'PG_VERSION'))) {
  if (Test-Path -LiteralPath $environmentPath) { throw 'Refusing to overwrite an existing database environment without its cluster' }
  $testPassword = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(24)).ToLowerInvariant()
  $passwordPath = Join-Path $databaseRoot 'init-password.tmp'
  [IO.File]::WriteAllText($passwordPath,$testPassword)
  try {
    & (Join-Path $binaryRoot 'initdb.exe') -D $clusterPath -U chakra_test_admin --auth=scram-sha-256 --encoding=UTF8 --locale=C "--pwfile=$passwordPath" | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL initialization failed' }
  } finally { Remove-Item -LiteralPath $passwordPath -Force }
  $connection = "postgresql://chakra_test_admin:${testPassword}@127.0.0.1:${Port}/postgres"
  [IO.File]::WriteAllText($environmentPath,"TEST_DATABASE_URL=$connection`n")
}
& (Join-Path $binaryRoot 'pg_ctl.exe') status -D $clusterPath | Out-Null
if ($LASTEXITCODE -ne 0) {
  $logPath = Join-Path $databaseRoot 'postgres.log'
  $startup = Start-Process -FilePath (Join-Path $binaryRoot 'pg_ctl.exe') -WindowStyle Hidden -Wait -PassThru -ArgumentList @('-D',"`"$clusterPath`"",'-l',"`"$logPath`"",'-o',"`"-h 127.0.0.1 -p $Port`"",'-w','start') -RedirectStandardOutput (Join-Path $databaseRoot 'startup.log') -RedirectStandardError (Join-Path $databaseRoot 'startup-error.log')
  if ($startup.ExitCode -ne 0) { throw 'Local PostgreSQL did not start; inspect the ignored database log' }
}
Write-Output "Local PostgreSQL is ready on 127.0.0.1:$Port. Credentials remain in ignored work/database/.env."

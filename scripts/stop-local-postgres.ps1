param([string]$BinDirectory = 'work/tools/postgresql-17.11/pgsql/bin')
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$clusterPath = [IO.Path]::GetFullPath((Join-Path $projectRoot 'work/database/cluster'))
if (-not $clusterPath.StartsWith($projectRoot + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) { throw 'Invalid local cluster target' }
$pgControl = Join-Path (Join-Path $projectRoot $BinDirectory) 'pg_ctl.exe'
& $pgControl -D $clusterPath -m fast -w stop
if ($LASTEXITCODE -ne 0) { throw 'Local PostgreSQL stop failed' }

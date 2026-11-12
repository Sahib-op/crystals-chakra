#Requires -Version 7.4
param([string]$BinDirectory = 'work/tools/postgresql-17.11/pgsql/bin')

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$node = (Get-Command node.exe).Source
$frontend = 'http://localhost:5175'
$api = 'http://127.0.0.1:3001'
$auth = 'http://127.0.0.1:54321'
$logs = Join-Path $projectRoot 'work/local-dev'
$started = [Collections.Generic.List[Diagnostics.Process]]::new()

function Get-LocalDatabaseUrl($File, $Key, $ExpectedUser, $ExpectedDatabase) {
  $path = Join-Path $projectRoot $File
  $entries = @(Get-Content -LiteralPath $path | Where-Object { $_.StartsWith("$Key=") })
  [uri]$parsed = $null
  if ($entries.Count -ne 1 -or
      -not [uri]::TryCreate($entries[0].Substring($Key.Length + 1), [UriKind]::Absolute, [ref]$parsed) -or
      $parsed.Scheme -ne 'postgresql' -or $parsed.Host -ne '127.0.0.1' -or $parsed.Port -ne 55432 -or
      $parsed.AbsolutePath -cne "/$ExpectedDatabase" -or $parsed.Query -or $parsed.Fragment -or
      ($parsed.UserInfo -split ':', 2)[0] -cnotmatch $ExpectedUser) {
    throw "Expected the isolated local database in $File."
  }
  return $parsed.AbsoluteUri
}

function Start-LocalNode($Name, $Arguments, $Environment) {
  $options = @{
    FilePath = $node
    ArgumentList = $Arguments
    WorkingDirectory = $projectRoot
    Environment = $Environment
    WindowStyle = 'Hidden'
    PassThru = $true
    RedirectStandardOutput = Join-Path $logs "$Name.log"
    RedirectStandardError = Join-Path $logs "$Name-error.log"
  }
  $process = Start-Process @options
  $started.Add($process)
  return $process
}

function Test-LocalService($Check) {
  try { return [bool](& $Check) } catch { return $false }
}

function Start-LocalService($Name, $Port, $Arguments, $Environment, $Check) {
  if (Test-LocalService $Check) {
    Write-Output "$Name is already ready."
    return
  }
  if (Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue) {
    throw "Port $Port is occupied by a listener that did not pass the $Name check. Inspect it before restarting the preview."
  }
  $process = Start-LocalNode $Name $Arguments $Environment
  $deadline = [DateTime]::UtcNow.AddSeconds(30)
  while (-not $process.HasExited -and [DateTime]::UtcNow -lt $deadline) {
    if (Test-LocalService $Check) {
      Write-Output "$Name is ready."
      return
    }
    Start-Sleep -Milliseconds 250
  }
  throw "$Name did not become ready. See work/local-dev/$Name-error.log and $Name.log."
}

function Get-LocalResponse($Url) {
  Invoke-RestMethod -Uri $Url -NoProxy -TimeoutSec 2 -MaximumRedirection 0
}

if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'node_modules/vite/bin/vite.js'))) {
  throw 'Install project dependencies with npm ci before starting the local preview.'
}
New-Item -ItemType Directory -Force -Path $logs | Out-Null

try {
  & (Join-Path $PSScriptRoot 'start-local-postgres.ps1') -BinDirectory $BinDirectory
  $controller = Get-LocalDatabaseUrl 'work/database/.env' 'TEST_DATABASE_URL' '^chakra_test_admin$' 'postgres'
  $setup = Start-LocalNode 'database-setup' @('scripts/provision-local-db.ts') @{
    NODE_ENV = 'development'; TEST_DATABASE_URL = $controller
  }
  if (-not $setup.WaitForExit(45000) -or $setup.ExitCode -ne 0) {
    throw 'Local database setup failed. See work/local-dev/database-setup-error.log.'
  }
  $runtime = Get-LocalDatabaseUrl 'work/database/api.env' 'DATABASE_URL' '^chakra_dev_api_[0-9a-f]{10}$' 'chakra_development'
  Start-LocalService 'auth' 54321 @('scripts/fixtures/studio-auth.ts') @{
    NODE_ENV = 'development'; TEST_DATABASE_URL = $controller
  } {
    (Get-LocalResponse "$auth/auth/v1/.well-known/jwks.json").keys.kid -eq 'local-studio-fixture'
  }
  Start-LocalService 'api' 3001 @('server/index.js') @{
    NODE_ENV = 'development'; HOST = '127.0.0.1'; PORT = '3001'; FRONTEND_URL = $frontend
    DATABASE_URL = $runtime; DATABASE_POOL_MAX = '4'
    SUPABASE_URL = $auth; SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_local_fixture_key'; STUDIO_DEMO_MODE = 'true'
    SHOPIFY_STORE_DOMAIN = $null; SHOPIFY_STOREFRONT_TOKEN = $null; SHOPIFY_CHECKOUT_HOST = $null
  } {
    $studio = Get-LocalResponse "$api/api/studio-config"
    if (-not ($studio.configured -and $studio.localDemo -and $studio.authUrl -eq $auth)) { return $false }
    $null = Get-LocalResponse "$api/api/services"
    return $true
  }
  Start-LocalService 'frontend' 5175 @('node_modules/vite/bin/vite.js', '--host', 'localhost', '--port', '5175', '--strictPort') @{
    NODE_ENV = 'development'; VITE_API_URL = ''
  } {
    $homepage = Get-LocalResponse "$frontend/"
    $studio = Get-LocalResponse "$frontend/api/studio-config"
    return $homepage -match '<title>Crystals Chakra' -and $studio.configured -and $studio.localDemo -and $studio.authUrl -eq $auth
  }
  Write-Output "Website: $frontend/    Studio: $frontend/studio"
} catch {
  foreach ($process in $started) {
    if (-not $process.HasExited) { Stop-Process -InputObject $process -ErrorAction SilentlyContinue }
  }
  throw
}

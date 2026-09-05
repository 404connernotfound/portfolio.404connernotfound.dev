[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-PortfolioUpLog {
	param(
		[Parameter(Mandatory = $true)]
		[string] $Message
	)

	Write-Host "[portfolio-up] $Message"
}

function Stop-PortfolioUp {
	param(
		[Parameter(Mandatory = $true)]
		[string] $Message
	)

	[Console]::Error.WriteLine("[portfolio-up] error: $Message")
	exit 1
}

$repoDir = if ([string]::IsNullOrWhiteSpace($env:REPO_DIR)) {
	$PSScriptRoot
} else {
	[System.IO.Path]::GetFullPath($env:REPO_DIR)
}
$composeFile = if ([string]::IsNullOrWhiteSpace($env:COMPOSE_FILE)) {
	Join-Path $repoDir 'docker-compose.yml'
} else {
	[System.IO.Path]::GetFullPath($env:COMPOSE_FILE)
}
$envFile = if ([string]::IsNullOrWhiteSpace($env:ENV_FILE)) {
	Join-Path $repoDir 'deploy/portfolio.env'
} else {
	[System.IO.Path]::GetFullPath($env:ENV_FILE)
}
$envExample = if ([string]::IsNullOrWhiteSpace($env:ENV_EXAMPLE)) {
	Join-Path $repoDir 'deploy/portfolio.env.example'
} else {
	[System.IO.Path]::GetFullPath($env:ENV_EXAMPLE)
}
$composeProjectName = if ([string]::IsNullOrWhiteSpace($env:COMPOSE_PROJECT_NAME)) {
	'portfolio'
} else {
	$env:COMPOSE_PROJECT_NAME
}
$dryRun = $env:DRY_RUN -eq '1'

$docker = @(Get-Command 'docker.exe' -CommandType Application -All -ErrorAction SilentlyContinue) | Select-Object -First 1
$dockerCompose = @(Get-Command 'docker-compose.exe' -CommandType Application -All -ErrorAction SilentlyContinue) | Select-Object -First 1
if ($null -ne $docker) {
	$composeExecutable = $docker.Source
	$composePrefixArguments = @('compose')
} elseif ($null -ne $dockerCompose) {
	$composeExecutable = $dockerCompose.Source
	$composePrefixArguments = @()
} else {
	Stop-PortfolioUp 'docker compose or docker-compose is required'
}

if (-not (Test-Path -LiteralPath $composeFile -PathType Leaf)) {
	Stop-PortfolioUp "missing compose file: $composeFile"
}

if (-not (Test-Path -LiteralPath $envFile -PathType Leaf)) {
	if (-not (Test-Path -LiteralPath $envExample -PathType Leaf)) {
		Stop-PortfolioUp "missing env file: $envFile"
	}

	if ($dryRun) {
		$composeEnvFile = $envExample
		Write-PortfolioUpLog "missing $envFile; using $envExample for compose variables"
	} else {
		Copy-Item -LiteralPath $envExample -Destination $envFile
		[Console]::Error.WriteLine(@"
Created $envFile.

Edit it first, especially:
  POSTGRES_PASSWORD
  DATABASE_URL
  ADMIN_SESSION_SECRET
  ADMIN_EMAIL
  ADMIN_PASSWORD
  ORIGIN

Then rerun:
  npm run up:windows
"@)
		exit 1
	}
} else {
	$composeEnvFile = $envFile
}

$composeArguments = @(
	'--project-name', $composeProjectName,
	'--env-file', $composeEnvFile,
	'-f', $composeFile
)

function Invoke-PortfolioCompose {
	param(
		[Parameter(Mandatory = $true)]
		[string[]] $CommandArguments
	)

	& $composeExecutable @composePrefixArguments @composeArguments @CommandArguments
	if ($LASTEXITCODE -ne 0) {
		Stop-PortfolioUp "docker compose failed with exit code $LASTEXITCODE"
	}
}

Push-Location $repoDir
try {
	$env:PORTFOLIO_ENV_FILE = $composeEnvFile

	if ($dryRun) {
		Invoke-PortfolioCompose -CommandArguments @('config')
		exit 0
	}

	Write-PortfolioUpLog 'removing old one-shot seed containers'
	$previousErrorActionPreference = $ErrorActionPreference
	try {
		$ErrorActionPreference = 'Continue'
		& $composeExecutable @composePrefixArguments @composeArguments 'rm' '-sf' 'static-seed' 'migrate' 1>$null 2>$null
	} finally {
		$ErrorActionPreference = $previousErrorActionPreference
	}

	Write-PortfolioUpLog 'building and starting Docker Compose stack'
	Invoke-PortfolioCompose -CommandArguments @('up', '-d', '--build', '--wait')
	Invoke-PortfolioCompose -CommandArguments @('ps')

	$hostAppPort = '3000'
	foreach ($line in Get-Content -LiteralPath $composeEnvFile) {
		if ($line -match '^HOST_APP_PORT=(.*)$' -and -not [string]::IsNullOrWhiteSpace($Matches[1])) {
			$hostAppPort = $Matches[1].Trim()
		}
	}

	$healthUrl = "http://127.0.0.1:$hostAppPort/healthz"
	Invoke-WebRequest -Uri $healthUrl -Method Get -UseBasicParsing | Out-Null
	Write-PortfolioUpLog "health check passed at $healthUrl"

	$resumeUrl = "http://127.0.0.1:$hostAppPort/uploads/resume/resume.pdf"
	Invoke-WebRequest -Uri $resumeUrl -Method Head -UseBasicParsing | Out-Null
	Write-PortfolioUpLog 'resume PDF check passed'
} catch {
	Stop-PortfolioUp $_.Exception.Message
} finally {
	Pop-Location
}

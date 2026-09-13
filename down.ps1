[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-PortfolioDownLog {
	param(
		[Parameter(Mandatory = $true)]
		[string] $Message
	)

	Write-Host "[portfolio-down] $Message"
}

function Stop-PortfolioDown {
	param(
		[Parameter(Mandatory = $true)]
		[string] $Message
	)

	[Console]::Error.WriteLine("[portfolio-down] error: $Message")
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
$composeTimeout = if ([string]::IsNullOrWhiteSpace($env:COMPOSE_TIMEOUT)) {
	'30'
} else {
	$env:COMPOSE_TIMEOUT
}
$removeVolumes = $env:REMOVE_VOLUMES -eq '1'
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
	Stop-PortfolioDown 'docker compose or docker-compose is required'
}

if (-not (Test-Path -LiteralPath $composeFile -PathType Leaf)) {
	Stop-PortfolioDown "missing compose file: $composeFile"
}

if (Test-Path -LiteralPath $envFile -PathType Leaf) {
	$composeEnvFile = $envFile
} elseif (Test-Path -LiteralPath $envExample -PathType Leaf) {
	$composeEnvFile = $envExample
	Write-PortfolioDownLog "missing $envFile; using $envExample for compose variables"
} else {
	Stop-PortfolioDown "missing env file: $envFile"
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
		Stop-PortfolioDown "docker compose failed with exit code $LASTEXITCODE"
	}
}

Push-Location $repoDir
try {
	$env:PORTFOLIO_ENV_FILE = $composeEnvFile

	if ($dryRun) {
		Invoke-PortfolioCompose -CommandArguments @('config')
		exit 0
	}

	$downArguments = @('down', '--remove-orphans', '--timeout', $composeTimeout)
	if ($removeVolumes) {
		$downArguments += '--volumes'
	}

	Write-PortfolioDownLog 'stopping Docker Compose stack'
	Invoke-PortfolioCompose -CommandArguments $downArguments
	Write-PortfolioDownLog 'stack stopped'
} catch {
	Stop-PortfolioDown $_.Exception.Message
} finally {
	Pop-Location
}

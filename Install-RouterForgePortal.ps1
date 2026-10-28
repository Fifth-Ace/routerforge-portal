#Requires -Version 5.1
<#
RouterForge Portal: verified public GitHub release installer for unpacked Chrome / Edge.
Does NOT change browser policies, registry, profiles or router configuration.
Trust model: HTTPS + exact GitHub repository + GitHub Actions Sigstore attestation
verified using gh attestation verify with exact signer and tag + SHA256.
Offline installs require user-pinned SHA256 and are explicitly not provenance-verified.
#>
[CmdletBinding()]
param(
  [string]$InstallPath = '',
  [string]$OfflineZip = '',
  [string]$ExpectedSHA256 = '',
  [switch]$ChooseExisting
)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'Continue'
$Repo = 'Fifth-Ace/routerforge-portal'
$Signer = 'Fifth-Ace/routerforge-portal/.github/workflows/release.yml'
$Api = 'https://api.github.com/repos/Fifth-Ace/routerforge-portal/releases/latest'
$Temp = $null
$Staged = $null
$Backup = $null
$Committed = $false
$OldMoved = $false
function Stage([string]$Name) { Write-Host ('=== ' + $Name + ' ===') -ForegroundColor Cyan }
function Gate([bool]$Ok,[string]$ErrorCode) { if (-not $Ok) { throw $ErrorCode } }
function ReadManifest([string]$Folder) {
  $File = Join-Path $Folder 'manifest.json'
  Gate (Test-Path -LiteralPath $File -PathType Leaf) 'MANIFEST_NOT_FOUND'
  return (Get-Content -LiteralPath $File -Raw -Encoding UTF8 | ConvertFrom-Json)
}
function VParts([string]$V) {
  Gate ($V -match '^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:\.(0|[1-9][0-9]*))?$') 'INVALID_VERSION'
  $parts = @($Matches[1],$Matches[2],$Matches[3],$Matches[4]);
  return ,(@($parts | ForEach-Object { if ($_){ [int]$_ } else { 0 } }))
}
function CompareVersions([string]$A,[string]$B) {
  $pa = VParts $A; $pb = VParts $B
  for($i=0;$i -lt 4;$i++) { if($pa[$i] -gt $pb[$i]){return 1};if($pa[$i] -lt $pb[$i]){return -1} }
  return 0
}
function VerifyArchive([string]$Zip,[string]$Output) {
  Add-Type -AssemblyName System.IO.Compression
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $archive=[System.IO.Compression.ZipFile]::OpenRead($Zip)
  $seen=New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)
  $files=New-Object System.Collections.ArrayList
  $sum=[long]0
  try {
    Gate ($archive.Entries.Count -gt 8 -and $archive.Entries.Count -le 100) 'ZIP_ENTRY_COUNT'
    foreach($entry in $archive.Entries) {
      $name=[string]$entry.FullName
      Gate ($name.Length -gt 0 -and $name.Length -le 180) 'ZIP_INVALID_NAME'
      Gate ($name -notmatch '(?i)(^|/)(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|/|$)') 'ZIP_WINDOWS_RESERVED_NAME'
      Gate (-not $name.Contains('\') -and -not $name.StartsWith('/') -and -not $name.Contains('../') -and -not $name.Contains('/./') -and -not $name.Contains(':')) 'ZIP_UNSAFE_PATH'
      Gate (-not ($name -match '(?i)(^|/)\.\.?(/|$)')) 'ZIP_PATH_TRAVERSAL'
      $mode=($entry.ExternalAttributes -shr 16) -band 61440
      Gate ($mode -ne 40960) 'ZIP_SYMLINK_REJECTED'
      if($name.EndsWith('/')) { continue }
      Gate ($seen.Add($name)) 'ZIP_DUPLICATE_ENTRY'
      Gate ($name -cmatch '^(manifest\.json|background\.js|popup\.(html|js)|options\.(html|js)|ui\.css|_locales/[a-z]{2}/messages\.json|shared/[a-z0-9_-]+\.js|content/[a-z0-9_-]+\.(js|css)|assets/[a-z0-9_.-]+\.(png|svg|ico))$') 'ZIP_UNEXPECTED_FILE'
      Gate ($entry.Length -ge 1 -and $entry.Length -le 2097152) 'ZIP_FILE_SIZE'
      Gate ($entry.CompressedLength -le 2097152) 'ZIP_COMPRESSED_FILE_SIZE'
      $sum += $entry.Length
      Gate ($sum -le 8388608) 'ZIP_EXPANDED_SIZE'
      [void]$files.Add($name)
    }
  } finally { $archive.Dispose() }
  foreach($required in @('manifest.json','background.js','popup.html','popup.js','options.html','options.js','ui.css','content/bridge.js','content/bridge.css','shared/model.js','assets/icon-128.png')) {
    Gate ($seen.Contains($required)) ('ZIP_MISSING_' + $required)
  }
  [System.IO.Compression.ZipFile]::ExtractToDirectory($Zip,$Output)
  return $files.ToArray()
}
function IsReparse([string]$Path) {
  $obj=Get-Item -LiteralPath $Path -Force
  return (($obj.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0)
}
try {
  Stage 'PRECHECK'
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  if ($ChooseExisting) {
    Add-Type -AssemblyName System.Windows.Forms
    $dialog=New-Object System.Windows.Forms.FolderBrowserDialog
    $dialog.Description='Выбери существующую папку RouterForge Portal (с manifest.json)'
    $dialog.ShowNewFolderButton=$false
    Gate ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) 'TARGET_FOLDER_NOT_CHOSEN'
    $InstallPath=$dialog.SelectedPath
    Gate (Test-Path -LiteralPath (Join-Path $InstallPath 'manifest.json') -PathType Leaf) 'TARGET_MANIFEST_MISSING'
  }
  if (-not $InstallPath) { $InstallPath = Join-Path $env:LOCALAPPDATA 'RouterForgePortal\Extension' }
  $InstallPath=[System.IO.Path]::GetFullPath($InstallPath).TrimEnd([char[]]@('\','/'))
  $parent=Split-Path -Parent $InstallPath
  $rootPath=[System.IO.Path]::GetPathRoot($InstallPath).TrimEnd([char[]]@('\','/'))
  Gate ($InstallPath -ne $rootPath) 'SYSTEM_ROOT_TARGET'
  Gate ($InstallPath -ne [Environment]::GetFolderPath('UserProfile')) 'USERPROFILE_ROOT_TARGET'
  if (-not (Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
  # Reject all reparse points along the ancestry, not just the immediate parent.
  $walk = $parent
  while ($walk) {
    if (Test-Path -LiteralPath $walk) { Gate (-not (IsReparse $walk)) 'TARGET_ANCESTOR_IS_REPARSE_POINT' }
    $up = Split-Path -Parent $walk
    if (-not $up -or $up -eq $walk) { break }
    $walk = $up
  }
  $exists = Test-Path -LiteralPath $InstallPath
  $installedVersion=''
  if($exists) {
    Gate (-not (IsReparse $InstallPath)) 'TARGET_IS_REPARSE_POINT'
    $previous=ReadManifest $InstallPath
    Gate (@('RouterForge Portal','Keenetic WebUI Bridge') -contains [string]$previous.name) 'TARGET_NOT_ROUTERFORGE_PORTAL'
    $installedVersion=[string]$previous.version
    $null=VParts $installedVersion
  }
  if($OfflineZip) {
    Gate (Test-Path -LiteralPath $OfflineZip -PathType Leaf) 'OFFLINE_ZIP_MISSING'
    Gate ($ExpectedSHA256 -match '^[a-fA-F0-9]{64}$') 'OFFLINE_SHA256_REQUIRED'
    $sourceZip=[System.IO.Path]::GetFullPath($OfflineZip)
    $trustedHash=$ExpectedSHA256.ToLowerInvariant()
    Write-Host 'SOURCE: LOCAL_ZIP_WITH_EXPLICIT_PINNED_HASH'
  } else {
    Gate (-not $ExpectedSHA256) 'HASH_ONLY_WITH_OFFLINE_ZIP'
    Write-Host ('SOURCE: ' + $Api)
    $headers=@{ 'Accept'='application/vnd.github+json';'X-GitHub-Api-Version'='2022-11-28';'User-Agent'='RouterForgePortal-PS51-Installer' }
    $release=Invoke-RestMethod -Uri $Api -Method Get -Headers $headers -TimeoutSec 20
    Gate ($release -and -not $release.draft -and -not $release.prerelease) 'RELEASE_NOT_STABLE'
    Gate ($release.immutable -eq $true) 'RELEASE_NOT_IMMUTABLE'
    $tag=[string]$release.tag_name
    Gate ($tag -cmatch '^v[0-9]+\.[0-9]+\.[0-9]+(?:\.[0-9]+)?$') 'RELEASE_TAG_INVALID'
    $remoteVersion=$tag.Substring(1)
    $releaseUrl='https://github.com/' + $Repo + '/releases/tag/' + $tag
    Gate ([string]$release.html_url -ceq $releaseUrl) 'RELEASE_PAGE_MISMATCH'
    $name='routerforge-portal-chromium-' + $tag + '.zip'
    $assets=@($release.assets | Where-Object { [string]$_.name -ceq $name })
    Gate ($assets.Count -eq 1) 'EXACT_INSTALL_ASSET_MISSING'
    $asset=$assets[0]
    Gate ([long]$asset.size -ge 1000 -and [long]$asset.size -le 8388608) 'ASSET_SIZE_INVALID'
    Gate ([string]$asset.digest -match '^sha256:([a-fA-F0-9]{64})$') 'RELEASE_DIGEST_MISSING'
    $trustedHash=$Matches[1].ToLowerInvariant()
    $assetUrl='https://github.com/' + $Repo + '/releases/download/' + $tag + '/' + $name
    Gate ([string]$asset.browser_download_url -ceq $assetUrl) 'ASSET_URL_MISMATCH'
    $Temp=Join-Path $env:TEMP ('RFPortalUpdate-' + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $Temp | Out-Null
    $sourceZip=Join-Path $Temp $name
    Stage 'DOWNLOAD'
    Invoke-WebRequest -Uri $assetUrl -OutFile $sourceZip -UseBasicParsing -TimeoutSec 120 -MaximumRedirection 5 -Headers @{ 'User-Agent'='RouterForgePortal-PS51-Installer' }
    Gate ((Get-Item -LiteralPath $sourceZip).Length -eq [long]$asset.size) 'DOWNLOADED_SIZE_MISMATCH'
  }
  Stage 'GATES'
  $actual=(Get-FileHash -LiteralPath $sourceZip -Algorithm SHA256).Hash.ToLowerInvariant()
  Gate ($actual -ceq $trustedHash) 'SHA256_MISMATCH_NO_FILES_TOUCHED'
  Write-Host ('ARCHIVE_SHA256: PASS ' + $actual)
  if (-not $OfflineZip) {
    Stage 'CRYPTOGRAPHIC_PROVENANCE'
    Gate ([bool](Get-Command gh -ErrorAction SilentlyContinue)) 'GITHUB_CLI_REQUIRED_FOR_SIGNED_UPDATE'
    # Validate the cryptographic signature, repository, signer workflow and exact tag.
    # Redirect errors through the host without leaking local auth state.
    & gh attestation verify $sourceZip -R $Repo --signer-workflow $Signer --source-ref ('refs/tags/' + $tag)
    Gate ($LASTEXITCODE -eq 0) 'ATTESTATION_VERIFICATION_FAILED'
    Write-Host 'ATTESTATION_EXACT_SIGNER_AND_TAG: PASS' -ForegroundColor Green
    # Immutable releases provide an independent signed release-asset assertion.
    & gh release verify $tag -R $Repo
    Gate ($LASTEXITCODE -eq 0) 'RELEASE_IMMUTABILITY_OR_SIGNATURE_NOT_VERIFIED'
    Write-Host 'IMMUTABLE_RELEASE_SIGNATURE: PASS' -ForegroundColor Green
  } else {
    Write-Host 'OFFLINE_PROVENANCE: NOT_VERIFIED (pinned SHA256 only)' -ForegroundColor Yellow
  }
  $Staged=Join-Path $parent ('.rfportal-stage-' + [guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Path $Staged | Out-Null
  $names=@(VerifyArchive $sourceZip $Staged)
  $trustedFiles=@{}
  foreach($name in $names) {
    $trustedFiles[$name]=(Get-FileHash -LiteralPath (Join-Path $Staged $name) -Algorithm SHA256).Hash
  }
  $manifest=ReadManifest $Staged
  Gate ($manifest.name -ceq 'RouterForge Portal') 'PACKAGE_NAME_MISMATCH'
  Gate ([int]$manifest.manifest_version -eq 3) 'PACKAGE_NOT_MV3'
  $newVersion=[string]$manifest.version
  $null=VParts $newVersion
  Gate ($manifest.permissions.Count -le 8) 'EXCESSIVE_PERMISSIONS'
  foreach($permission in @($manifest.permissions)) { Gate (@('storage','scripting','activeTab') -contains [string]$permission) 'UNEXPECTED_PERMISSION' }
  foreach($hostPattern in @($manifest.host_permissions | Where-Object { $_ })){Gate (@('https://api.github.com/*') -contains [string]$hostPattern) 'UNEXPECTED_HOST_PERMISSION'}
  foreach($hostPattern in @($manifest.optional_host_permissions | Where-Object { $_ })){Gate (@('http://*/*','https://*/*') -contains [string]$hostPattern) 'UNEXPECTED_OPTIONAL_PERMISSION'}
  Gate (-not $manifest.externally_connectable -and -not $manifest.content_security_policy) 'UNEXPECTED_MANIFEST_EXECUTION_POLICY'
  if($OfflineZip) { Write-Host ('OFFLINE_MANIFEST_VERSION: ' + $newVersion) }
  else { Gate ($newVersion -ceq $remoteVersion) 'RELEASE_MANIFEST_VERSION_MISMATCH' }
  if($installedVersion) {
    $comp=CompareVersions $newVersion $installedVersion
    Gate ($comp -ge 0) 'DOWNGRADE_FORBIDDEN'
    if($comp -eq 0){
      Stage 'RESULT'
      Write-Host ('STATE: PASS_ALREADY_CURRENT v' + $installedVersion) -ForegroundColor Green
      Write-Host 'NO_FILES_CHANGED: YES'
      exit 0
    }
  }
  Write-Host ('NEW_VERSION: ' + $newVersion)
  Write-Host ('OLD_VERSION: ' + $(if($installedVersion){$installedVersion}else{'none'}))
  Write-Host ('TARGET: ' + $InstallPath)
  Write-Host 'ROUTER_FIRMWARE: UNTOUCHED'
  Write-Host 'BROWSER_PROFILES: UNTOUCHED'
  Stage 'ACTION'
  if($exists) {
    $Backup=$InstallPath + '.backup-' + (Get-Date -Format 'yyyyMMdd-HHmmss')
    Gate (-not (Test-Path -LiteralPath $Backup)) 'BACKUP_ALREADY_EXISTS'
    Move-Item -LiteralPath $InstallPath -Destination $Backup
    $OldMoved=$true
    Write-Host ('BACKUP: ' + $Backup)
  }
  Move-Item -LiteralPath $Staged -Destination $InstallPath
  $Staged=$null
  $Committed=$true
  Stage 'VERIFY'
  $post=ReadManifest $InstallPath
  Gate ([string]$post.version -ceq $newVersion) 'INSTALLED_VERSION_MISMATCH'
  foreach($name in $names){
    $check=Join-Path $InstallPath $name
    Gate (Test-Path -LiteralPath $check -PathType Leaf) ('MISSING_AFTER_INSTALL_' + $name)
    Gate ((Get-FileHash -LiteralPath $check -Algorithm SHA256).Hash -eq $trustedFiles[$name]) ('INSTALLED_FILE_HASH_MISMATCH_' + $name)
  }
  Write-Host ('STATE: PASS_FILES_UPDATED v' + $newVersion) -ForegroundColor Green
  Write-Host ('VERIFIED_FILES: ' + $names.Count)
  Write-Host 'BROWSER_RELOAD_REQUIRED: YES'
  Write-Host 'Chrome: chrome://extensions  -> Reload RouterForge Portal'
  Write-Host 'Edge:   edge://extensions    -> Reload RouterForge Portal'
  if(-not $exists) { Write-Host ('FIRST_INSTALL: Load unpacked extension from ' + $InstallPath) }
  Write-Host 'NEXT: Refresh Keenetic tab with Ctrl+F5'
} catch {
  Stage 'RESULT'
  Write-Host ('STATE: FAIL - ' + $_.Exception.Message) -ForegroundColor Red
  if($Committed -and -not $OldMoved -and (Test-Path -LiteralPath $InstallPath)){
    try { Remove-Item -LiteralPath $InstallPath -Recurse -Force; Write-Host 'ROLLBACK_NEW_INSTALL: PASS' } catch { Write-Host 'ROLLBACK_NEW_INSTALL: FAIL' -ForegroundColor Red }
  }
  if($OldMoved -and $Backup -and (Test-Path -LiteralPath $Backup)){
    try {
      if(Test-Path -LiteralPath $InstallPath) { Remove-Item -LiteralPath $InstallPath -Recurse -Force }
      Move-Item -LiteralPath $Backup -Destination $InstallPath
      Write-Host 'ROLLBACK: PASS' -ForegroundColor Yellow
    } catch { Write-Host ('ROLLBACK: FAIL ' + $_.Exception.Message) -ForegroundColor Red }
  }
  exit 1
} finally {
  if($Staged -and (Test-Path -LiteralPath $Staged)) { Remove-Item -LiteralPath $Staged -Recurse -Force -ErrorAction SilentlyContinue }
  if($Temp -and (Test-Path -LiteralPath $Temp)) { Remove-Item -LiteralPath $Temp -Recurse -Force -ErrorAction SilentlyContinue }
}

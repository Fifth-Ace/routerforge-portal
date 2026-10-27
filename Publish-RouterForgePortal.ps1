#Requires -Version 5.1
<#
New repository ONLY. PRECHECK -> GATES -> PUSH -> LIVE CI -> immutable release gate
-> exact tag -> LIVE signed release -> VERIFY. No automatic retry. Does not touch routerforge repo.
#>
[CmdletBinding()]
param()
$ErrorActionPreference='Stop'
$repo='Fifth-Ace/routerforge-portal'
$version='0.9.0'
$tag='v'+$version
$runId=$null
$releaseRunId=$null
function Stage([string]$s){Write-Host ('=== '+$s+' ===') -ForegroundColor Cyan}
function Gate([bool]$ok,[string]$code){if(-not $ok){throw $code}}
function Native([string]$program,[string[]]$arguments){
  & $program @arguments
  Gate ($LASTEXITCODE -eq 0) ($program+'_EXIT_'+$LASTEXITCODE)
}
function ExactPushRun([string]$workflow,[string]$sha,[string]$r){
  for($i=0;$i -lt 75;$i++){
    $raw= & gh run list --repo $r --workflow $workflow --event push --commit $sha --limit 20 --json databaseId,headSha,headBranch,status,conclusion
    Gate ($LASTEXITCODE -eq 0) ('RUN_LOOKUP_FAILED_'+$workflow)
    $hits=@($raw | ConvertFrom-Json | Where-Object {$_.headSha -ceq $sha})
    if($hits.Count -gt 0){return [long]$hits[0].databaseId}
    if($i % 5 -eq 0){Write-Host ('LIVE: waiting exact run, workflow='+$workflow+' SHA='+$sha)}
    Start-Sleep -Seconds 2
  }
  throw ('EXACT_RUN_NOT_FOUND_'+$workflow)
}
try{
  Stage 'PRECHECK'
  foreach($cmd in @('git','gh')){Gate ([bool](Get-Command $cmd -ErrorAction SilentlyContinue)) ('MISSING_'+$cmd)}
  Push-Location -LiteralPath $PSScriptRoot
  try{
    Gate (-not (Test-Path .git)) 'SOURCE_ALREADY_GIT'
    $m=Get-Content -Raw -Encoding UTF8 -LiteralPath manifest.json | ConvertFrom-Json
    Gate ($m.version -ceq $version -and $m.name -ceq 'RouterForge Portal') 'VERSION_MISMATCH'
    $user=(& gh api user --jq '.login').Trim()
    Gate ($LASTEXITCODE -eq 0 -and $user -ceq 'Fifth-Ace') 'WRONG_GITHUB_ACCOUNT'
    # A 404 is an expected precheck result, not an unhandled PS 5.1 stderr error.
    $oldEap=$ErrorActionPreference
    try {
      $ErrorActionPreference='Continue'
      & gh repo view $repo --json name 1>$null 2>$null
      $repoStatus=$LASTEXITCODE
    } finally { $ErrorActionPreference=$oldEap }
    Gate ($repoStatus -ne 0) 'TARGET_REPOSITORY_EXISTS_STOP'
    Stage 'GATES'
    foreach($file in @(
      'LICENSE','PRIVACY.md','SECURITY.md','README.md','README_EN.md',
      '.github/workflows/ci.yml','.github/workflows/release.yml',
      'tools/security_gate.py','tools/build_channels.py','tools/build_userscript.py',
      'userscript/runtime.template.js','userscript/catalog.json','tests/test_channels.py',
      'docs/INSTALL-RU.md','docs/INSTALL-EN.md','manifest.json','package.json'
    )){Gate (Test-Path -LiteralPath $file -PathType Leaf) ('MISSING_FILE_'+$file)}
    $identity=& git var GIT_AUTHOR_IDENT
    Gate ($LASTEXITCODE -eq 0 -and [bool]$identity) 'GIT_AUTHOR_IDENT_MISSING'
    Write-Host 'SOURCE_TREE: PASS'
    Write-Host 'TARGET: NEW_PUBLIC_REPO_ONLY'
    Write-Host 'ROUTERFORGE_CORE: UNTOUCHED'
    Write-Host 'ROUTER_RUNTIME: UNTOUCHED'
    Stage 'ACTION / PUSH'
    Native 'git' @('init','-b','main')
    Native 'git' @('add','.')
    $tracked=@(& git ls-files)
    Gate ($LASTEXITCODE -eq 0 -and $tracked.Count -gt 25 -and $tracked.Count -lt 160) 'UNEXPECTED_TRACKED_FILES'
    foreach($item in $tracked){
      Gate ($item -notmatch '(^|/)(\.git|dist|release|node_modules|__pycache__)(/|$)' -and $item -notmatch '(\.env|\.key|\.pem|\.pfx|\.p12|\.bak|\.log)$') ('UNEXPECTED_TRACKED_PATH_'+$item)
    }
    Native 'git' @('commit','-m','feat: bootstrap RouterForge Portal unified four-browser release')
    $sha=(& git rev-parse HEAD).Trim()
    Gate ($LASTEXITCODE -eq 0 -and $sha -match '^[a-f0-9]{40}$') 'COMMIT_SHA_INVALID'
    Write-Host ('EXACT_SHA: '+$sha)
    Native 'gh' @('auth','setup-git')
    Native 'gh' @('repo','create',$repo,'--public','--source','.','--remote','origin','--push','--description','RouterForge Portal: unified Keenetic WebUI applications (Chrome/Edge/Opera/Firefox)')
    $remote=(& gh api ('repos/'+$repo+'/commits/main') --jq .sha).Trim()
    Gate ($LASTEXITCODE -eq 0 -and $remote -ceq $sha) 'REMOTE_SHA_DRIFT'
    Stage 'LIVE / CI'
    $runId=ExactPushRun 'ci.yml' $sha $repo
    Write-Host ('CI_RUN_ID: '+$runId)
    Native 'gh' @('run','watch',[string]$runId,'--repo',$repo,'--exit-status')
    Stage 'VERIFY / CI'
    $ciRaw=& gh run view $runId --repo $repo --json headSha,status,conclusion
    Gate ($LASTEXITCODE -eq 0) 'CI_VIEW_FAILED'
    $ci=$ciRaw | ConvertFrom-Json
    Gate ($ci.headSha -ceq $sha -and $ci.status -eq 'completed' -and $ci.conclusion -eq 'success') 'CI_EXACT_SHA_NOT_GREEN'
    $remote=(& gh api ('repos/'+$repo+'/commits/main') --jq .sha).Trim()
    Gate ($LASTEXITCODE -eq 0 -and $remote -ceq $sha) 'REMOTE_MAIN_MOVED'
    Write-Host 'CI_EXACT_SHA: PASS'
    Stage 'SECURITY / IMMUTABLE RELEASES'
    # Required before creation: GitHub now exposes a native immutable release setting.
    Native 'gh' @('api','-X','PUT',('repos/'+$repo+'/immutable-releases'),'-H','X-GitHub-Api-Version: 2026-03-10')
    $immutRaw=& gh api ('repos/'+$repo+'/immutable-releases') -H 'X-GitHub-Api-Version: 2026-03-10'
    Gate ($LASTEXITCODE -eq 0) 'IMMUTABLE_READ_FAILED'
    $immut=$immutRaw | ConvertFrom-Json
    Gate ($immut.enabled -eq $true) 'IMMUTABILITY_NOT_ENABLED'
    Write-Host 'IMMUTABLE_RELEASES: PASS'
    Stage 'ACTION / EXACT TAG'
    $existing=& git ls-remote --tags origin ('refs/tags/'+$tag)
    Gate ($LASTEXITCODE -eq 0 -and -not $existing) 'REMOTE_TAG_ALREADY_EXISTS'
    Native 'git' @('tag','-a',$tag,'-m',('RouterForge Portal '+$tag))
    Native 'git' @('push','origin',('refs/tags/'+$tag))
    Write-Host ('TAG: '+$tag+' EXACT_SHA: '+$sha)
    Stage 'LIVE / RELEASE'
    # No duplicate push-based release runs. Dispatch exactly this tag to get exact Run ID directly.
    $request='{ "ref": "'+$tag+'", "return_run_details": true }'
    $detailsRaw=$request | & gh api -X POST ('repos/'+$repo+'/actions/workflows/release.yml/dispatches') -H 'X-GitHub-Api-Version: 2026-03-10' --input -
    Gate ($LASTEXITCODE -eq 0) 'RELEASE_DISPATCH_FAILED'
    $details=($detailsRaw | ConvertFrom-Json)
    $releaseRunId=[long]$details.workflow_run_id
    Gate ($releaseRunId -gt 0) 'EXACT_RELEASE_RUN_ID_MISSING'
    Write-Host ('RELEASE_RUN_ID: '+$releaseRunId)
    Native 'gh' @('run','watch',[string]$releaseRunId,'--repo',$repo,'--exit-status')
    Stage 'VERIFY / RELEASE'
    $vr=& gh run view $releaseRunId --repo $repo --json headSha,status,conclusion
    Gate ($LASTEXITCODE -eq 0) 'RELEASE_VIEW_FAILED'
    $rv=$vr | ConvertFrom-Json
    Gate ($rv.headSha -ceq $sha -and $rv.conclusion -eq 'success' -and $rv.status -eq 'completed') 'RELEASE_EXACT_SHA_NOT_GREEN'
    $relRaw=& gh release view $tag --repo $repo --json tagName,isDraft,isPrerelease,assets
    Gate ($LASTEXITCODE -eq 0) 'RELEASE_NOT_FOUND'
    $rel=$relRaw | ConvertFrom-Json
    $expectedNames=@('routerforge-portal-chromium-v0.9.0.zip','routerforge-portal.user.js','routerforge-portal.meta.js','routerforge-portal-firefox-UNSIGNED-DEV-v0.9.0.xpi','SHA256SUMS.txt','CHANNELS.json')
    $names=@($rel.assets | ForEach-Object {$_.name})
    foreach($name in $expectedNames){Gate ($names -contains $name) ('RELEASE_ASSET_MISSING_'+$name)}
    Gate ($rel.tagName -ceq $tag -and -not $rel.isDraft -and -not $rel.isPrerelease) 'RELEASE_NOT_FINAL'
    Stage 'VERIFY / IMMUTABLE RELEASE + ATTESTATIONS'
    Native 'gh' @('release','verify',$tag,'--repo',$repo)
    $verifyDir=Join-Path $env:TEMP ('RFPortal-verify-'+[guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $verifyDir | Out-Null
    Native 'gh' @('release','download',$tag,'--repo',$repo,'--dir',$verifyDir)
    foreach($name in $expectedNames){
      Gate (Test-Path -LiteralPath (Join-Path $verifyDir $name) -PathType Leaf) ('DOWNLOAD_MISSING_'+$name)
    }
    $digestLines=Get-Content -Encoding UTF8 -LiteralPath (Join-Path $verifyDir 'SHA256SUMS.txt')
    foreach($line in $digestLines){
      Gate ($line -match '^([0-9a-f]{64})  ([A-Za-z0-9._-]+)$') 'BAD_CHECKSUM_LINE'
      $wanted=$matches[1];$file=$matches[2]
      $filePath=Join-Path $verifyDir $file
      Gate (Test-Path -LiteralPath $filePath -PathType Leaf) ('CHECKSUM_FILE_MISSING_'+$file)
      $actual=(Get-FileHash -Algorithm SHA256 -LiteralPath $filePath).Hash
      Gate ($actual -ieq $wanted) ('CHECKSUM_MISMATCH_'+$file)
    }
    foreach($name in @('routerforge-portal-chromium-v0.9.0.zip','routerforge-portal.user.js','routerforge-portal.meta.js','routerforge-portal-firefox-UNSIGNED-DEV-v0.9.0.xpi')){
      Native 'gh' @('attestation','verify',(Join-Path $verifyDir $name),
        '--repo',$repo,'--signer-workflow',($repo+'/.github/workflows/release.yml'),
        '--source-ref',('refs/tags/'+$tag),'--source-digest',$sha)
    }
    Write-Host 'RELEASE_ASSETS_SHA256: PASS'
    Write-Host 'SIGNED_PROVENANCE: PASS (4/4)'
    Write-Host 'RELEASE_IMMUTABILITY: PASS'
    Write-Host '=== RESULT ===' -ForegroundColor Green
    Write-Host 'STATE: PASS' -ForegroundColor Green
    Write-Host ('REPOSITORY: https://github.com/'+$repo)
    Write-Host ('COMMIT: '+$sha)
    Write-Host ('CI_RUN_ID: '+$runId)
    Write-Host ('RELEASE_RUN_ID: '+$releaseRunId)
    Write-Host ('RELEASE_URL: https://github.com/'+$repo+'/releases/tag/'+$tag)
    Write-Host 'CHROME/EDGE/OPERA: CHROMIUM_ZIP + USERSCRIPT'
    Write-Host 'FIREFOX: USERSCRIPT; NATIVE_UNSIGNED_DEV_ONLY'
    Write-Host 'ROUTERFORGE_CORE / KEENETIC: UNTOUCHED'
  }
  finally{Pop-Location}
}
catch{
  Stage 'FIRST_FAIL_DIAGNOSTICS'
  if($releaseRunId){& gh run view $releaseRunId --repo $repo --log-failed}
  elseif($runId){& gh run view $runId --repo $repo --log-failed}
  Write-Host '=== RESULT ===' -ForegroundColor Red
  Write-Host ('STATE: FAIL - '+$_.Exception.Message) -ForegroundColor Red
  Write-Host 'NO_AUTOMATIC_RETRY'
  exit 1
}

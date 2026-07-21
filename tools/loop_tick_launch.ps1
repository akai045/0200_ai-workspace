<#
  loop_tick_launch.ps1 — loop_tick.ps1 の環境差吸収ラッパー

  役割：ダブルクリック起動（loop_tick.cmd）から呼ばれる薄いラッパー。
  各ユーザーの実行環境（WSL側のclaudeパス等）は人によって異なる前提のため、
  このファイル自体は共有・環境非依存のまま保ち、個人差は
  .claude/loop_local.ps1（Git管理外・各自が作成）から読み込む。

  .claude/loop_local.ps1 が無ければ loop_tick.ps1 の既定値のまま実行する。
  雛形は .claude/loop_local.example.ps1 を参照（コピーして自分用に編集）。
#>

$ErrorActionPreference = 'Stop'
$repoRoot  = Split-Path -Parent $PSScriptRoot
$localConf = Join-Path $repoRoot '.claude\loop_local.ps1'

# 個人設定ファイルは、この中で $LoopParams というハッシュテーブルを定義する規約
# （例: $LoopParams = @{ WslClaudeBin = '/home/xxx/.npm-global/bin/claude' }）。
$LoopParams = @{}
if (Test-Path $localConf) {
  . $localConf
}

Write-Host "[loop-launch] 個人設定: $(if (Test-Path $localConf) { $localConf } else { '(なし・既定値を使用)' })"
Write-Host "[loop-launch] 実行を開始します。裏で claude が動くため、最大30分ほど無反応に見えることがあります。終わるまでこのウィンドウを閉じないでください。"

$scriptPath = Join-Path $repoRoot 'tools\loop_tick.ps1'
& $scriptPath @LoopParams
$exitCode = $LASTEXITCODE

Write-Host "[loop-launch] 終了しました。上の結果を確認してください。"
exit $exitCode

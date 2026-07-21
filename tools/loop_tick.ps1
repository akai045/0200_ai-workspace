<#
  loop_tick.ps1 — 「続きを1歩」進める手動トリガーツール（ADR-0005 実装）

  役割：人間が気づいた時（利用制限にかかった・タスクの続きを進めたい等）に**手で実行**する短命プロセス。
  会話文脈は持たない前提（状態はすべてファイル：PROGRESS.md / タスクのメモ / 10_Runs）。

  【2026-07-10 方針転換】タスクスケジューラによる無人自動実行は行わない（人間の判断）。
  理由：①アプリを閉じても動く＝人間が気づかないうちに動く、という制御感の喪失が大きい
        ②「定期的に承認キューを確認する」運用なら、手動トリガーでも実質的な価値は変わらない
        ③ヘッドレス実行にはWrite/Edit権限の事前許可設定が必須で、無人化には別のリスクが伴う
  このスクリプトは「あなたが打ったら1歩進める」道具として使う。安全機構（PIDロック・dirty-tree
  defer・max_attempts歯止め等）は誤操作（二重起動・壊れたタスクの繰り返し実行）防止として引き続き有効。

  処理順（ADR-0005 §3、手動トリガー版）：
    1. 停止スイッチ確認   .claude/loop.disabled があれば即終了
    2. コスト歯止め確認   当日の実行回数が上限なら終了
    3. PIDロック取得      他プロセスが生存中なら終了（単一書き手・§4.1）。stale は自動奪取
    4. dirty-tree defer   追跡ファイルに未コミット変更があれば見送り（人間/他セッションを踏まない・§4.2）
    5. 対象判定          doing/checking の継続、または auto:true の todo(T0/T1) が無ければ終了
    6. 起動             -DryRun なら実起動せずログのみ。実行時は claude をヘッドレス起動（時間上限つき）
    7. 記録＆ロック解放   10_Runs/_loop へ追記（索引＋詳細ファイル）・状態更新・ロック削除（異常時も finally で必ず解放）

  使い方：
    pwsh tools/loop_tick.ps1 -DryRun      # 土台の挙動確認（claude を起動しない）※まずこれで検証
    pwsh tools/loop_tick.ps1              # 実行（気づいた時に手で）

  絶対にやらないこと（不変・ADR-0005 §2）：T2実行 / approval→done / §12ゲート開放 /
  保護ブランチpush / 外部送信 / 削除。これらは再開プロンプト(loop_resume_prompt.txt)側でも禁止。
#>
[CmdletBinding()]
param(
  [switch]$DryRun,
  [int]$MaxRunsPerDay = 20,   # 1日あたり自動実行の上限（ADR-0005 §7）
  [int]$TimeoutSec    = 1800, # 1回の実行時間上限（30分。tick間隔と同じ長さでも、PIDロックが多重起動を防ぐため安全）
  # claude CLI は本機では WSL 内の npm-global にインストールされている（Windows PATH・WSL既定PATHの
  # どちらにも乗らない＝.bashrc経由のPATH追加のため対話シェルでしか見えない。実機確認: 2026-07-09）。
  # 他machineに持ち込む場合はここを渡す。
  [string]$WslClaudeBin = '/home/user/.npm-global/bin/claude'
)

$ErrorActionPreference = 'Stop'
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

# UTF-8(BOMなし)で書く。PS5.1のOut-File -Encoding utf8はBOMを付けJSON/JSONLを壊すため。
function Write-Utf8([string]$path, [string]$content, [bool]$append = $false) {
  if ($append) { [System.IO.File]::AppendAllText($path, $content, $Utf8NoBom) }
  else         { [System.IO.File]::WriteAllText($path, $content, $Utf8NoBom) }
}

# --- パス ---
$repo         = Split-Path -Parent $PSScriptRoot        # tools/ の親 = リポジトリ root
$claudeDir    = Join-Path $repo '.claude'
$disabledFile = Join-Path $claudeDir 'loop.disabled'
$lockFile     = Join-Path $claudeDir 'loop.lock'
$stateFile    = Join-Path $claudeDir 'loop_state.json'
$promptFile   = Join-Path $PSScriptRoot 'loop_resume_prompt.txt'
$today        = (Get-Date).ToString('yyyy-MM-dd')
$logDir       = Join-Path $repo '10_Runs/_loop'
$logFile      = Join-Path $logDir ("$today.jsonl")

# --- ログ（追記専用・ADR-0005 §8） ---
# JSONLは軽量な索引（一覧性重視）。実際の応答本文は別ファイル（detail）に丸ごと残し、
# ここには参照（ファイル名）だけを書く。索引だけ見れば済み、気になった回だけ detail を開けばよい。
function Write-LoopLog([string]$outcome, [string]$taskId = '', [string]$note = '', [string]$detailFile = '') {
  if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Force -Path $logDir | Out-Null }
  $rec = [ordered]@{ ts = (Get-Date).ToString('o'); outcome = $outcome }
  if ($taskId)     { $rec['task_id'] = $taskId }
  if ($note)       { $rec['note']    = $note }
  if ($detailFile) { $rec['detail']  = (Split-Path -Leaf $detailFile) }
  if ($DryRun)     { $rec['dry_run'] = $true }
  Write-Utf8 $logFile (($rec | ConvertTo-Json -Compress) + "`n") $true
  Write-Host ("[loop] {0} {1} {2}" -f $outcome, $taskId, $note).Trim()
}

# --- 当日状態（回数・累計分・最終結果） ---
function Get-State {
  # 常に全プロパティを持つ正規化オブジェクトを返す（partial/旧形式のJSONでもSave-Stateが壊れない）。
  $runs = 0; $minutes = 0.0
  if (Test-Path $stateFile) {
    try { $s = Get-Content -Raw $stateFile | ConvertFrom-Json } catch { $s = $null }
    if ($s -and $s.date -eq $today) {
      if ($s.PSObject.Properties['runs'])    { $runs    = [int]$s.runs }
      if ($s.PSObject.Properties['minutes']) { $minutes = [double]$s.minutes }
    }
  }
  return [pscustomobject]@{ date = $today; runs = $runs; minutes = $minutes; lastTs = ''; lastOutcome = '' }
}
function Save-State($s, [string]$outcome) {
  $s.lastTs = (Get-Date).ToString('o'); $s.lastOutcome = $outcome
  if (-not (Test-Path $claudeDir)) { New-Item -ItemType Directory -Force -Path $claudeDir | Out-Null }
  Write-Utf8 $stateFile ($s | ConvertTo-Json -Compress)
}

# --- frontmatter 抽出（先頭の --- ... --- ブロックのみ。本文中の "status:" 等を誤検出しない） ---
function Get-Frontmatter([string]$text) {
  if ($text.Length -gt 0 -and $text[0] -eq [char]0xFEFF) { $text = $text.Substring(1) }  # BOM除去
  $m = [regex]::Match($text, '(?s)^\s*---\s*\r?\n(.*?)\r?\n---\s*')
  if ($m.Success) { return $m.Groups[1].Value }
  return ''
}
function Get-Field([string]$fm, [string]$name) {
  foreach ($line in ($fm -split "`n")) {
    if ($line -match ("^\s*{0}\s*:\s*(.+?)\s*$" -f [regex]::Escape($name))) {
      return $Matches[1].Trim().Trim('"').Trim("'")
    }
  }
  return $null
}

# --- Windows パス → WSL パス（既定の /mnt/<drive> マウント方式。実機確認済み） ---
function ConvertTo-WslPath([string]$winPath) {
  $drive = $winPath.Substring(0, 1).ToLower()
  $rest  = $winPath.Substring(2) -replace '\\', '/'
  return "/mnt/$drive$rest"
}

# --- 連続失敗回数の追跡（日次リセットしない・タスクごと／ADR-0005 §7 max_attempts の実施） ---
# タイムアウト/エラーが max_attempts 回続いたタスクには二度と手を出さず blocked にして人間へ委ねる。
# これにより「30分でも終わらない作業が無限に再試行され続ける」を防ぐ（timeoutを伸ばしても解決しない問題）。
$attemptsFile = Join-Path $claudeDir 'loop_attempts.json'
function Get-Attempts {
  $h = @{}
  if (Test-Path $attemptsFile) {
    try { $a = Get-Content -Raw $attemptsFile | ConvertFrom-Json } catch { $a = $null }
    if ($a) { foreach ($p in $a.PSObject.Properties) { $h[$p.Name] = [int]$p.Value } }
  }
  return $h
}
function Save-Attempts([hashtable]$h) {
  if (-not (Test-Path $claudeDir)) { New-Item -ItemType Directory -Force -Path $claudeDir | Out-Null }
  Write-Utf8 $attemptsFile ($h | ConvertTo-Json -Compress)
}

# --- frontmatterのstatus行だけを安全に書き換える（本文中の同名文字列は触らない） ---
function Set-FrontmatterStatus([string]$filePath, [string]$newStatus) {
  $raw = Get-Content -Raw -Encoding UTF8 $filePath
  $m = [regex]::Match($raw, '(?s)^(\xEF\xBB\xBF)?(---\s*\r?\n)(.*?)(\r?\n---\s*)')
  if (-not $m.Success) { return }
  $fmStart = $m.Groups[3].Index
  $fm      = $m.Groups[3].Value
  $newFm   = [regex]::Replace($fm, '(?m)^status:\s*\S+.*$', "status: $newStatus", 1)
  $newRaw  = $raw.Substring(0, $fmStart) + $newFm + $raw.Substring($fmStart + $fm.Length)
  Write-Utf8 $filePath $newRaw
}

# --- ロック解放（自分のロックのときだけ） ---
$lockAcquired = $false
function Release-Lock {
  if ($script:lockAcquired -and (Test-Path $lockFile)) {
    Remove-Item $lockFile -Force -ErrorAction SilentlyContinue
    $script:lockAcquired = $false
  }
}

$state = Get-State

try {
  # 1) 停止スイッチ
  if (Test-Path $disabledFile) { Write-LoopLog 'disabled'; Save-State $state 'disabled'; return }

  # 2) コスト歯止め（当日回数）
  if ($state.runs -ge $MaxRunsPerDay) {
    Write-LoopLog 'budget-reached' '' ("runs={0}>= {1}" -f $state.runs, $MaxRunsPerDay)
    Save-State $state 'budget-reached'; return
  }

  # 3) PIDロック（時間でなくプロセス生死で判定）
  if (Test-Path $lockFile) {
    $held = $null
    try { $held = Get-Content -Raw $lockFile | ConvertFrom-Json } catch { $held = $null }
    if ($held -and $held.pid) {
      $alive = Get-Process -Id $held.pid -ErrorAction SilentlyContinue
      if ($alive) { Write-LoopLog 'busy' '' ("pid={0} alive" -f $held.pid); return }  # 他プロセス生存 → 何もしない
    }
    # ここに来たら stale（PIDが既に終了）→ 奪取してよい
  }
  if (-not (Test-Path $claudeDir)) { New-Item -ItemType Directory -Force -Path $claudeDir | Out-Null }
  Write-Utf8 $lockFile ([ordered]@{ pid = $PID; started = (Get-Date).ToString('o'); host = $env:COMPUTERNAME } | ConvertTo-Json -Compress)
  $lockAcquired = $true

  # 4) dirty-tree defer（追跡ファイルの未コミット変更のみ。untracked は無視 = 00_Inbox 等で永久defer化しない）
  $dirty = (& git -C $repo status --porcelain --untracked-files=no) | Where-Object { $_ -ne '' }
  if ($dirty) {
    Write-LoopLog 'dirty-defer' '' ("{0} files uncommitted" -f @($dirty).Count)
    Save-State $state 'dirty-defer'; return
  }

  # 5) 対象判定
  $taskFiles = Get-ChildItem (Join-Path $repo '02_Tasks') -Filter 'TASK-*.md' -ErrorAction SilentlyContinue | Sort-Object Name
  $attempts = Get-Attempts
  $target = $null; $mode = $null
  foreach ($f in $taskFiles) {                                   # 5-1) doing/checking の継続を優先
    $fm    = Get-Frontmatter (Get-Content -Raw -Encoding UTF8 $f.FullName)
    $st    = Get-Field $fm 'status'
    $draft = Get-Field $fm 'draft'
    if (($st -eq 'doing' -or $st -eq 'checking') -and $draft -ne 'true') {
      $tid = $f.BaseName
      $maxAttemptsRaw = Get-Field $fm 'max_attempts'
      $maxAttempts = if ($maxAttemptsRaw -match '^\d+$') { [int]$maxAttemptsRaw } else { 2 }
      $cur = 0; if ($attempts.ContainsKey($tid)) { $cur = $attempts[$tid] }
      if ($cur -ge $maxAttempts) {
        # max_attempts超過：このタスクには二度と手を出さずblockedへ動かし、人間へ委ねる（ADR-0005 §7）。
        # 30分等にタイムアウトを伸ばしても解決しない「永遠に終わらない作業」をここで止める。
        Set-FrontmatterStatus $f.FullName 'blocked'
        & git -C $repo add -- $f.FullName | Out-Null
        & git -C $repo commit -q -m "chore: $tid を blocked へ（無人LOOP・max_attempts超過・自動）" | Out-Null
        Write-LoopLog 'blocked-max-attempts' $tid ("attempts={0}>={1}" -f $cur, $maxAttempts)
        continue   # このタスクはスキップして次の候補を探す
      }
      $target = $f; $mode = 'continue'; break
    }
  }
  if (-not $target) {                                            # 5-2) auto:true の todo(T0/T1)
    foreach ($f in $taskFiles) {
      $fm    = Get-Frontmatter (Get-Content -Raw -Encoding UTF8 $f.FullName)
      $st    = Get-Field $fm 'status'
      $auto  = Get-Field $fm 'auto'
      $tier  = Get-Field $fm 'tier'
      $draft = Get-Field $fm 'draft'
      # draft:true は結晶化前の下書き（人間との壁打ち待ち）。auto:trueが誤って付いていても対象にしない（多層防御）。
      if ($st -eq 'todo' -and $auto -eq 'true' -and $draft -ne 'true' -and ($tier -eq 'T0' -or $tier -eq 'T1')) {
        $tid = $f.BaseName
        $maxAttemptsRaw = Get-Field $fm 'max_attempts'
        $maxAttempts = if ($maxAttemptsRaw -match '^\d+$') { [int]$maxAttemptsRaw } else { 2 }
        $cur = 0; if ($attempts.ContainsKey($tid)) { $cur = $attempts[$tid] }
        if ($cur -ge $maxAttempts) {
          # todoのまま繰り返し失敗した場合も同様にblockedへ（killされてstatus更新前に終わったケースの保険）
          Set-FrontmatterStatus $f.FullName 'blocked'
          & git -C $repo add -- $f.FullName | Out-Null
          & git -C $repo commit -q -m "chore: $tid を blocked へ（無人LOOP・max_attempts超過・自動）" | Out-Null
          Write-LoopLog 'blocked-max-attempts' $tid ("attempts={0}>={1}" -f $cur, $maxAttempts)
          continue
        }
        $target = $f; $mode = 'start'; break
      }
    }
  }
  if (-not $target) { Write-LoopLog 'idle'; Save-State $state 'idle'; return }  # 何もすることがない

  $taskId = $target.BaseName

  # 6) 起動。暴走防止のため、実行「試行」を数える（実起動の前に加算・永続化）
  $state.runs = [int]$state.runs + 1

  if ($DryRun) {
    Write-LoopLog 'worked' $taskId ("dry-run: would {0}" -f $mode)
    Save-State $state 'worked'; return
  }

  # --- 実起動：WSL経由（本機ではclaudeはWSL内にのみ存在・実機確認済み：2026-07-09） ---
  # 手順：①WSL内でバイナリの実在確認 ②リポジトリのWSLパスへcd ③プロンプトはファイル経由で渡す
  #      （長文・複数行・日本語のプロンプトをコマンドライン引数として複数シェル境界（PowerShell→wsl.exe→bash）
  #      をまたいで直接埋め込むとエスケープが壊れやすいため、bash側の $(cat ファイル) で読ませる）。
  $binCheck = & wsl bash -c "test -x '$WslClaudeBin' && echo YES || echo NO"
  if ($binCheck -notmatch 'YES') {
    Write-LoopLog 'error' $taskId "claude CLI not found in WSL at $WslClaudeBin"
    Save-State $state 'error'; return
  }

  $wslRepo    = ConvertTo-WslPath $repo
  $promptText = (Get-Content -Raw -Encoding UTF8 $promptFile) + "`n`n# 対象タスク: $taskId ($mode)`n"
  $tmpPromptFile = Join-Path $claudeDir 'loop_prompt_tmp.txt'
  Write-Utf8 $tmpPromptFile $promptText   # BOMなしで書く（bash側のcatがそのまま読むため）
  $wslPromptFile = "$wslRepo/.claude/loop_prompt_tmp.txt"

  # bashコマンドは「文字列引数」ではなく「一時スクリプトファイル」として渡す。
  # PowerShell→wsl.exe→bash という複数シェル境界を、文字列内の引用符付きコマンドとしてまたごうとすると
  # 引用符が失われて単語分割される実機バグを確認済み（2026-07-09）。ファイル経由なら wsl に渡す引数は
  # 単純なパス文字列だけになり、この問題を回避できる。
  # < /dev/null：stdin未接続だと claude が最大3秒待って警告を出すため明示的に閉じる（実機確認済み）
  #
  # 権限（実機検証済み・2026-07-10）：
  #   --permission-mode dontAsk … 許可リストに無いものは拒否（acceptEditsは許可リストを無視して
  #     全許可してしまうため使わない＝実機で誤検知済み）。
  #   --allowedTools … Write/Editをリポジトリ内の実作業対象パスに限定。.claude/（設定・実行状態自体）
  #     と .git/ は含めない＝ヘッドレスセッションが自分の権限を自分で書き換えられないようにする。
  #   Bashはgitの読み取り・コミット系のみ（git push は含めない＝保護ブランチへの反映は人間専用）。
  #   export ECC_GATEGUARD=off … 本機のWSL側claudeには本項目と無関係な第三者プラグイン(ecc)の
  #     PreToolUseフック「GateGuard」が有効になっており、通常のimporter/API検証を前提とした
  #     フックのためMarkdownベースのAILOOPタスクでは意図せずWrite/Editをブロックする（実機確認済み）。
  #     AILOOP自身の安全機構（tier制限・dirty-tree defer・max_attempts・Git可逆性）とは無関係。
  $allowedTools = 'Write(02_Tasks/**),Write(01_Projects/**),Write(03_Outputs/**),Write(06_Skills/**),' +
                  'Write(05_Agents/**),Write(07_Policies/**),Write(08_Decisions/**),Write(09_Reports/**),' +
                  'Write(10_Runs/**),Write(tools/**),Write(CLAUDE.md),Write(SPEC.md),Write(PROGRESS.md),' +
                  'Write(HOME.md),Write(.gitignore),' +
                  'Edit(02_Tasks/**),Edit(01_Projects/**),Edit(03_Outputs/**),Edit(06_Skills/**),' +
                  'Edit(05_Agents/**),Edit(07_Policies/**),Edit(08_Decisions/**),Edit(09_Reports/**),' +
                  'Edit(10_Runs/**),Edit(tools/**),Edit(CLAUDE.md),Edit(SPEC.md),Edit(PROGRESS.md),' +
                  'Edit(HOME.md),Edit(.gitignore),' +
                  'Bash(git add *),Bash(git commit *),Bash(git status *),Bash(git diff *),Bash(git log *)'
  $scriptTemplate = @'
cd '{0}'
export ECC_GATEGUARD=off
exec {1} --permission-mode dontAsk --allowedTools "{3}" -p "$(cat '{2}')" < /dev/null
'@
  $scriptBody = ($scriptTemplate -f $wslRepo, $WslClaudeBin, $wslPromptFile, $allowedTools) -replace "`r`n", "`n"
  $tmpScriptFile = Join-Path $claudeDir 'loop_invoke_tmp.sh'
  Write-Utf8 $tmpScriptFile $scriptBody
  $wslScriptFile = "$wslRepo/.claude/loop_invoke_tmp.sh"

  # Start-Job ではなく System.Diagnostics.Process を直接使う。Start-Job は別プロセスの標準出力の
  # コードページ既定値に依存し日本語Windowsで文字化けする＝実機確認済み。Process なら
  # StandardOutputEncoding を明示できるので確実。タイムアウトも WaitForExit+Kill で厳密に制御できる。
  $t0 = Get-Date
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName  = 'wsl.exe'
  $psi.Arguments = "bash `"$wslScriptFile`""
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError  = $true
  $psi.UseShellExecute        = $false
  $psi.StandardOutputEncoding = [System.Text.Encoding]::UTF8
  $psi.StandardErrorEncoding  = [System.Text.Encoding]::UTF8

  $proc = [System.Diagnostics.Process]::Start($psi)
  $stdoutTask = $proc.StandardOutput.ReadToEndAsync()
  $stderrTask = $proc.StandardError.ReadToEndAsync()
  $detailFile = Join-Path $logDir ("{0}_{1}_{2}.txt" -f $today, $taskId, (Get-Date).ToString('HHmmss'))
  if ($proc.WaitForExit($TimeoutSec * 1000)) {
    $out = $stdoutTask.Result + "`n" + $stderrTask.Result
    $outcome = if ($out -match '(?i)\b(limit|rate limit|usage limit|quota)\b') { 'limit-hit' } else { 'worked' }
    Write-Utf8 $detailFile $out
    Write-LoopLog $outcome $taskId ("elapsed={0:n1}min" -f ((Get-Date) - $t0).TotalMinutes) $detailFile
  } else {
    try { $proc.Kill() } catch {}
    $partial = ''
    try { $partial = $stdoutTask.Result } catch {}
    Write-Utf8 $detailFile ("(timeout > {0}s — 途中経過)`n{1}" -f $TimeoutSec, $partial)
    Write-LoopLog 'error' $taskId ("timeout > {0}s" -f $TimeoutSec) $detailFile
    $outcome = 'error'
  }
  Remove-Item $tmpPromptFile, $tmpScriptFile -Force -ErrorAction SilentlyContinue

  # 連続失敗回数を更新（worked→リセット、error→+1、limit-hit→環境要因のためカウントしない）
  $attempts = Get-Attempts
  if ($outcome -eq 'worked') { $attempts[$taskId] = 0 }
  elseif ($outcome -eq 'error') {
    $cur = 0; if ($attempts.ContainsKey($taskId)) { $cur = $attempts[$taskId] }
    $attempts[$taskId] = $cur + 1
  }
  Save-Attempts $attempts

  $state.minutes = [double]$state.minutes + ((Get-Date) - $t0).TotalMinutes
  Save-State $state $outcome
}
catch {
  Write-LoopLog 'error' '' ($_.Exception.Message)
  try { Save-State $state 'error' } catch {}
}
finally {
  Release-Lock   # 異常時も必ず解放（デッドロック防止）
}

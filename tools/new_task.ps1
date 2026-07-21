<#
  new_task.ps1 — 自由記述をタスク形式へ変換する「機械部分」担当

  役割：面倒な機械作業（ID採番・日付・frontmatterのenum）を決定論的に片付け、
  正しい形式の 02_Tasks/TASK-YYYY-NNNN.md 雛形を1枚作る。
  判断が要る部分（objective / acceptance_criteria / inputs / outputs / prohibited）は
  空欄のまま残し、人間 or Planner（05_Agents/planner-prompt.md）が埋める。

  使い方：
    powershell -File tools/new_task.ps1 -Title "工数CSVの列名を統一する" -Tier T1 -Owner build-doer
    powershell -File tools/new_task.ps1 -Title "競合3社の価格を調査" -Tier T0 -Owner knowledge-doer -Auto -Objective "..."

  1トリガーからの分解で子タスクを量産する場合は -Draft を付ける（draft:true・auto:falseで作成し、
  人間との壁打ちで結晶化するまで無人LOOPの対象にしない。06_Skills/task-decomposition パートA参照）。
    powershell -File tools/new_task.ps1 -Title "子タスクA" -Tier T1 -Owner build-doer -Draft

  ※ これは「形式づくり」だけ。中身の変換は planner-prompt.md の intake 手順に従う。
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$Title,
  [ValidateSet('T0','T1','T2')][string]$Tier = 'T1',
  [ValidateSet('knowledge-doer','build-doer')][string]$Owner = 'knowledge-doer',
  [string]$Project = 'PROJECT-000',
  [string]$Objective = '',
  [switch]$Auto,
  [switch]$Draft
)
if ($Auto -and $Draft) { throw "-Auto と -Draft は同時指定できない（draftは結晶化前の安全策のため、autoは常にfalseになる）" }
$ErrorActionPreference = 'Stop'
$repo     = Split-Path -Parent $PSScriptRoot
$tasksDir = Join-Path $repo '02_Tasks'
$template = Join-Path $tasksDir 'TASK-template.md'

# 次のID（全タスク横断で最大の連番+1）
$max = 0
Get-ChildItem $tasksDir -Filter 'TASK-*.md' | ForEach-Object {
  if ($_.BaseName -match '^TASK-\d{4}-(\d{4})$') { $n = [int]$Matches[1]; if ($n -gt $max) { $max = $n } }
}
$year = (Get-Date).ToString('yyyy')
$id   = 'TASK-{0}-{1:D4}' -f $year, ($max + 1)
$path = Join-Path $tasksDir "$id.md"
if (Test-Path $path) { throw "already exists: $path" }
$now  = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ss+09:00')

# 行単位で置換（空白やコメントに依存しない）。テキスト値は $ の誤展開を避けるためscriptblockで差し込む。
$c = Get-Content -Raw -Encoding UTF8 $template
function Set-Line([string]$text, [string]$field, [string]$value) {
  $rep = $value -replace '\$', '$$$$'   # -replace の置換文字列では $ が特殊。literal 化する
  $text -replace ("(?m)^" + [regex]::Escape($field) + ":.*$"), ("${field}: " + $rep)
}
$c = Set-Line $c 'task_id'    $id
$c = Set-Line $c 'title'      $Title
if ($Objective) { $c = Set-Line $c 'objective' $Objective }
$c = Set-Line $c 'project'    $Project
$c = Set-Line $c 'tier'       $Tier
$c = Set-Line $c 'owner'      $Owner
$c = Set-Line $c 'auto'       ($(if ($Auto) { 'true' } else { 'false' }))
$c = Set-Line $c 'draft'      ($(if ($Draft) { 'true' } else { 'false' }))
$c = Set-Line $c 'created_at' $now

[System.IO.File]::WriteAllText($path, $c, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "created: $path"
Write-Host ("  id={0}  tier={1}  owner={2}  auto={3}  draft={4}" -f $id, $Tier, $Owner, $Auto.IsPresent, $Draft.IsPresent)
if ($Draft) { Write-Host "  → draft:true。人間との壁打ちで結晶化してから draft:false に変更すること" }
Write-Host "次に埋める: objective / acceptance_criteria / inputs / outputs / prohibited（Plannerに変換させてもよい）"

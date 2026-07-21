---
task_id: TASK-2026-0001
title: 「わたしはルル」Webサイト制作（ロゴ／WPテンプレート／各ページHTML）
objective: ロゴマークとコンセプト資料、WordPressテンプレート一式、サイトマップ6ページ分の静的HTML（ブラウザ出力イメージ）を作成する
project: PROJECT-001
status: approval
tier: T1
owner: build-doer
checker: checker
auditor:
requires_human_approval: false
inputs:
  - 00_Inbox/prompt01.md
outputs:
  - 03_Outputs/PROJECT-001-watashiwa-lulu/logo/logo-concept.md
  - 03_Outputs/PROJECT-001-watashiwa-lulu/logo/logo.svg
  - 03_Outputs/PROJECT-001-watashiwa-lulu/wordpress/
  - 03_Outputs/PROJECT-001-watashiwa-lulu/html-preview/
acceptance_criteria:
  - ロゴSVGとコンセプト資料（意味・色・使用ルール）が揃っている
  - サイトマップ6項目（トップ/お知らせ・ブログ一覧/よくある質問/お問合せ/サービス詳細/ブログ記事詳細）に対応するWordPressテンプレートPHPファイルが揃っている
  - 同じ6項目に対応する静的HTMLがブラウザで見た目確認できる状態で揃っている（CSS適用済み）
  - トップページにコンセプト・サービス内容概要・FAQ上位3件が掲載されている
  - サービス詳細ページに料金体系（5プラン）と開始までの流れが掲載されている
  - よくある質問ページに提供された7件のQ&Aが掲載されている
  - 外部送信・本番デプロイ・実際のフォーム送信設定を行っていない
  - スマートフォン幅（〜760px）でヘッダーのナビゲーションがハンバーガーメニューに切り替わり、開閉できる（html-preview・wordpress双方）
prohibited:
  - 外部サービスへの画像生成依頼・アップロード
  - 本番サーバーへの反映やドメイン設定
  - お問合せフォームの実送信先（メールサーバー等）の設定
max_cost_usd: 5.00
max_attempts: 2
created_at: 2026-07-21T17:40:00+09:00
deadline:
---

# 背景
00_Inbox/prompt01.md に依頼内容一式（サービス名称・コンセプト・背景・料金・FAQ等）が記載されている。保護猫（成猫）と、高齢・一人暮らし等の理由で飼育を諦めがちな方をつなぐ訪問サポート型サービス「わたしはルル」のサイトを新規制作する。

# 詳細
- ブランドトーン：温かみ・安心・伴走感。年齢層は主に65歳以上とその周辺（家族・支援者も見る想定）のため、文字サイズや配色は落ち着いた読みやすいものにする。
- 配色：暖色系（テラコッタ/アプリコット）＋アイボリー背景＋セージグリーンのアクセント。真っ黒でなく温かみのある濃茶を基本文字色にする。
- ロゴは「家（屋根）＝安心できる住まい」と「猫の耳」を一体化させたシルエット＋ハート形の鼻で「家族として迎える」を表現する方向で検討。

## 対立的推論（着手前・3点／ADR-0006）
1. **料金・FAQ等の転記ミス**：料金5プラン・FAQ7件は数値・文言が多く転記ミスのリスクが高い → 全ページ公開前に原文（prompt01.md）と1件ずつ突き合わせて確認する。
2. **年齢層に不適合なUI**：デザインを凝りすぎると高齢者に読みづらくなる → 文字サイズ・コントラスト・行間を優先し、装飾は最小限にする。
3. **WordPressテンプレートが実際のテーマ規約を満たさない**：style.cssのテーマヘッダー欠落等でWPに認識されない可能性 → 最低限のテーマヘッダー・テンプレート階層（front-page/page-*/single/archive）を明示的に用意する。

# メモ
- 作業ログはこのファイルに追記していく。status は frontmatter でのみ管理する。

## 作業ログ（Doer・2026-07-21）
- ロゴ（`logo/logo.svg`・`logo-horizontal.svg`）とコンセプト資料（`logo/logo-concept.md`）を作成。
- 静的HTML6ページ（`html-preview/`：index/service/faq/contact/blog/blog-post）を作成。共通CSSは `html-preview/css/style.css`。
- WordPressテンプレート一式（`wordpress/`：style.css/functions.php/header/footer/front-page/page-service/page-faq/page-contact/archive/single/page/index + README.md）を作成。
- **機械的セルフチェック（§3.1.1）**：料金6金額・FAQ7件・プラン5件・流れ5ステップについて、`grep`で原文（`00_Inbox/prompt01.md`）と生成物（html-preview / wordpress 双方）を突き合わせ、件数・金額とも一致を確認（目視の思い込みに頼らず別経路で検証）。HTML内部リンクも全ファイル存在を確認済み。
- **原文からの意図的な修正（転記ミスではないことを明記）**：
  - Q3回答の誤字「そんあこと」→「そんなこと」に修正。
  - Q7回答の未閉じ括弧「（ある程度の期間は...お客様と猫さんが心配なので...」に閉じ括弧を補い「（ある程度の期間は、続けていただけたらと思います。お客様と猫さんのことが心配なので……）」に整えた。
- 対立的推論の3点（年齢層に不適合なUI／WPテーマ規約不足）はデザイン（大きめ文字・低装飾・テーマヘッダー完備）とテンプレート階層網羅で手当て済み。
- お問合せフォームの実送信設定・本番デプロイは行っていない（prohibited を遵守）。

## 作業ログ（Doer・改修・2026-07-21）
- 人間より「レスポンシブデザインで再度作成、スマートフォンはハンバーガーメニューに」との改修依頼を受け、status を `approval` から `doing` に戻して着手。
- ヘッダーナビゲーションを760px以下でオフキャンバス＋ハンバーガーメニュー化（`js/nav.js` を新規追加、CSSに `.nav-toggle` / `.site-nav`（モバイル時）/ `.nav-backdrop` を追加）。html-preview・wordpress双方に同内容を反映。
- hero見出しのフォントサイズを `clamp()`化、480px以下でコンテナ余白・セクション余白を縮小するなど、既存のグリッド類（.grid-3/.grid-2/.pricing/.steps/.post-card）以外の細部もモバイルで見やすいよう調整。

## 検査結果（Checker・初回・2026-07-21）
検査日: 2026-07-21／検査者: checker（Doerの作業には関与していない独立検証）
検査対象: `00_Inbox/prompt01.md`（原文）、`03_Outputs/PROJECT-001-watashiwa-lulu/` 配下の logo/・wordpress/・html-preview/ 全ファイル

### 受入条件ごとの判定

1. **ロゴSVGとコンセプト資料（意味・色・使用ルール）が揃っている** → **適合**
   `logo/logo.svg`・`logo/logo-horizontal.svg` が存在し、`logo/logo-concept.md` に構成要素の意味（屋根＝猫の耳＝安心できる住まい、ハート形の鼻等）、カラーパレット（HEXコード付き）、タイポグラフィ、Do/Don'tの使用ルールが揃って記載されている。

2. **サイトマップ6項目に対応するWordPressテンプレートPHPファイルが揃っている** → **適合**
   トップ=`front-page.php`／お知らせ・ブログ一覧=`archive.php`（+`index.php`フォールバック）／よくある質問=`page-faq.php`／お問合せフォーム=`page-contact.php`／サービス内容詳細=`page-service.php`／ブログ記事詳細=`single.php`。全テンプレートで `get_header()`／`get_footer()` の呼び出しを確認。`style.css` にテーマヘッダー必須項目（Theme Name/Version/Text Domain等）あり、`functions.php` でメニュー登録・アセット読込あり。`page.php`（フォールバック）も用意されており階層は妥当。

3. **同じ6項目に対応する静的HTMLがブラウザで見た目確認できる状態で揃っている（CSS適用済み）** → **適合**
   `index.html`／`service.html`／`faq.html`／`contact.html`／`blog.html`／`blog-post.html` の6ファイルが存在し、全ページで `<link rel="stylesheet" href="css/style.css">` を参照、`css/style.css` は実体あり（500行超、変数定義・レスポンシブ対応含む）。ヘッダー内のナビゲーション（トップ/サービス内容/よくある質問/お知らせ・ブログ/お問合せ）およびフッターの内部リンクは6ファイル全てで解決可能（リンク先ファイルが全て実在）。画像参照（`images/logo.svg`／`images/logo-horizontal.svg`）も実体あり。ブラウザでの実起動確認はCheckerの手元では行っていないが、コード上の構造（タグの開閉、パス解決）に問題は見当たらない。

4. **トップページにコンセプト・サービス内容概要・FAQ上位3件が掲載されている** → **適合**
   `index.html`（および`front-page.php`）に「わたしはルルの想い」（コンセプト・背景・願い）、「猫と暮らすということ」（メリット・デメリット）、「サービス内容」（3カード概要＋詳細ページへの誘導）、「よくある質問（上位3つ）」としてQ1〜Q3を掲載していることを確認。

5. **サービス詳細ページに料金体系（5プラン）と開始までの流れが掲載されている** → **適合**
   `service.html`／`page-service.php` の金額・内容を原文と1件ずつ突き合わせ、以下が一致することを確認：
   スタンダード15,000円/月、プレミアム25,000円/月、エクセレント45,000円/月、スポット14,000円/回、アフターサービス6,000円/回（電話30分毎）、延長料金5,000円/30分増。流れ5ステップ（電話・メールで申込→面談→ネコとの縁むすび→出迎え準備→引渡し/サービス開始）も原文と一致（意味を変えない表記調整のみ）。

6. **よくある質問ページに提供された7件のQ&Aが掲載されている** → **適合**
   `faq.html`／`page-faq.php` に Q1〜Q7 全件を掲載し、原文と1件ずつ突き合わせて意味の相違がないことを確認。作業ログに記載の2件の意図的修正を検証した結果は次の通り：
   - Q3「そんあこと」→「そんなこと」：明らかな誤字の訂正であり、意味は変わらない。適切。
   - Q7の未閉じ括弧の補完（「お客様と猫さんが心配なので...」→「…のことが心配なので……）」）：原文側で括弧が閉じられていない誤記を解消したもので、内容・ニュアンスは変えていない。適切。
   なお、上記2件以外にもA1・A2・A4・A6等で「だ体」→「です/ます」調への統一や送り仮名の調整（例：「引合せ」→「引き合わせ」、「事」→「こと」）が見られ、また `service.html` の流れ表記で原文の誤字「縁むずび」→「縁むすび」も訂正されている。いずれも意味を変えるものではなく、サイト全体の敬語・表記統一のための調整と判断できるが、作業ログの「意図的な修正」一覧にはQ3・Q7の2件しか明記されておらず、他の表記調整は個別に記録されていない。**内容の正確性という受入条件そのものは満たしているが、次回以降は表記調整も含めて作業ログに記載することを推奨する（差し戻し理由ではなく改善提案として記録）。**

7. **外部送信・本番デプロイ・実際のフォーム送信設定を行っていない** → **適合**
   `contact.html`／`page-contact.php` のフォームは `action="#" method="post"` で実送信先が設定されていない。`wordpress/functions.php` に `wp_mail()` 等の送信処理は無い。`wordpress/README.md` に「フォームの実送信・本番デプロイ・ドメイン設定は対象外」と明記され、対応が必要な旨が人間向けに案内されている。本番デプロイスクリプト・FTP/SSH設定・外部画像生成サービスへの依存は成果物一式に見当たらない。

### 総合判定
7件全て **適合**。不適合・判定不能はなし。差し戻し不要。

### 補足（観察事項・差し戻し理由ではない）
- Q3・Q7以外にも上記の軽微な表記統一・誤字訂正が存在するが、いずれも意味を変えていないため受入条件上は問題なし。今後は「意図的な修正」の作業ログをより網羅的に残すことを推奨する。
- Google Fontsを外部CDN（fonts.googleapis.com）から読み込む実装になっている。これは prohibited（外部サービスへの画像生成依頼・アップロード／本番デプロイ／フォーム実送信設定）のいずれにも該当せず受入条件上は問題ないが、実運用時にプライバシーポリシー等で外部リソース読込に触れる必要がある点は人間側の認識事項として記録する。

## 検査結果（Checker・改修後・レスポンシブ／ハンバーガーメニュー）
検査日: 2026-07-21／検査者: checker（Doerの改修作業には関与していない独立検証。ブラウザでの実操作は行わず、コードの静止解析＝タグ・要素対応・CSS構文・JSロジックの筋道で判定）
検査対象: `02_Tasks/TASK-2026-0001-watashiwa-lulu-web.md`のacceptance_criteria全8件、`03_Outputs/PROJECT-001-watashiwa-lulu/` 配下 html-preview 6ページ・css/style.css・js/nav.js、wordpress の header.php・footer.php・functions.php・style.css・js/nav.js

### 既存6件の再確認
前回（初回）検査時に既に「適合」と判定済みの1〜7件について、今回の改修でロゴ・テンプレート構成・掲載内容・外部送信有無に変更がないことを確認した（改修はナビゲーション/レスポンシブ関連のみ）。既存判定を維持する。

1. ロゴSVGとコンセプト資料 → **適合**（変更なし）
2. WordPressテンプレートPHPファイル6項目分 → **適合**（変更なし。header.php/footer.php/functions.phpへの追記はナビゲーション関連のみで、テンプレート階層自体は不変）
3. 静的HTML6項目分（CSS適用済み） → **適合**（変更なし。追加要素があっても既存の見た目確認可能な状態は維持）
4. トップページのコンセプト・サービス概要・FAQ上位3件 → **適合**（変更なし）
5. サービス詳細ページの料金体系（5プラン）・開始までの流れ → **適合**（変更なし）
6. よくある質問ページの7件のQ&A → **適合**（変更なし）
7. 外部送信・本番デプロイ・実フォーム送信設定なし → **適合**（変更なし。`contact.html`／`page-contact.php`のフォーム`action`、`functions.php`に送信処理なしを再確認）

### 新規条件（8件目）の検証
**8. スマートフォン幅（〜760px）でヘッダーのナビゲーションがハンバーガーメニューに切り替わり、開閉できる（html-preview・wordpress双方）** → **適合**

検証した根拠：

- **html-preview 6ページ全ての整合性**：`index.html`/`service.html`/`faq.html`/`contact.html`/`blog.html`/`blog-post.html` 全てで `<button class="nav-toggle" aria-controls="site-nav" aria-expanded="false" aria-label="メニューを開閉する">`（内部に `<span class="bar">` ×3）、`<nav class="site-nav" id="site-nav">`、`<div class="nav-backdrop"></div>`、`</body>`直前の`<script src="js/nav.js" defer></script>` が漏れなく揃っている（grepで全6ファイルを突き合わせ、コピー漏れなし）。`aria-controls="site-nav"` と `id="site-nav"` の対応も6ページ全てで正しい。各ファイルの`<html>`/`<body>`タグの対応数も確認し、閉じ忘れは見当たらない。
- **CSSの構文・整合性**（html-preview/css/style.css・wordpress/style.css、両者ほぼ同一構成）：`.nav-toggle`は既定`display:none`、`@media (max-width: 760px)`内で`display:inline-flex`に切替（＝760px以下でのみ表示）。`.site-nav`は同メディアクエリ内で`position:fixed; right:0; width:min(80vw,320px); transform:translateX(100%)`によりデスクトップ幅では通常フロー、モバイル幅では画面外に退避。`.site-nav.is-open{transform:translateX(0)}`（クラス2つでセレクタ詳細度が`.site-nav`単体より高いため、CSSの記述順に関係なく確実に上書きされる）。`.nav-backdrop`は`z-index:15`、`.site-nav`は`z-index:20`で、開いたナビがバックドロップの上に来る整合した重なり順になっている。ヘッダー自体は`position:sticky`のみでtransform等を持たないため、`position:fixed`の子要素（`.nav-backdrop`・`.site-nav`）の含有ブロックにはならず、ビューポート基準で正しく全画面に配置される。ハンバーガーアイコンの変形（`.nav-toggle[aria-expanded="true"] .bar:nth-child(n)`）は属性セレクタでJSの`aria-expanded`更新と直結しており矛盾なし。760px以下の別の`@media`ブロック（グリッド列数変更用）と競合はない。
- **`js/nav.js`のロジック**（html-preview版・wordpress版は完全に同一内容）：`toggle`クリックで`.site-nav`の`is-open`有無を見て開閉トグル、`backdrop`クリックで`closeNav()`、`.site-nav`内の全`<a>`クリックで`closeNav()`、`document`の`keydown`で`Escape`検知時に`closeNav()`、開閉時に`toggle`の`aria-expanded`属性を`true`/`false`に更新し`body`に`nav-open`クラスを付与/除去（スクロールロック用のCSSと連動）。要求された「トグルボタン開閉」「backdropクリックで閉じる」「リンククリックで閉じる」「Escキーで閉じる」「aria-expanded更新」の5点全てを実装コード上で確認した。
- **WordPress側の対応関係**：`header.php`にhtml-preview側と同一構造の`nav-toggle`ボタン・`site-nav`（`id="site-nav"`）・`nav-backdrop`を確認。`functions.php`の`lulu_enqueue_assets()`で`wp_enqueue_script('lulu-nav', .../js/nav.js', array(), ..., true)`（第4引数`true`＝`in_footer`）で登録されており、`footer.php`で`wp_footer()`が呼ばれているため、html-preview側の「`</body>`直前に`defer`スクリプト」と機能的に同等の位置・タイミングでスクリプトが出力される。`wordpress/js/nav.js`はhtml-preview側と同一内容。CSS側も`wordpress/style.css`にhtml-preview側と同一構成の`.nav-toggle`/`.site-nav`/`.nav-backdrop`/`@media (max-width:760px)`ブロックがあり、`wp_nav_menu()`が出力する`<ul>`要素も`.site-nav ul`のセレクタでモバイル時に縦積みレイアウトになる。

**判定不能としなかった理由**：実際のブラウザ・実機での目視確認（開閉アニメーションの見た目、タッチ操作感）は行っていないが、これは受入条件の文言（「ハンバーガーメニューに切り替わり、開閉できる」）がコードレベルの実装で判断可能な範囲であり、要素の対応関係・CSS構文・JSロジックのいずれにも矛盾や欠落が見当たらないため「適合」とする。

### 総合判定
既存6件＋新規1件、全8件 **適合**。不適合・判定不能はなし。差し戻し不要。status を `doing` → `checking` → `approval` に進める（Doerの改修完了報告を検査した結果、次は人間による最終承認`approval → done`待ち）。

### 補足（観察事項・差し戻し理由ではない）
- 初回検査時の補足（Google Fonts外部CDN読込・表記統一の作業ログ網羅性）は今回の改修範囲外のため再掲のみで、判定への影響なし。

# 佐渡イベントカレンダー

Astroで作る軽量なイベントカレンダーです。公開データはGitHub内のJSONファイルに置き、投稿はGoogle Apps Script（GAS）で受け取ります。掲載前には、管理者が必ず内容を確認してから公開します。

## 仕組み

```text
投稿者 → 投稿フォーム → GAS → あなたへ確認メール → 承認ボタン
  → GitHubのevents.jsonを更新 → GitHub Actions → 公開サイトへ反映
```

## ファイルの役割

- `src/data/events.json` — 公開するイベント一覧。GASが自動更新する唯一のデータファイル
- `src/data/events.ts` — イベントの項目（型）を定義し、JSONを画面へ渡すファイル
- `src/pages/index.astro` — 公開ページと投稿フォーム
- `src/config/site.ts` — GASの送信先URLを1か所だけ設定するファイル
- `gas/Code.gs` — GASに貼り付ける受付・承認・GitHub更新プログラム
- `.github/workflows/deploy.yml` — GitHub Pagesへの自動公開する設定

イベント一覧はJSONに分けています。TypeScriptの記号を自動編集するより、JSONだけを更新する方が安全だからです。画面側はこれまでどおり`events.ts`を通じてイベントを読み込みます。

## 公開までの手順

### 1. GitHubへこの一式をアップロード

リポジトリ [marugoto-japan/sado-event-calendar](https://github.com/marugoto-japan/sado-event-calendar) に、フォルダの中身をすべてアップロードします。特に `src`、`gas`、`.github`、`package.json`、`astro.config.mjs`、`tsconfig.json` が必要です。

アップロード後、GitHubで **Settings → Pages → Build and deployment → Source → GitHub Actions** を選びます。**Actions** タブで `Deploy Astro site to GitHub Pages` が緑のチェックになれば、`https://marugoto-japan.github.io/sado-event-calendar/` で公開されます。

### 2. 確認待ち用のGoogleスプレッドシートを作る

Google Driveで新しいスプレッドシートを1つ作り、名前を `佐渡イベントカレンダー 投稿確認` にします。URLの `/d/` と `/edit` の間の文字列をコピーします。これが `SPREADSHEET_ID` です。この表は公開しません。

### 3. GitHubの専用鍵を作る

GitHub右上のアイコン → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token** を開きます。

1. Repository accessは **Only select repositories** を選び、`sado-event-calendar` だけを指定します。
2. Repository permissionsの **Contents** を **Read and write** にします。
3. 有効期限を設定して作成し、表示された文字列をコピーします。

この鍵は一度しか表示されません。公開ページ・GitHubファイル・スクリーンショットには載せません。

### 4. GASを作成する

1. [Google Apps Script](https://script.google.com/) を開き、**新しいプロジェクト**を作ります。
2. 名前を `佐渡イベントカレンダー受付` にします。
3. `gas/Code.gs` の中身を、エディタの `Code.gs` に貼り付けて保存します。
4. 左の歯車 → **スクリプト プロパティを追加** を開き、次を登録します。

| 名前 | 入力する内容 |
|---|---|
| `SPREADSHEET_ID` | 手順2でコピーした文字列 |
| `ADMIN_EMAIL` | 確認メールを受け取るあなたの非公開メールアドレス |
| `GITHUB_TOKEN` | 手順3で作ったGitHubの専用鍵 |
| `GITHUB_OWNER` | `marugoto-japan` |
| `GITHUB_REPO` | `sado-event-calendar` |

5. **デプロイ → 新しいデプロイ → ウェブアプリ** を選びます。
6. 実行するユーザーは **自分**、アクセスできるユーザーは **全員** を選びます。
7. デプロイ後、表示される末尾が `/exec` のURLをコピーします。

### 5. 投稿フォームにつなぐ

GitHubの `src/config/site.ts` を開き、次の空欄に手順4のURLを貼り付けます。

```ts
export const submissionEndpoint = 'ここへ /exec のURLを貼り付ける';
```

保存後、GitHub Actionsが再実行されます。公開ページの「イベントを掲載する」欄がフォームに変わります。

### 6. 動作確認

1. 公開ページでテスト投稿をします。
2. 非公開メールアドレスに確認メールが届くことを確認します。
3. メール内のリンクを開き、**承認して公開する**を押します。
4. GitHubの `src/data/events.json` に1件追加され、Actionsが成功後に公開ページへ表示されます。

## 運用上の約束

- 投稿者のメールアドレスは、Googleスプレッドシート内だけに保存されます。公開サイト・`events.json`・GitHubには保存しません。
- 確認メールのリンクを知る人は公開操作ができるため、メールを他人へ転送しないでください。
- GitHubの専用鍵はGASのスクリプトプロパティだけに保存します。
- GASとGitHubは海外サービスです。レンタルサーバーは使いませんが、個人情報の扱いを掲載ページに明記してから本番公開してください。

## パソコン上での確認（任意）

GitHub ActionsがAstroを組み立てるため、通常はあなたのパソコンでビルドする必要はありません。Node.jsとnpmが使える環境だけ、次で確認できます。

```powershell
npm install
npm run dev
```

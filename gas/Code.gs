/*
 * 佐渡イベントカレンダー用 Google Apps Script
 *
 * 「プロジェクトの設定」→「スクリプト プロパティ」に以下を登録します。
 * SPREADSHEET_ID, ADMIN_EMAIL, GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO
 * 任意: GITHUB_BRANCH（未設定なら main）
 */

const HEADERS = ['id', 'receivedAt', 'status', 'title', 'date', 'endDate', 'time', 'venue', 'category', 'description', 'sourceUrl', 'email', 'reviewToken', 'commitUrl'];
const EVENT_JSON_PATH = 'src/data/events.json';
const ALLOWED_CATEGORIES = ['market', 'culture', 'outdoor', 'festival', 'other'];

function doGet(e) {
  const p = e.parameter || {};
  if (p.action === 'review') return reviewPage_(p);
  return HtmlService.createHtmlOutput('<p>佐渡イベントカレンダー 投稿受付</p>');
}

function doPost(e) {
  const p = e.parameter || {};
  if (p.action === 'approve') return approve_(p);
  return receiveSubmission_(p);
}

function receiveSubmission_(p) {
  if (p.website) return text_('ok'); // bot対策用の非表示欄
  const item = normalizeSubmission_(p);
  const token = Utilities.getUuid() + Utilities.getUuid();
  const sheet = getSheet_();
  sheet.appendRow([item.id, new Date(), 'pending', item.title, item.date, item.endDate, item.time, item.venue, item.category, item.description, item.sourceUrl, item.email, token, '']);

  const reviewUrl = `${ScriptApp.getService().getUrl()}?action=review&id=${encodeURIComponent(item.id)}&token=${encodeURIComponent(token)}`;
  MailApp.sendEmail({
    to: getRequiredProperty_('ADMIN_EMAIL'),
    subject: `【確認待ち】イベント掲載依頼：${item.title}`,
    body: `イベント掲載依頼が届きました。\n\nイベント名：${item.title}\n開催日：${item.date}\n会場：${item.venue}\n\n確認・承認：${reviewUrl}`
  });
  return text_('received');
}

function reviewPage_(p) {
  const row = findSubmission_(p.id, p.token);
  if (!row) return page_('確認できません', '<p>リンクが無効か、すでに処理済みです。</p>');
  const values = row.values;
  const details = [
    ['イベント名', values[3]], ['開始日', values[4]], ['終了日', values[5]], ['時間', values[6]],
    ['会場', values[7]], ['種類', values[8]], ['内容', values[9]], ['公式URL', values[10]], ['連絡先', values[11]]
  ].map(([label, value]) => `<dt>${escapeHtml_(label)}</dt><dd>${escapeHtml_(value || '—')}</dd>`).join('');
  const form = `<dl>${details}</dl><form method="post" action="${escapeHtml_(ScriptApp.getService().getUrl())}">
    <input type="hidden" name="action" value="approve"><input type="hidden" name="id" value="${escapeHtml_(p.id)}"><input type="hidden" name="token" value="${escapeHtml_(p.token)}">
    <button type="submit">承認して公開する</button></form><p>承認するとGitHubのイベント一覧が更新され、公開サイトへ反映されます。</p>`;
  return page_('イベント掲載の確認', form);
}

function approve_(p) {
  const row = findSubmission_(p.id, p.token);
  if (!row) return page_('公開できません', '<p>リンクが無効か、すでに処理済みです。</p>');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const fresh = findSubmission_(p.id, p.token);
    if (!fresh) return page_('公開できません', '<p>すでに処理済みです。</p>');
    const commitUrl = updateGithub_(fresh.values);
    fresh.range.getCell(1, 3).setValue('published');
    fresh.range.getCell(1, 14).setValue(commitUrl);
    return page_('公開しました', `<p>イベントを公開しました。</p><p><a href="${escapeHtml_(commitUrl)}">GitHubで更新履歴を見る</a></p>`);
  } catch (error) {
    return page_('公開できません', `<p>GitHubの更新に失敗しました。設定を確認してください。</p><pre>${escapeHtml_(String(error))}</pre>`);
  } finally {
    lock.releaseLock();
  }
}

function normalizeSubmission_(p) {
  const required = ['title', 'date', 'venue', 'description', 'email'];
  required.forEach((key) => { if (!String(p[key] || '').trim()) throw new Error(`${key} は必須です。`); });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date)) throw new Error('日付の形式が正しくありません。');
  const category = ALLOWED_CATEGORIES.includes(p.category) ? p.category : 'other';
  return {
    id: Utilities.getUuid(), title: limit_(p.title, 100), date: p.date, endDate: /^\d{4}-\d{2}-\d{2}$/.test(p.endDate || '') ? p.endDate : '',
    time: limit_(p.time, 80), venue: limit_(p.venue, 100), category, description: limit_(p.description, 500),
    sourceUrl: limit_(p.sourceUrl, 300), email: limit_(p.email, 200)
  };
}

function updateGithub_(values) {
  const props = PropertiesService.getScriptProperties();
  const owner = getRequiredProperty_('GITHUB_OWNER');
  const repo = getRequiredProperty_('GITHUB_REPO');
  const branch = props.getProperty('GITHUB_BRANCH') || 'main';
  const token = getRequiredProperty_('GITHUB_TOKEN');
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${EVENT_JSON_PATH}?ref=${encodeURIComponent(branch)}`;
  const options = { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }, muteHttpExceptions: true };
  const current = UrlFetchApp.fetch(url, options);
  if (current.getResponseCode() !== 200) throw new Error(`GitHub読込エラー: ${current.getResponseCode()} ${current.getContentText()}`);
  const file = JSON.parse(current.getContentText());
  const list = JSON.parse(Utilities.newBlob(Utilities.base64Decode(file.content.replace(/\n/g, ''))).getDataAsString('UTF-8'));
  const newId = list.reduce((max, event) => Math.max(max, Number(event.id) || 0), 0) + 1;
  // スプレッドシートの日付はDate型で返るため、時刻を除いた YYYY-MM-DD に統一します。
  // この形式ならAstroのカレンダーが開催日を正しく判定できます。
  const event = { id: newId, title: values[3], date: dateOnly_(values[4]), time: values[6], venue: values[7], category: values[8], description: values[9], sourceUrl: values[10] };
  const endDate = dateOnly_(values[5]);
  if (endDate) event.endDate = endDate;
  list.push(event);
  const content = Utilities.base64Encode(Utilities.newBlob(JSON.stringify(list, null, 2)).getBytes());
  const update = UrlFetchApp.fetch(url, {
    method: 'put', contentType: 'application/json', headers: options.headers, muteHttpExceptions: true,
    payload: JSON.stringify({ message: `イベントを追加: ${event.title}`, content, sha: file.sha, branch })
  });
  if (![200, 201].includes(update.getResponseCode())) throw new Error(`GitHub更新エラー: ${update.getResponseCode()} ${update.getContentText()}`);
  return JSON.parse(update.getContentText()).commit.html_url;
}

function getSheet_() {
  const ss = SpreadsheetApp.openById(getRequiredProperty_('SPREADSHEET_ID'));
  const sheet = ss.getSheetByName('submissions') || ss.insertSheet('submissions');
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
  return sheet;
}

function findSubmission_(id, token) {
  const sheet = getSheet_();
  const rows = sheet.getDataRange().getValues();
  for (let index = 1; index < rows.length; index += 1) {
    const values = rows[index];
    if (String(values[0]) === String(id) && String(values[12]) === String(token) && values[2] === 'pending') return { values, range: sheet.getRange(index + 1, 1, 1, HEADERS.length) };
  }
  return null;
}

function getRequiredProperty_(name) { const value = PropertiesService.getScriptProperties().getProperty(name); if (!value) throw new Error(`スクリプトプロパティ ${name} が未設定です。`); return value; }
function limit_(value, max) { return String(value || '').trim().slice(0, max); }
function dateOnly_(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const match = String(value).match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : '';
}
function text_(value) { return ContentService.createTextOutput(value); }
function escapeHtml_(value) { return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function page_(title, body) { return HtmlService.createHtmlOutput(`<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml_(title)}</title><style>body{max-width:680px;margin:40px auto;padding:0 20px;font-family:sans-serif;color:#183b38}dl{display:grid;grid-template-columns:130px 1fr;border-top:1px solid #ddd}dt,dd{margin:0;padding:12px;border-bottom:1px solid #ddd}dt{font-weight:bold;background:#f6f2e9}button{background:#d8644b;color:#fff;border:0;padding:13px 18px;font-weight:bold;cursor:pointer}pre{white-space:pre-wrap}</style><h1>${escapeHtml_(title)}</h1>${body}</html>`); }

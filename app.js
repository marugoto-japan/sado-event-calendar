const labels = { all: 'すべて', market: 'マーケット', culture: '文化・芸術', outdoor: '自然・体験', festival: 'お祭り', other: 'その他' };
const icons = { market: '●', culture: '◒', outdoor: '✦', festival: '✹', other: '◆' };
let events = [], active = 'all';
let displayedMonth = new Date(2026, 9, 1);
const previewEvents = [
  { id: 1, title: '佐渡（310）ヶ島フェス2026', date: '2026-10-03', time: '時間は主催者へご確認ください', venue: '会場は主催者へご確認ください', category: 'other', description: '佐渡の食や文化を楽しむイベントです。', source_url: 'https://www.visitsado.com/event/' },
  { id: 2, title: '日本フィルハーモニー交響楽団 佐渡公演2026', date: '2026-10-04', time: '時間は主催者へご確認ください', venue: '会場は主催者へご確認ください', category: 'culture', description: '佐渡市内の中高生との合同演奏を含むクラシック公演です。', source_url: 'https://www.visitsado.com/event/' },
  { id: 3, title: '鬼太鼓inにいぼ 朱鷺夕映え市', date: '2026-10-04', time: '時間は主催者へご確認ください', venue: '会場は主催者へご確認ください', category: 'culture', description: '新穂地区の鬼太鼓と夕映え市を楽しめます。', source_url: 'https://www.visitsado.com/event/' },
  { id: 4, title: 'オアシス2026秋　sea級グルメ　佐渡大会', date: '2026-10-10', end_date: '2026-10-11', time: '時間は主催者へご確認ください', venue: '会場は主催者へご確認ください', category: 'market', description: '佐渡の食材をテーマにしたグルメイベントです。', source_url: 'https://www.visitsado.com/event/' },
  { id: 5, title: '宿根木祭り', date: '2026-10-10', end_date: '2026-10-11', time: '時間は主催者へご確認ください', venue: '宿根木集落', category: 'culture', description: '大神楽舞楽や大獅子、鬼太鼓が行われる神社の例祭です。', source_url: 'https://www.visitsado.com/event/' },
  { id: 6, title: '10月 天領佐渡両津薪能 特別公演', date: '2026-10-12', time: '時間は主催者へご確認ください', venue: '椎崎諏訪神社能舞台', category: 'culture', description: '加茂湖を望む能舞台で行われる薪能です。', source_url: 'https://www.visitsado.com/event/' },
  { id: 7, title: '2026佐渡鈍翁茶会', date: '2026-10-17', end_date: '2026-10-18', time: '時間は主催者へご確認ください', venue: '佐渡奉行所跡', category: 'other', description: '佐渡奉行所跡で開かれる茶会です。', source_url: 'https://www.visitsado.com/event/' },
  { id: 8, title: '正法寺ろうそく能', date: '2026-10-18', time: '時間は主催者へご確認ください', venue: '正法寺', category: 'culture', description: 'ろうそくの明かりの中で行われる奉納能です。', source_url: 'https://www.visitsado.com/event/' },
  { id: 9, title: '相川祭り', date: '2026-10-19', time: '時間は主催者へご確認ください', venue: '善知鳥神社周辺', category: 'culture', description: '相川の総鎮守で行われる歴史ある例祭です。', source_url: 'https://www.visitsado.com/event/' }
];

function dateKey(year, month, day) { return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; }
function occursOn(event, key) { return event.date <= key && (event.end_date || event.date) >= key; }
function dateLabel(event, month) { return event.end_date ? `${Number(event.date.slice(8))}〜${Number(event.end_date.slice(8))}日` : `${Number(event.date.slice(8))}日`; }
function render() {
  const year = displayedMonth.getFullYear(), month = displayedMonth.getMonth();
  const monthEvents = events.filter(event => event.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`));
  const shown = active === 'all' ? monthEvents : monthEvents.filter(event => event.category === active);
  document.querySelector('#month-label').textContent = `${year}年 ${month + 1}月`;
  document.querySelector('#list-title').textContent = `${month + 1}月のイベント`;
  document.querySelector('#filters').innerHTML = Object.entries(labels).map(([key, label]) => `<button class="filter ${key === active ? 'selected' : ''}" data-filter="${key}">${label}</button>`).join('');
  const firstWeekday = new Date(year, month, 1).getDay(), days = new Date(year, month + 1, 0).getDate();
  const headers = ['日','月','火','水','木','金','土'].map(day => `<div class="weekday">${day}</div>`).join('');
  const blanks = Array(firstWeekday).fill('<div class="day muted"></div>').join('');
  const dates = Array.from({length: days}, (_, index) => { const day = index + 1, daily = shown.filter(event => occursOn(event, dateKey(year, month, day))); return `<div class="day"><strong>${day}</strong>${daily.map(event => `<div class="mini-event ${event.category}">${event.title}</div>`).join('')}</div>`; }).join('');
  document.querySelector('#calendar-grid').innerHTML = headers + blanks + dates;
  document.querySelector('#event-list').innerHTML = shown.sort((a,b) => a.date.localeCompare(b.date)).map(event => `<article class="event-card"><div class="date"><b>${dateLabel(event, month)}</b><span>${month + 1}月</span></div><div class="event-icon">${icons[event.category] || icons.other}</div><div><p class="tag">${labels[event.category] || labels.other}</p><h3>${event.title}</h3><p>${event.time}　${event.venue}</p><p class="description">${event.description}</p>${event.source_url ? `<a class="source-link" href="${event.source_url}" target="_blank" rel="noopener">公式情報を確認する</a>` : ''}</div></article>`).join('') || '<p class="empty">この月に登録されたイベントはまだありません。</p>';
  document.querySelectorAll('.filter').forEach(button => button.onclick = () => { active = button.dataset.filter; render(); });
}
document.querySelector('#previous-month').onclick = () => { displayedMonth.setMonth(displayedMonth.getMonth() - 1); render(); };
document.querySelector('#next-month').onclick = () => { displayedMonth.setMonth(displayedMonth.getMonth() + 1); render(); };
document.querySelector('#today').onclick = () => { displayedMonth = new Date(); displayedMonth.setDate(1); render(); };
fetch('/api/events').then(response => response.json()).then(data => { events = data; render(); }).catch(() => { events = previewEvents; render(); });
document.querySelector('#event-form').addEventListener('submit', async event => {
  event.preventDefault();
  const message = document.querySelector('#form-message');
  if (location.protocol === 'file:') { message.textContent = 'これは画面確認用のプレビューです。公開後はここからイベントを掲載できます。'; return; }
  const data = Object.fromEntries(new FormData(event.currentTarget));
  const response = await fetch('/api/submissions', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
  if (!response.ok) { message.textContent = '試用公開ではイベント掲載フォームは利用できません。公開版で管理機能を追加します。'; return; }
  const result = await response.json();
  message.textContent = result.message || '入力内容を確認してください。';
  if (response.ok) { event.currentTarget.reset(); events = await fetch('/api/events').then(r => r.json()); render(); }
});

type EventItem = {
  id: number;
  title: string;
  date: string;
  endDate?: string;
  time: string;
  venue: string;
  category: string;
  description: string;
  sourceUrl: string;
};

const labels: Record<string, string> = { all: 'すべて', market: 'マーケット', culture: '文化・芸術', outdoor: '自然・体験', festival: 'お祭り', other: 'その他' };
const icons: Record<string, string> = { market: '●', culture: '◒', outdoor: '✦', festival: '✹', other: '◆' };
const eventData = document.querySelector<HTMLScriptElement>('#event-data');
const events: EventItem[] = eventData ? JSON.parse(eventData.textContent ?? '[]') : [];
let activeCategory = 'all';
let displayedMonth = new Date(2026, 9, 1);

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// GAS経由で時刻付きのISO形式が来た場合も、日付部分だけを使います。
function dayOnly(value: string) {
  return value.slice(0, 10);
}

function occursOn(event: EventItem, key: string) {
  const start = dayOnly(event.date);
  const end = dayOnly(event.endDate ?? event.date);
  return start <= key && end >= key;
}

function eventDateLabel(event: EventItem) {
  const start = dayOnly(event.date);
  const end = event.endDate ? dayOnly(event.endDate) : '';
  return end ? `${Number(start.slice(8))}〜${Number(end.slice(8))}日` : `${Number(start.slice(8))}日`;
}

function render() {
  const year = displayedMonth.getFullYear();
  const month = displayedMonth.getMonth();
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  // 月をまたぐイベントも、その月の一覧とカレンダーに表示します。
  const monthStart = `${monthPrefix}-01`;
  const monthEnd = dateKey(year, month, new Date(year, month + 1, 0).getDate());
  const monthEvents = events.filter((event) => {
    const start = dayOnly(event.date);
    const end = dayOnly(event.endDate ?? event.date);
    return start <= monthEnd && end >= monthStart;
  });
  const shown = activeCategory === 'all' ? monthEvents : monthEvents.filter((event) => event.category === activeCategory);
  const monthLabel = document.querySelector('#month-label');
  const eventsTitle = document.querySelector('#events-title');
  const filters = document.querySelector('#filters');
  const calendarGrid = document.querySelector('#calendar-grid');
  const eventList = document.querySelector('#event-list');
  if (!monthLabel || !eventsTitle || !filters || !calendarGrid || !eventList) return;

  monthLabel.textContent = `${year}年 ${month + 1}月`;
  eventsTitle.textContent = `${month + 1}月のイベント`;
  filters.innerHTML = Object.entries(labels).map(([key, label]) => `<button class="filter ${key === activeCategory ? 'selected' : ''}" type="button" data-filter="${key}">${label}</button>`).join('');
  const firstWeekday = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const headers = ['日', '月', '火', '水', '木', '金', '土'].map((day) => `<div class="weekday">${day}</div>`).join('');
  const blanks = Array(firstWeekday).fill('<div class="day muted"></div>').join('');
  const dates = Array.from({ length: days }, (_, index) => {
    const day = index + 1;
    const daily = shown.filter((event) => occursOn(event, dateKey(year, month, day)));
    return `<div class="day"><strong>${day}</strong>${daily.map((event) => `<div class="mini-event ${event.category}">${event.title}</div>`).join('')}</div>`;
  }).join('');
  calendarGrid.innerHTML = headers + blanks + dates;
  eventList.innerHTML = shown.sort((a, b) => dayOnly(a.date).localeCompare(dayOnly(b.date))).map((event) => `
    <article class="event-card">
      <div class="date"><b>${eventDateLabel(event)}</b><span>${month + 1}月</span></div>
      <div class="event-icon">${icons[event.category] ?? icons.other}</div>
      <div><p class="tag">${labels[event.category] ?? labels.other}</p><h3>${event.title}</h3><p>${event.time}　${event.venue}</p><p class="description">${event.description}</p><a class="source-link" href="${event.sourceUrl}" target="_blank" rel="noopener">公式情報を確認する</a></div>
    </article>`).join('') || '<p class="empty">この月に登録されたイベントはまだありません。</p>';
  filters.querySelectorAll<HTMLButtonElement>('.filter').forEach((button) => {
    button.addEventListener('click', () => { activeCategory = button.dataset.filter ?? 'all'; render(); });
  });
}

document.querySelector('#previous-month')?.addEventListener('click', () => { displayedMonth.setMonth(displayedMonth.getMonth() - 1); render(); });
document.querySelector('#next-month')?.addEventListener('click', () => { displayedMonth.setMonth(displayedMonth.getMonth() + 1); render(); });
document.querySelector('#today')?.addEventListener('click', () => { displayedMonth = new Date(); displayedMonth.setDate(1); render(); });
render();

export type Category = 'market' | 'culture' | 'outdoor' | 'festival' | 'other';

export type Event = {
  id: number;
  title: string;
  date: string;
  endDate?: string;
  time: string;
  venue: string;
  category: Category;
  description: string;
  sourceUrl: string;
};

import eventData from './events.json';

// 画面側はこの型定義と events を利用します。
// 実際の一覧は events.json に分けています。GASがJSONだけを安全に更新できるためです。
export const events = eventData as Event[];

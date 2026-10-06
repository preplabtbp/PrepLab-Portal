export type WidgetId = 
  | 'clock' 
  | 'calendar' 
  | 'weather' 
  | 'notes' 
  | 'streak' 
  | 'trivia_quote' 
  | 'canteen';

export type WidgetSize = '1x' | '2x' | 'full';

export interface ClockSettings {
  mode: 'digital' | 'analog';
  timezone: 'WIT' | 'WITA' | 'WIB';
  format24h: boolean;
  showSeconds: boolean;
}

export interface StickyNotesSettings {
  color: 'amber' | 'emerald' | 'blue' | 'purple' | 'rose';
}

export interface WidgetItemConfig {
  id: WidgetId;
  size: WidgetSize;
  enabled: boolean;
  order: number;
  settings?: Record<string, any>;
}

export interface WidgetCatalogItem {
  id: WidgetId;
  title: string;
  description: string;
  category: 'Waktu & Jadwal' | 'Kenyamanan & Produktivitas' | 'Site Life';
  defaultSize: WidgetSize;
  availableSizes: WidgetSize[];
  icon: string;
}

export const DEFAULT_WIDGET_CONFIGS: WidgetItemConfig[] = [
  {
    id: 'clock',
    size: '1x',
    enabled: false,
    order: 0,
    settings: {
      mode: 'digital',
      timezone: 'WIT',
      format24h: true,
      showSeconds: true
    } as ClockSettings
  },
  {
    id: 'weather',
    size: '1x',
    enabled: false,
    order: 1
  },
  {
    id: 'calendar',
    size: '2x',
    enabled: false,
    order: 2
  },
  {
    id: 'notes',
    size: '2x',
    enabled: false,
    order: 3,
    settings: {
      color: 'amber'
    } as StickyNotesSettings
  },
  {
    id: 'streak',
    size: '1x',
    enabled: false,
    order: 4
  },
  {
    id: 'trivia_quote',
    size: '1x',
    enabled: false,
    order: 5
  },
  {
    id: 'canteen',
    size: '2x',
    enabled: false,
    order: 6
  }
];

export const WIDGET_CATALOG: WidgetCatalogItem[] = [
  {
    id: 'clock',
    title: 'Jam & Zona Waktu',
    description: 'Tampilan jam Digital atau Analog real-time dengan pilihan zona waktu WIT (Site Obi), WITA, dan WIB.',
    category: 'Waktu & Jadwal',
    defaultSize: '1x',
    availableSizes: ['1x', '2x'],
    icon: 'Clock'
  },
  {
    id: 'calendar',
    title: 'Kalender & Agenda Mini',
    description: 'Kalender bulanan interaktif, penanda hari ini, dan pencatatan memo cepat per tanggal.',
    category: 'Waktu & Jadwal',
    defaultSize: '2x',
    availableSizes: ['1x', '2x'],
    icon: 'Calendar'
  },
  {
    id: 'weather',
    title: 'Suasana & Cuaca Site',
    description: 'Informasi perkiraan cuaca Site Obi, suhu, kelembaban udara, dan pengingat hidrasi air minum.',
    category: 'Site Life',
    defaultSize: '1x',
    availableSizes: ['1x', '2x'],
    icon: 'SunMedium'
  },
  {
    id: 'notes',
    title: 'Sticky Note Pribadi',
    description: 'Papan catatan kilat untuk pengingat to-do, pesan penting, atau memo kerja pribadi.',
    category: 'Kenyamanan & Produktivitas',
    defaultSize: '2x',
    availableSizes: ['1x', '2x'],
    icon: 'StickyNote'
  },
  {
    id: 'streak',
    title: 'Gamifikasi & EXP Streak',
    description: 'Pantau keaktifan harian login portal, streak aktif, dan progress EXP menuju rank berikutnya.',
    category: 'Kenyamanan & Produktivitas',
    defaultSize: '1x',
    availableSizes: ['1x', '2x'],
    icon: 'Flame'
  },
  {
    id: 'trivia_quote',
    title: 'Sudut Santai & Trivia',
    description: 'Quotes motivasi dan wawasan trivia laboratorium unik setiap harinya untuk menyegarkan pikiran.',
    category: 'Kenyamanan & Produktivitas',
    defaultSize: '1x',
    availableSizes: ['1x', '2x', 'full'],
    icon: 'Sparkles'
  },
  {
    id: 'canteen',
    title: 'Jadwal Kantin & Mess',
    description: 'Jadwal jam sarapan, makan siang, dan makan malam di mess site serta status buka/tutup saat ini.',
    category: 'Site Life',
    defaultSize: '2x',
    availableSizes: ['1x', '2x'],
    icon: 'UtensilsCrossed'
  }
];

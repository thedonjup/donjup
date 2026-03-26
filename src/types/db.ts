export interface AptComplex {
  id: string;
  region_code: string;
  region_name: string;
  dong_name: string | null;
  apt_name: string;
  address: string | null;
  total_units: number | null;
  built_year: number | null;
  slug: string;
  parking_count: number | null;
  heating_method: string | null;
  floor_count: number | null;
  latitude: number | null;
  longitude: number | null;
  property_type: number;
  created_at: string;
  updated_at: string;
}

export interface AptTransaction {
  id: string;
  complex_id: string | null;
  region_code: string;
  region_name: string;
  apt_name: string;
  size_sqm: number;
  floor: number | null;
  trade_price: number;
  trade_date: string;
  highest_price: number | null;
  change_rate: number | null;
  is_new_high: boolean;
  is_significant_drop: boolean;
  deal_type: string | null;
  drop_level: string;
  property_type: number;
  raw_data: Record<string, unknown> | null;
  created_at: string;
}

export interface FinanceRate {
  id: string;
  rate_type: string;
  rate_value: number;
  prev_value: number | null;
  change_bp: number | null;
  base_date: string;
  source: string;
  created_at: string;
}

export interface DailyReport {
  id: string;
  report_date: string;
  title: string;
  summary: string | null;
  top_drops: unknown;
  top_highs: unknown;
  rate_summary: unknown;
  volume_summary: unknown;
  og_image_url: string | null;
  created_at: string;
}

export interface PageView {
  id: number;
  page_path: string;
  page_type: string | null;
  region_code: string | null;
  complex_id: string | null;
  view_date: string;
  view_count: number;
  created_at: string;
}

export interface ContentQueue {
  id: string;
  report_date: string;
  content_type: string;
  storage_urls: string[];
  caption: string | null;
  hashtags: string[] | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface SeedingQueue {
  id: string;
  report_date: string;
  platform: string;
  title: string;
  body: string;
  link: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface PushSubscription {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}

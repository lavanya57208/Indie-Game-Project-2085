import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface LeaderboardEntry {
  id?: string;
  player_name: string;
  score: number;
  distance: number;
  water_drops: number;
  ai_chips: number;
  completion_time: number;
  created_at?: string;
}

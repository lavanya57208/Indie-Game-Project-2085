// Core game constants for Project Aqua: 2085

export const LANES = [-2.2, 0, 2.2] as const;
export const LANE_COUNT = 3;
export const LANE_SWITCH_SPEED = 12;

export const BASE_SPEED = 16;
export const MAX_SPEED = 42;
export const SPEED_RAMP = 0.12; // per second

export const GRAVITY = 38;
export const JUMP_VELOCITY = 13;
export const SLIDE_DURATION = 0.85;

export const SEGMENT_LENGTH = 30;
export const SEGMENT_COUNT = 7;
export const TRACK_WIDTH = 7.5;

export const PLAYER_START_ENERGY = 100;
export const ENERGY_DRAIN_PER_DROP = 0; // drops restore, no passive drain outside chase
export const CHASE_ENERGY_DRAIN = 5; // per 2s
export const CHASE_ENERGY_DRAIN_INTERVAL = 2; // seconds
export const CHASE_INTERVAL = 30; // seconds between chases
export const CHASE_DURATION = 10; // seconds
export const CHASE_WARNING_TIME = 3; // seconds warning before chase

export const MAGNETIC_BOOTS_DRAIN = 15; // total during chase with boots
export const SHIELD_COOLDOWN = 60; // seconds
export const BARRIER_DURATION = 5; // seconds

export const MAP_CHANGE_INTERVAL = 90; // seconds
export const WEATHER_CHANGE_INTERVAL = 60; // seconds

export const WIN_AI_CHIPS = 70;

export const COLORS = {
  cyan: 0x00e5ff,
  blue: 0x2196f3,
  deepBlue: 0x0a1929,
  neonGreen: 0x00ff9c,
  neonPink: 0xff0080,
  neonOrange: 0xff6a00,
  water: 0x4fc3f7,
  aiChip: 0x00ff9c,
  alienRed: 0xff1744,
  alienPurple: 0x7c4dff,
  warning: 0xffc400,
  white: 0xffffff,
} as const;

export type MapType =
  | 'cyberCity'
  | 'industrialFactory'
  | 'brokenHighway'
  | 'denseForest'
  | 'snowMountains'
  | 'undergroundLab'
  | 'spaceStation';

export type WeatherType = 'sunny' | 'rain' | 'autumn' | 'snow' | 'fog' | 'thunderstorm';

export const MAP_ORDER: MapType[] = [
  'cyberCity',
  'industrialFactory',
  'brokenHighway',
  'denseForest',
  'snowMountains',
  'undergroundLab',
  'spaceStation',
];

export const WEATHER_CYCLE: WeatherType[] = [
  'sunny',
  'rain',
  'autumn',
  'snow',
  'fog',
  'thunderstorm',
];

export type GraphicsQuality = 'low' | 'medium' | 'high' | 'ultra';
export type ThemeMode = 'dark' | 'light';

export interface CharacterId {
  id: string;
  name: string;
  skill: string;
  description: string;
  color: number;
  accentColor: number;
  ability: 'speed' | 'dash' | 'doubleJump' | 'ghost' | 'shield' | 'slowTime' | 'extraWater' | 'wallRun';
}

export const CHARACTERS: CharacterId[] = [
  { id: 'blaze', name: 'Blaze', skill: 'Speed Boost', description: 'A fiery runner from the neon districts. Increased base movement speed.', color: 0xff6a00, accentColor: 0xffd600, ability: 'speed' },
  { id: 'volt', name: 'Volt', skill: 'Energy Dash', description: 'Electrically charged survivor. Dash forward to break through obstacles.', color: 0x00e5ff, accentColor: 0x18ffff, ability: 'dash' },
  { id: 'frost', name: 'Frost', skill: 'Double Jump', description: 'Ice-powered rebel. Can jump a second time mid-air.', color: 0x80d8ff, accentColor: 0xe1f5fe, ability: 'doubleJump' },
  { id: 'shadow', name: 'Shadow', skill: 'Ghost Mode', description: 'Stealth operative. Phase through one obstacle every 20 seconds.', color: 0x7c4dff, accentColor: 0xb388ff, ability: 'ghost' },
  { id: 'nova', name: 'Nova', skill: 'Energy Shield', description: 'Guardian class. Starts with an extra energy shield charge.', color: 0xff0080, accentColor: 0xff80ab, ability: 'shield' },
  { id: 'luna', name: 'Luna', skill: 'Slow Time', description: 'Time manipulator. Briefly slow down the world on demand.', color: 0x9c27b0, accentColor: 0xce93d8, ability: 'slowTime' },
  { id: 'aqua', name: 'Aqua', skill: 'Extra Water Collection', description: 'Water specialist. Water Drops restore 50% more energy.', color: 0x4fc3f7, accentColor: 0x81d4fa, ability: 'extraWater' },
  { id: 'phantom', name: 'Phantom', skill: 'Wall Run', description: 'Acrobatic runner. Can run along walls to bypass ground hazards.', color: 0x00ff9c, accentColor: 0x69f0ae, ability: 'wallRun' },
];

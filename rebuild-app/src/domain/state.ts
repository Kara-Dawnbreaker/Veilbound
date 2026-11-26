export type AppScreen = 'main-menu' | 'sanctuary' | 'bestiary';

export interface GameSettings {
  musicVolume: number;
  effectsVolume: number;
  reducedMotion: boolean;
}

export interface PlayerProfile {
  soulShards: number;
  unlockedHeroIds: string[];
  discoveredEntries: string[];
}

export interface AppState {
  screen: AppScreen;
  settings: GameSettings;
  profile: PlayerProfile;
}

export type AppAction =
  | { type: 'screen/changed'; screen: AppScreen }
  | { type: 'settings/updated'; patch: Partial<GameSettings> }
  | { type: 'profile/replaced'; profile: PlayerProfile };

export const DEFAULT_SETTINGS: GameSettings = {
  musicVolume: 0.7,
  effectsVolume: 0.8,
  reducedMotion: false
};

export const DEFAULT_PROFILE: PlayerProfile = {
  soulShards: 0,
  unlockedHeroIds: ['vaelen'],
  discoveredEntries: []
};

export const createInitialState = (): AppState => ({
  screen: 'main-menu',
  settings: { ...DEFAULT_SETTINGS },
  profile: {
    ...DEFAULT_PROFILE,
    unlockedHeroIds: [...DEFAULT_PROFILE.unlockedHeroIds],
    discoveredEntries: []
  }
});

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'screen/changed':
      return { ...state, screen: action.screen };
    case 'settings/updated':
      return {
        ...state,
        settings: { ...state.settings, ...action.patch }
      };
    case 'profile/replaced':
      return { ...state, profile: action.profile };
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

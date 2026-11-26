import type { CombatState, GameSettings, HeroAuraStyle } from '../types/game';

export interface BattleSceneInitPayload {
  regionId: string;
  characterId: string;
  auraStyle?: HeroAuraStyle;
  combatState: CombatState;
  settings: GameSettings;
}

export interface BattleDiagnostics {
  status: 'booting' | 'ready' | 'error';
  renderer?: 'WebGL' | 'Canvas';
  width: number;
  height: number;
  backdropLoaded: boolean;
  entityCount: number;
  warnings: string[];
  error?: string;
}

type BridgeListeners = {
  syncState: (state: CombatState, settings: GameSettings) => void;
  enemyClicked: (enemyUid: string) => void;
  diagnostics: (diag: BattleDiagnostics) => void;
};

class PhaserBridge {
  private syncListeners = new Set<BridgeListeners['syncState']>();
  private enemyClickListeners = new Set<BridgeListeners['enemyClicked']>();
  private diagnosticListeners = new Set<BridgeListeners['diagnostics']>();
  private latestPayload: BattleSceneInitPayload | null = null;
  private latestDiagnostics: BattleDiagnostics | null = null;

  setInitialPayload(payload: BattleSceneInitPayload): void {
    this.latestPayload = payload;
  }

  getInitialPayload(): BattleSceneInitPayload | null {
    return this.latestPayload;
  }

  onSyncState(fn: BridgeListeners['syncState']): () => void {
    this.syncListeners.add(fn);
    return () => this.syncListeners.delete(fn);
  }

  clearSyncListeners(): void {
    this.syncListeners.clear();
  }

  emitSyncState(state: CombatState, settings: GameSettings): void {
    if (this.latestPayload) {
      this.latestPayload = {
        ...this.latestPayload,
        combatState: state,
        settings,
      };
    }
    this.syncListeners.forEach((fn) => fn(state, settings));
  }

  onEnemyClicked(fn: BridgeListeners['enemyClicked']): () => void {
    this.enemyClickListeners.add(fn);
    return () => this.enemyClickListeners.delete(fn);
  }

  emitEnemyClicked(enemyUid: string): void {
    this.enemyClickListeners.forEach((fn) => fn(enemyUid));
  }

  onDiagnostics(fn: BridgeListeners['diagnostics']): () => void {
    this.diagnosticListeners.add(fn);
    if (this.latestDiagnostics) {
      fn(this.latestDiagnostics);
    }
    return () => this.diagnosticListeners.delete(fn);
  }

  emitDiagnostics(diag: BattleDiagnostics): void {
    this.latestDiagnostics = diag;
    this.diagnosticListeners.forEach((fn) => fn(diag));
  }

  clearDiagnostics(): void {
    this.latestDiagnostics = null;
  }
}

export const phaserBridge = new PhaserBridge();

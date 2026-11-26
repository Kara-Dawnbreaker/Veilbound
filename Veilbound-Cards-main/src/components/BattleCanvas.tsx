import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { BattleScene } from '../game/BattleScene';
import { type BattleDiagnostics, phaserBridge } from '../game/PhaserBridge';
import type { CombatState, GameSettings, HeroAuraStyle } from '../types/game';

interface BattleCanvasProps {
  regionId: string;
  characterId: string;
  auraStyle?: HeroAuraStyle;
  combatState: CombatState;
  settings: GameSettings;
  onSelectEnemy: (enemyUid: string) => void;
}

export function BattleCanvas({
  regionId,
  characterId,
  auraStyle = 'default',
  combatState,
  settings,
  onSelectEnemy,
}: BattleCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [diagnostics, setDiagnostics] = useState<BattleDiagnostics | null>(null);
  const [bootFailure, setBootFailure] = useState<string | null>(null);

  useEffect(() => {
    const unsub = phaserBridge.onEnemyClicked((uid) => {
      onSelectEnemy(uid);
    });
    return () => {
      unsub();
    };
  }, [onSelectEnemy]);

  useEffect(() => {
    const unsub = phaserBridge.onDiagnostics((diag) => {
      setDiagnostics(diag);
      if (diag.status === 'error' && diag.error) {
        setBootFailure(diag.error);
      } else if (diag.status === 'ready') {
        setBootFailure(null);
      }
    });
    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Ensure no stale Phaser instance or orphaned canvas remains before booting
    if (gameRef.current) {
      gameRef.current.destroy(true);
      gameRef.current = null;
    }
    el.innerHTML = '';
    setBootFailure(null);

    phaserBridge.clearDiagnostics();
    phaserBridge.setInitialPayload({
      regionId,
      characterId,
      auraStyle,
      combatState,
      settings,
    });

    const initialW = Math.max(320, el.clientWidth || 960);
    const initialH = Math.max(220, el.clientHeight || 380);

    let game: Phaser.Game;
    try {
      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: el,
        width: initialW,
        height: initialH,
        backgroundColor: '#0B0C10',
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        scene: [BattleScene],
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to initialize Phaser rendering context.';
      console.error('[BattleCanvas] Phaser boot failed:', err);
      setBootFailure(message);
      return;
    }

    gameRef.current = game;

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      const message = 'Graphics context lost while rendering the battlefield.';
      console.error(`[BattleCanvas] ${message}`);
      setBootFailure(message);
    };

    const attachCanvasHandlers = () => {
      const canvas = game.canvas;
      if (!canvas) return;
      canvas.style.display = 'block';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.addEventListener('webglcontextlost', handleContextLost);
    };

    if (game.canvas) {
      attachCanvasHandlers();
    } else {
      game.events.once(Phaser.Core.Events.READY, attachCanvasHandlers);
    }

    // Watch container layout changes so Phaser Scale.RESIZE always tracks responsive sizes
    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry || !gameRef.current) return;
            const w = Math.floor(entry.contentRect.width);
            const h = Math.floor(entry.contentRect.height);
            if (w > 0 && h > 0 && gameRef.current.scale) {
              gameRef.current.scale.setParentSize(w, h);
            }
          })
        : null;
    resizeObserver?.observe(el);

    // Watchdog in case scene fails silently to reach ready within a reasonable timeout
    const watchdogId = window.setTimeout(() => {
      if (!gameRef.current) return;
      const canvas = gameRef.current.canvas;
      const activeW = canvas?.width ?? 0;
      const activeH = canvas?.height ?? 0;
      const scene = gameRef.current.scene?.getScene('BattleScene') as
        | { sys?: { settings?: { status?: number } } }
        | undefined;
      const status = scene?.sys?.settings?.status;
      if (!canvas || activeW <= 0 || activeH <= 0 || status !== Phaser.Scenes.RUNNING) {
        const message = `Battlefield failed to start cleanly (canvas ${activeW}x${activeH}, scene status ${status ?? 'missing'}).`;
        console.error(`[BattleCanvas] ${message}`);
        setBootFailure(message);
      }
    }, 3500);

    const handleVisibility = () => {
      const scene = gameRef.current?.scene?.getScene('BattleScene');
      if (!scene) return;
      if (document.hidden) {
        scene.scene.pause();
      } else {
        scene.scene.resume();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.clearTimeout(watchdogId);
      resizeObserver?.disconnect();
      if (game.canvas) {
        game.canvas.removeEventListener('webglcontextlost', handleContextLost);
      }
      gameRef.current = null;
      phaserBridge.clearSyncListeners();
      phaserBridge.clearDiagnostics();
      game.destroy(true);
      el.innerHTML = '';
    };
    // Only recreate Phaser instance when region/character changes (new encounter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionId, characterId]);

  useEffect(() => {
    if (!gameRef.current) return;
    phaserBridge.emitSyncState(combatState, settings);
  }, [combatState, settings]);

  return (
    <div className="relative w-full h-[215px] sm:h-[300px] lg:h-[370px] rounded-lg overflow-hidden border border-[#232734] bg-[#0B0C10] touch-manipulation">
      <div
        ref={containerRef}
        className="w-full h-full"
        aria-label="2D Combat Battlefield"
      />
      {bootFailure && (
        <div
          role="alert"
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#0B0C10]/95 px-6 text-center"
        >
          <div className="font-display text-sm font-semibold text-rose-300">
            Battlefield Renderer Error
          </div>
          <p className="text-xs text-[#CFCBC0] max-w-md">{bootFailure}</p>
          {diagnostics && (
            <p className="font-mono-tabular text-[11px] text-[#8E94A6]">
              Renderer: {diagnostics.renderer ?? 'unknown'} · Size: {diagnostics.width}×
              {diagnostics.height} · Entities: {diagnostics.entityCount}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

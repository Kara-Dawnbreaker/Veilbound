import Phaser from 'phaser';
import { getRegionBackdropUrl } from '../assets/imageUrls';
import { getEnemyDef } from '../data/enemies';
import { getRegionDef } from '../data/regions';
import { COMBAT_TIMING, getCombatSpeedMultiplier } from '../engine/combatTiming';
import type {
  ActiveCompanion,
  CardAnimationStyle,
  CombatEnemy,
  CombatState,
  CombatVisualEvent,
  GameSettings,
  HeroAuraStyle,
  StatusId,
} from '../types/game';
import {
  type ArticulatedRigParts,
  createCompanionRigParts,
  createEnemyRigParts,
  createPlayerRigParts,
} from './CharacterRenderer';
import { phaserBridge } from './PhaserBridge';

interface EntityRig {
  container: Phaser.GameObjects.Container;
  bodyGroup: Phaser.GameObjects.Container;
  parts: ArticulatedRigParts;
  shadow: Phaser.GameObjects.Ellipse;
  targetRing?: Phaser.GameObjects.Ellipse;
  aura?: Phaser.GameObjects.Arc;
  statusRing?: Phaser.GameObjects.Ellipse;
  shieldAura?: Phaser.GameObjects.Arc;
  prepRing?: Phaser.GameObjects.Ellipse;
  positionTag?: Phaser.GameObjects.Text;
  position?: 'frontline' | 'backline';
  guardsBackline?: boolean;
  baseX: number;
  baseY: number;
  baseWeaponAngle: number;
  baseOffhandAngle: number;
  idleTweens: Phaser.Tweens.Tween[];
  phase?: number;
  defId?: string;
}

export class BattleScene extends Phaser.Scene {
  private regionId = 'ashen_marches';
  private characterId = 'vaelen';
  private auraStyle: HeroAuraStyle = 'default';
  private settings: GameSettings = {
    masterVolume: 0.75,
    sfxVolume: 0.85,
    musicVolume: 0.45,
    ambientVolume: 0.45,
    muted: false,
    combatSpeed: 'normal',
    graphicsQuality: 'balanced',
    fastAnimations: false,
    reducedMotion: false,
    confirmEndTurn: false,
  };

  private bgImage?: Phaser.GameObjects.Image;
  private bgFallback?: Phaser.GameObjects.Graphics;
  private scrimOverlay?: Phaser.GameObjects.Rectangle;
  private ambientParticles: { obj: Phaser.GameObjects.Arc; vx: number; vy: number; alphaBase: number }[] = [];

  private playerRig?: EntityRig;
  private companionRigs = new Map<string, EntityRig>();
  private enemyRigs = new Map<string, EntityRig>();
  private unsubSync?: () => void;
  private currentState?: CombatState;
  private processedEventIds = new Set<string>();
  private activeTimers: Phaser.Time.TimerEvent[] = [];
  private isTornDown = false;
  private diagnosticWarnings: string[] = [];

  constructor() {
    super({ key: 'BattleScene' });
  }

  private isSceneUsable(): boolean {
    if (this.isTornDown || !this.sys?.displayList || !this.sys?.settings) {
      return false;
    }
    const status = this.sys.settings.status;
    return status === Phaser.Scenes.CREATING || status === Phaser.Scenes.RUNNING;
  }

  private getRendererLabel(): 'WebGL' | 'Canvas' {
    return this.game.renderer.type === Phaser.WEBGL ? 'WebGL' : 'Canvas';
  }

  preload(): void {
    this.isTornDown = false;
    this.diagnosticWarnings = [];

    const payload = phaserBridge.getInitialPayload();
    if (payload) {
      this.regionId = payload.regionId;
      this.characterId = payload.characterId;
      this.auraStyle = payload.auraStyle ?? 'default';
      this.settings = payload.settings;
      this.currentState = payload.combatState;
    }

    phaserBridge.emitDiagnostics({
      status: 'booting',
      renderer: this.getRendererLabel(),
      width: Math.round(this.scale.width),
      height: Math.round(this.scale.height),
      backdropLoaded: false,
      entityCount: 0,
      warnings: [],
    });

    const region = getRegionDef(this.regionId);
    const key = `bg_${region.id}`;
    const backdropUrl = getRegionBackdropUrl(region.id);
    console.info(`[BattleScene] preload start (${this.regionId} vs ${this.characterId})`);

    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      if (file?.key === key) {
        const msg = `Backdrop texture "${key}" failed to load (${file.src ?? backdropUrl}); using gradient fallback.`;
        this.diagnosticWarnings.push(msg);
        console.warn(`[BattleScene] ${msg}`);
      }
    });

    if (!this.textures.exists(key)) {
      this.load.image(key, backdropUrl);
    }
  }

  create(): void {
    this.isTornDown = false;
    if (!this.isSceneUsable()) {
      const msg = `BattleScene aborted create(): invalid scene state (${this.sys?.settings?.status ?? 'unknown'}).`;
      console.error(`[BattleScene] ${msg}`);
      phaserBridge.emitDiagnostics({
        status: 'error',
        renderer: this.getRendererLabel(),
        width: Math.round(this.scale.width),
        height: Math.round(this.scale.height),
        backdropLoaded: false,
        entityCount: 0,
        warnings: [...this.diagnosticWarnings],
        error: msg,
      });
      return;
    }

    // Refresh payload in case React state updated while preload() was fetching assets
    const latestPayload = phaserBridge.getInitialPayload();
    if (latestPayload) {
      this.regionId = latestPayload.regionId;
      this.characterId = latestPayload.characterId;
      this.auraStyle = latestPayload.auraStyle ?? 'default';
      this.settings = latestPayload.settings;
      this.currentState = latestPayload.combatState;
    }

    const width = Math.max(1, this.scale.width || this.game.canvas?.clientWidth || 960);
    const height = Math.max(1, this.scale.height || this.game.canvas?.clientHeight || 380);

    if (this.scale.width <= 0 || this.scale.height <= 0) {
      const msg = `Canvas reported non-positive dimensions (${this.scale.width}x${this.scale.height}); using fallback ${width}x${height}.`;
      this.diagnosticWarnings.push(msg);
      console.warn(`[BattleScene] ${msg}`);
    }

    const backdropLoaded = this.renderBackdrop(width, height);
    this.createAmbientParticles(width, height);

    if (this.currentState) {
      this.syncSceneWithState(this.currentState, this.settings);
    } else {
      const msg = 'BattleScene initialized without initial combat state.';
      this.diagnosticWarnings.push(msg);
      console.warn(`[BattleScene] ${msg}`);
    }

    this.unsubSync?.();
    this.unsubSync = phaserBridge.onSyncState((state, settings) => {
      this.syncSceneWithState(state, settings);
    });

    this.scale.on('resize', this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanupScene, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanupScene, this);

    const entityCount =
      (this.playerRig ? 1 : 0) + this.companionRigs.size + this.enemyRigs.size;

    console.info(
      `[BattleScene] ready (${this.getRendererLabel()}, ${Math.round(width)}x${Math.round(height)}, backdrop=${backdropLoaded}, entities=${entityCount}, displayList=${this.children.length})`
    );

    phaserBridge.emitDiagnostics({
      status: 'ready',
      renderer: this.getRendererLabel(),
      width: Math.round(width),
      height: Math.round(height),
      backdropLoaded,
      entityCount,
      warnings: [...this.diagnosticWarnings],
    });
  }

  private stopRigIdleTweens(rig?: EntityRig): void {
    if (!rig) return;
    for (const tw of rig.idleTweens) {
      tw.stop();
    }
    rig.idleTweens = [];
  }

  private cleanupScene(): void {
    if (this.isTornDown) return;
    this.isTornDown = true;
    console.info('[BattleScene] shutdown/cleanup');
    this.unsubSync?.();
    this.unsubSync = undefined;
    this.scale?.off('resize', this.handleResize, this);
    this.activeTimers.forEach((t) => t.remove(false));
    this.activeTimers = [];
    this.stopRigIdleTweens(this.playerRig);
    this.playerRig = undefined;
    this.companionRigs.forEach((r) => this.stopRigIdleTweens(r));
    this.companionRigs.clear();
    this.enemyRigs.forEach((r) => this.stopRigIdleTweens(r));
    this.enemyRigs.clear();
    this.processedEventIds.clear();
    this.ambientParticles = [];
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    if (!this.isSceneUsable()) return;
    const w = gameSize.width;
    const h = gameSize.height;
    if (w <= 0 || h <= 0) return;
    if (this.bgImage) {
      this.fitCoverImage(this.bgImage, w, h);
    }
    if (this.bgFallback) {
      this.drawFallbackBackdrop(this.bgFallback, w, h);
    }
    if (this.scrimOverlay) {
      this.scrimOverlay.setSize(w, h);
      this.scrimOverlay.setPosition(w / 2, h / 2);
    }
    this.repositionEntities(w, h);
  }

  private fitCoverImage(img: Phaser.GameObjects.Image, w: number, h: number): void {
    const tex = img.texture.getSourceImage() as { width: number; height: number };
    if (!tex || !tex.width || !tex.height) return;
    const scale = Math.max(w / tex.width, h / tex.height);
    img.setScale(scale);
    img.setPosition(w / 2, h / 2);
  }

  private renderBackdrop(w: number, h: number): boolean {
    const region = getRegionDef(this.regionId);
    const key = `bg_${region.id}`;

    this.bgFallback = this.add.graphics();
    this.drawFallbackBackdrop(this.bgFallback, w, h);

    let loaded = false;
    if (this.textures.exists(key) && this.textures.get(key).key !== '__MISSING') {
      this.bgImage = this.add.image(w / 2, h / 2, key);
      this.fitCoverImage(this.bgImage, w, h);
      loaded = true;
    } else if (!this.diagnosticWarnings.some((m) => m.includes(key))) {
      const msg = `Backdrop texture "${key}" unavailable; rendered fallback arena backdrop.`;
      this.diagnosticWarnings.push(msg);
      console.warn(`[BattleScene] ${msg}`);
    }

    this.scrimOverlay = this.add.rectangle(w / 2, h / 2, w, h, 0x07080c, 0.36);
    return loaded;
  }

  private drawFallbackBackdrop(g: Phaser.GameObjects.Graphics, w: number, h: number): void {
    g.clear();
    g.fillGradientStyle(0x0b0c10, 0x0b0c10, 0x161922, 0x161922, 1);
    g.fillRect(0, 0, w, h);
    g.fillStyle(0x11131a, 0.85);
    g.fillRect(0, h * 0.72, w, h * 0.28);
    g.lineStyle(1, 0x2a2e3b, 0.5);
    g.lineBetween(0, h * 0.72, w, h * 0.72);
  }

  private createAmbientParticles(w: number, h: number): void {
    const region = getRegionDef(this.regionId);
    const quality = this.settings.graphicsQuality ?? 'balanced';
    const count = this.settings.reducedMotion
      ? 6
      : quality === 'lite'
      ? 6
      : quality === 'high'
      ? 28
      : 16;
    const theme = region.ambientTheme;
    const color =
      theme === 'embers'
        ? 0xf59e0b
        : theme === 'spores'
        ? 0x4ade80
        : theme === 'drowned'
        ? 0x38bdf8
        : theme === 'wind'
        ? 0xcbd5e1
        : theme === 'catacombs'
        ? 0xa855f7
        : 0xc89b3c;

    for (let i = 0; i < count; i++) {
      const radius = Phaser.Math.FloatBetween(1.2, 3.0);
      const alphaBase = Phaser.Math.FloatBetween(0.25, 0.7);
      const dot = this.add.circle(
        Phaser.Math.Between(0, w),
        Phaser.Math.Between(0, h),
        radius,
        color,
        alphaBase
      );
      dot.setDepth(2);
      const vy =
        theme === 'embers' || theme === 'obsidian'
          ? Phaser.Math.FloatBetween(-28, -10)
          : theme === 'spores' || theme === 'catacombs'
          ? Phaser.Math.FloatBetween(-10, 8)
          : theme === 'wind'
          ? Phaser.Math.FloatBetween(-4, 6)
          : Phaser.Math.FloatBetween(10, 22);
      const vx =
        theme === 'wind'
          ? Phaser.Math.FloatBetween(24, 48)
          : Phaser.Math.FloatBetween(-12, 12);
      this.ambientParticles.push({ obj: dot, vx, vy, alphaBase });
    }
  }

  update(_time: number, delta: number): void {
    if (this.settings.reducedMotion) return;
    const { width, height } = this.scale;
    const dt = delta / 1000;
    for (const p of this.ambientParticles) {
      p.obj.x += p.vx * dt;
      p.obj.y += p.vy * dt;
      if (p.obj.y < -10) p.obj.y = height + 10;
      if (p.obj.y > height + 10) p.obj.y = -10;
      if (p.obj.x < -10) p.obj.x = width + 10;
      if (p.obj.x > width + 10) p.obj.x = -10;
    }
  }

  private getSpeedMult(): number {
    return getCombatSpeedMultiplier(this.settings);
  }

  private getViewportEntityScale(w: number): number {
    return Phaser.Math.Clamp(w / 820, 0.68, 1.06);
  }

  private getEnemyTargetPosition(
    enemy: CombatEnemy,
    enemies: CombatEnemy[],
    w: number,
    groundY: number
  ): { x: number; y: number } {
    const aliveOrAll = enemies;
    if (aliveOrAll.length <= 1) {
      return {
        x: w * (enemy.position === 'backline' ? 0.76 : 0.7),
        y: groundY,
      };
    }
    const front = aliveOrAll.filter((e) => e.position === 'frontline');
    const back = aliveOrAll.filter((e) => e.position === 'backline');
    if (front.length > 0 && back.length > 0) {
      if (enemy.position === 'frontline') {
        const idx = front.findIndex((e) => e.uid === enemy.uid);
        const offset = front.length > 1 ? (idx - (front.length - 1) / 2) * 0.06 : 0;
        return {
          x: w * (0.56 + offset),
          y: groundY + (idx % 2 === 1 ? 10 : -2),
        };
      }
      const idx = back.findIndex((e) => e.uid === enemy.uid);
      const offset = back.length > 1 ? (idx - (back.length - 1) / 2) * 0.065 : 0;
      return {
        x: w * (0.78 + offset),
        y: groundY - 8 + (idx % 2 === 1 ? 12 : 0),
      };
    }
    const idx = aliveOrAll.findIndex((e) => e.uid === enemy.uid);
    const base = enemy.position === 'backline' ? 0.64 : 0.56;
    const step = aliveOrAll.length === 2 ? 0.17 : 0.14;
    return {
      x: w * (base + idx * step),
      y: groundY + (idx % 2 === 1 ? 10 : 0),
    };
  }

  private repositionEntities(w: number, h: number): void {
    const groundY = h * 0.77;
    const vScale = this.getViewportEntityScale(w);

    if (this.playerRig) {
      const px = w * 0.19;
      this.playerRig.baseX = px;
      this.playerRig.baseY = groundY;
      this.playerRig.container.setPosition(px, groundY).setScale(vScale);
    }

    const compArr = Array.from(this.companionRigs.values());
    compArr.forEach((rig, i) => {
      const cx = w * (0.31 + i * 0.08);
      const cy = groundY - 20 - i * 16;
      rig.baseX = cx;
      rig.baseY = cy;
      rig.container.setPosition(cx, cy).setScale(vScale);
    });

    if (this.currentState) {
      this.currentState.enemies.forEach((enemy) => {
        const rig = this.enemyRigs.get(enemy.uid);
        if (!rig) return;
        const pos = this.getEnemyTargetPosition(enemy, this.currentState!.enemies, w, groundY);
        rig.baseX = pos.x;
        rig.baseY = pos.y;
        rig.container.setPosition(pos.x, pos.y).setScale(vScale);
      });
    } else {
      const enemyArr = Array.from(this.enemyRigs.values());
      const count = enemyArr.length;
      enemyArr.forEach((rig, i) => {
        const spread = count === 1 ? 0.74 : count === 2 ? 0.63 + i * 0.18 : 0.55 + i * 0.15;
        const ex = w * spread;
        const ey = groundY + (i % 2 === 1 ? 10 : 0);
        rig.baseX = ex;
        rig.baseY = ey;
        rig.container.setPosition(ex, ey).setScale(vScale);
      });
    }
  }

  private updateStatusVisuals(
    rig: EntityRig,
    statuses: Partial<Record<StatusId, number>>,
    block: number,
    isCharged = false
  ): void {
    if (rig.shieldAura) {
      rig.shieldAura.setVisible(block > 0 || (statuses.ward ?? 0) > 0);
      if ((statuses.ward ?? 0) > 0) {
        rig.shieldAura.setStrokeStyle(2, 0xc084fc, 0.58);
      } else {
        rig.shieldAura.setStrokeStyle(2, 0x38bdf8, 0.52);
      }
    }

    if (rig.statusRing) {
      let auraColor: number | null = null;
      if (isCharged) auraColor = 0xf59e0b;
      else if ((statuses.poison ?? 0) > 0) auraColor = 0x10b981;
      else if ((statuses.burn ?? 0) > 0) auraColor = 0xf97316;
      else if ((statuses.bleed ?? 0) > 0) auraColor = 0xef4444;
      else if ((statuses.thorns ?? 0) > 0 || (statuses.strength ?? 0) > 0) auraColor = 0xfbbf24;

      if (auraColor !== null) {
        rig.statusRing.setVisible(true);
        rig.statusRing.setStrokeStyle(isCharged ? 2.5 : 1.8, auraColor, isCharged ? 0.9 : 0.6);
      } else {
        rig.statusRing.setVisible(false);
      }
    }
  }

  private attachIdleMotion(rig: EntityRig, periodMs: number): void {
    if (this.settings.reducedMotion) return;
    rig.idleTweens.push(
      this.tweens.add({
        targets: rig.bodyGroup,
        y: -4.5,
        duration: periodMs,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })
    );
    if (rig.parts.weaponArm) {
      rig.idleTweens.push(
        this.tweens.add({
          targets: rig.parts.weaponArm,
          angle: rig.baseWeaponAngle + 3.5,
          duration: periodMs * 1.15,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        })
      );
    }
    if (rig.parts.backPart) {
      rig.idleTweens.push(
        this.tweens.add({
          targets: rig.parts.backPart,
          scaleX: 1.03,
          duration: periodMs * 1.25,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        })
      );
    }
  }

  private syncSceneWithState(state: CombatState, settings: GameSettings): void {
    if (!this.isSceneUsable()) return;
    this.currentState = state;
    this.settings = settings;
    const width = Math.max(1, this.scale.width || 960);
    const height = Math.max(1, this.scale.height || 380);
    const groundY = height * 0.77;
    const vScale = this.getViewportEntityScale(width);

    // 1. Ensure Player Rig exists & update auras
    if (!this.playerRig) {
      this.playerRig = this.buildPlayerRig(width * 0.19, groundY, vScale);
    }
    this.updateStatusVisuals(this.playerRig, state.playerStatuses, state.playerBlock, false);
    if (this.playerRig.aura) {
      if (state.activeStance !== 'neutral') {
        const stanceColor =
          state.activeStance === 'bulwark'
            ? 0x38bdf8
            : state.activeStance === 'wrath'
            ? 0xf97316
            : state.activeStance === 'eclipse'
            ? 0xa855f7
            : 0x10b981;
        this.playerRig.aura.setVisible(true).setFillStyle(stanceColor, 0.16);
      } else {
        this.playerRig.aura.setVisible(false);
      }
    }

    // 2. Sync Companions
    const activeCompIds = new Set(state.companions.map((c) => c.uid));
    for (const [uid, rig] of this.companionRigs.entries()) {
      if (!activeCompIds.has(uid)) {
        this.stopRigIdleTweens(rig);
        rig.container.destroy();
        this.companionRigs.delete(uid);
      }
    }
    state.companions.forEach((comp, idx) => {
      const cx = width * (0.31 + idx * 0.08);
      const cy = groundY - 20 - idx * 16;
      let rig = this.companionRigs.get(comp.uid);
      if (!rig) {
        rig = this.buildCompanionRig(comp, cx, cy, vScale);
        this.companionRigs.set(comp.uid, rig);
      } else {
        rig.baseX = cx;
        rig.baseY = cy;
        rig.container.setPosition(cx, cy).setScale(vScale);
      }
    });

    // 3. Sync Enemies
    const currentEnemyIds = new Set(state.enemies.map((e) => e.uid));
    for (const [uid, rig] of this.enemyRigs.entries()) {
      if (!currentEnemyIds.has(uid)) {
        this.stopRigIdleTweens(rig);
        rig.container.destroy();
        this.enemyRigs.delete(uid);
      }
    }

    const hasActiveGuard = state.enemies.some(
      (e) => e.hp > 0 && e.position === 'frontline' && Boolean(e.guardsBackline)
    );

    state.enemies.forEach((enemy) => {
      const { x: ex, y: ey } = this.getEnemyTargetPosition(enemy, state.enemies, width, groundY);

      let rig = this.enemyRigs.get(enemy.uid);
      if (!rig) {
        rig = this.buildEnemyRig(enemy, ex, ey, vScale);
        this.enemyRigs.set(enemy.uid, rig);
      } else {
        const moved = Math.abs(rig.baseX - ex) > 4 || Math.abs(rig.baseY - ey) > 4;
        rig.baseX = ex;
        rig.baseY = ey;
        rig.container.setScale(vScale);
        if (moved && !this.settings.reducedMotion) {
          this.tweens.add({
            targets: rig.container,
            x: ex,
            y: ey,
            duration: 240 * this.getSpeedMult(),
            ease: 'Cubic.easeOut',
          });
        } else {
          rig.container.setPosition(ex, ey);
        }
      }

      if (rig.positionTag) {
        rig.positionTag.setVisible(enemy.hp > 0);
        if (enemy.position === 'frontline') {
          rig.positionTag.setText(enemy.guardsBackline ? 'FRONT · GUARD' : 'FRONT');
          rig.positionTag.setColor(enemy.guardsBackline ? '#FBBF24' : '#CFCBC0');
        } else {
          const guarded = hasActiveGuard && (enemy.statuses.cursed_mark ?? 0) <= 0;
          rig.positionTag.setText(guarded ? 'BACK · GUARDED' : 'BACKLINE');
          rig.positionTag.setColor(guarded ? '#38BDF8' : '#A78BFA');
        }
      }

      if (rig.targetRing) {
        const isSelected = enemy.uid === state.selectedEnemyUid && enemy.hp > 0;
        rig.targetRing.setStrokeStyle(2.5, isSelected ? 0xc89b3c : 0x3b4254, isSelected ? 0.95 : 0.25);
        rig.targetRing.setVisible(enemy.hp > 0);
      }

      this.updateStatusVisuals(
        rig,
        enemy.statuses,
        enemy.block,
        Boolean(enemy.intent.isCharged && enemy.hp > 0)
      );

      if (enemy.hp <= 0 && rig.container.alpha > 0.1) {
        this.stopRigIdleTweens(rig);
        this.tweens.add({
          targets: rig.container,
          alpha: 0,
          y: rig.baseY + 22,
          scaleY: 0.72 * vScale,
          duration: 420 * this.getSpeedMult(),
          ease: 'Power2',
        });
      }

      if (enemy.phase > (rig.phase ?? 1)) {
        rig.phase = enemy.phase;
        if (rig.aura) {
          rig.aura.setFillStyle(enemy.phase >= 3 ? 0xdc2626 : 0xf59e0b, 0.3);
        }
      }
    });

    // 4. Process new visual events with timeline delays
    const speed = this.getSpeedMult();
    for (const ev of state.pendingVisualEvents) {
      if (this.processedEventIds.has(ev.id)) continue;
      this.processedEventIds.add(ev.id);
      const delay = (ev.delayMs ?? 0) * speed;
      if (delay <= 8) {
        this.executeVisualEvent(ev);
      } else {
        const timer = this.time.delayedCall(delay, () => {
          if (!this.isSceneUsable()) return;
          this.executeVisualEvent(ev);
        });
        this.activeTimers.push(timer);
      }
    }
  }

  private buildPlayerRig(x: number, y: number, vScale: number): EntityRig {
    const container = this.add.container(x, y).setDepth(10).setScale(vScale);
    const shadow = this.add.ellipse(0, 6, 92, 22, 0x000000, 0.58);
    const statusRing = this.add.ellipse(0, 6, 98, 26).setVisible(false);
    const shieldAura = this.add.circle(0, -56, 56, 0x38bdf8, 0.08).setVisible(false);
    const stanceAura = this.add.circle(0, -54, 62, 0xc89b3c, 0.14).setVisible(false);
    const cosmeticAura =
      this.auraStyle === 'ascended'
        ? this.add.ellipse(0, 6, 114, 30, 0x10b981, 0.18).setStrokeStyle(2, 0xfbbf24, 0.72)
        : this.auraStyle === 'eclipse'
        ? this.add.ellipse(0, 6, 118, 32, 0x9333ea, 0.22).setStrokeStyle(2, 0xf59e0b, 0.8)
        : undefined;
    const bodyGroup = this.add.container(0, 0);

    const parts = createPlayerRigParts(this, this.characterId);
    const partList: Phaser.GameObjects.GameObject[] = [];
    if (parts.backPart) partList.push(parts.backPart);
    if (parts.offhandArm) partList.push(parts.offhandArm);
    partList.push(parts.torso);
    if (parts.weaponArm) partList.push(parts.weaponArm);
    bodyGroup.add(partList);
    const children: Phaser.GameObjects.GameObject[] = [shadow];
    if (cosmeticAura) children.push(cosmeticAura);
    children.push(statusRing, stanceAura, shieldAura, bodyGroup);
    container.add(children);

    const rig: EntityRig = {
      container,
      bodyGroup,
      parts,
      shadow,
      aura: stanceAura,
      statusRing,
      shieldAura,
      baseX: x,
      baseY: y,
      baseWeaponAngle: parts.weaponArm?.angle ?? 0,
      baseOffhandAngle: parts.offhandArm?.angle ?? 0,
      idleTweens: [],
    };
    this.attachIdleMotion(rig, 1500);
    return rig;
  }

  private buildCompanionRig(
    comp: ActiveCompanion,
    x: number,
    y: number,
    vScale: number
  ): EntityRig {
    const container = this.add.container(x, y).setDepth(11);
    const shadow = this.add.ellipse(0, 14, 50, 13, 0x000000, 0.48);
    const bodyGroup = this.add.container(0, 0);
    const parts = createCompanionRigParts(this, comp);
    bodyGroup.add(parts.torso);
    container.add([shadow, bodyGroup]);

    container.setScale(0.2);
    this.tweens.add({
      targets: container,
      scale: vScale,
      duration: 300 * this.getSpeedMult(),
      ease: 'Back.easeOut',
    });

    const rig: EntityRig = {
      container,
      bodyGroup,
      parts,
      shadow,
      baseX: x,
      baseY: y,
      baseWeaponAngle: 0,
      baseOffhandAngle: 0,
      idleTweens: [],
    };
    this.attachIdleMotion(rig, 1100);
    return rig;
  }

  private buildEnemyRig(
    enemy: CombatEnemy,
    x: number,
    y: number,
    vScale: number
  ): EntityRig {
    const def = getEnemyDef(enemy.defId);
    const scale = def.scale ?? 1;
    const container = this.add.container(x, y).setDepth(10).setScale(vScale);
    const shadow = this.add.ellipse(0, 6, 92 * scale, 22 * scale, 0x000000, 0.6);
    const targetRing = this.add.ellipse(0, 6, 102 * scale, 28 * scale);
    targetRing.setStrokeStyle(2, 0x3b4254, 0.35);
    const prepRing = this.add.ellipse(0, 6, 116 * scale, 34 * scale).setVisible(false);
    const statusRing = this.add.ellipse(0, 6, 110 * scale, 32 * scale).setVisible(false);
    const shieldAura = this.add.circle(0, -56 * scale, 56 * scale, 0x38bdf8, 0.08).setVisible(false);

    const aura =
      def.role === 'secret_boss'
        ? this.add.circle(0, -64 * scale, 60 * scale, 0x9333ea, 0.2)
        : def.role === 'legendary'
        ? this.add.circle(0, -62 * scale, 58 * scale, 0xf59e0b, 0.16)
        : def.role === 'boss' || def.role === 'leader'
        ? this.add.circle(0, -60 * scale, 54 * scale, 0xdc2626, 0.16)
        : undefined;

    const bodyGroup = this.add.container(0, 0);
    const parts = createEnemyRigParts(this, enemy);
    const partList: Phaser.GameObjects.GameObject[] = [];
    if (parts.backPart) partList.push(parts.backPart);
    if (parts.offhandArm) partList.push(parts.offhandArm);
    partList.push(parts.torso);
    if (parts.weaponArm) partList.push(parts.weaponArm);
    bodyGroup.add(partList);

    const positionTag = this.add
      .text(0, 24, enemy.position === 'frontline' ? (enemy.guardsBackline ? 'FRONT · GUARD' : 'FRONT') : 'BACKLINE', {
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '10px',
        fontStyle: 'bold',
        color: enemy.position === 'frontline' ? (enemy.guardsBackline ? '#FBBF24' : '#CFCBC0') : '#A78BFA',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    const children: Phaser.GameObjects.GameObject[] = [
      shadow,
      targetRing,
      prepRing,
      statusRing,
      shieldAura,
    ];
    if (aura) children.push(aura);
    children.push(bodyGroup, positionTag);
    container.add(children);

    container.setSize(108 * scale, 138 * scale);
    container.setInteractive({ useHandCursor: true });
    container.on('pointerdown', () => {
      phaserBridge.emitEnemyClicked(enemy.uid);
    });

    const rig: EntityRig = {
      container,
      bodyGroup,
      parts,
      shadow,
      targetRing,
      prepRing,
      statusRing,
      shieldAura,
      aura,
      positionTag,
      position: enemy.position,
      guardsBackline: enemy.guardsBackline,
      baseX: x,
      baseY: y,
      baseWeaponAngle: parts.weaponArm?.angle ?? 0,
      baseOffhandAngle: parts.offhandArm?.angle ?? 0,
      idleTweens: [],
      phase: enemy.phase,
      defId: enemy.defId,
    };

    this.attachIdleMotion(rig, 1350 + Math.floor(Math.random() * 420));
    return rig;
  }

  private flashRigHit(rig: EntityRig, tintHex = 0xffb4b4, isCrit = false): void {
    const speed = this.getSpeedMult();
    const targets = [rig.parts.torso, rig.parts.weaponArm, rig.parts.offhandArm].filter(
      (p): p is Phaser.GameObjects.Image => Boolean(p)
    );
    targets.forEach((img) => {
      if (isCrit) {
        img.setTint(tintHex).setTintMode(Phaser.TintModes.MULTIPLY);
      } else {
        img.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
      }
    });
    const timer = this.time.delayedCall(Math.max(55, (isCrit ? 150 : 95) * speed), () => {
      targets.forEach((img) => {
        if (img.scene) img.clearTint();
      });
    });
    this.activeTimers.push(timer);
  }

  private spawnFloatingText(
    x: number,
    y: number,
    text: string,
    color = '#FFFFFF',
    size = 20,
    durationMs: number = COMBAT_TIMING.FLOATING_TEXT_DURATION_MS
  ): void {
    if (!this.isSceneUsable()) return;
    const label = this.add
      .text(x, y, text, {
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: `${size}px`,
        fontStyle: 'bold',
        color,
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(35);

    this.tweens.add({
      targets: label,
      y: y - 54,
      alpha: 0,
      duration: durationMs * this.getSpeedMult(),
      ease: 'Cubic.easeOut',
      onComplete: () => {
        if (label.scene) label.destroy();
      },
    });
  }

  private playWeaponSlash(
    x: number,
    y: number,
    style: CardAnimationStyle = 'slash',
    color = 0xf59e0b,
    isCrit = false
  ): void {
    const speed = this.getSpeedMult();
    const slash = this.add.graphics().setDepth(26);

    if (style === 'heavy_cleave') {
      slash.lineStyle(8, isCrit ? 0xfbbf24 : color, 0.95);
      slash.beginPath();
      slash.arc(x, y - 48, 54, -Math.PI * 0.85, Math.PI * 0.25, false);
      slash.strokePath();
      slash.lineStyle(3, 0xffffff, 0.95);
      slash.beginPath();
      slash.arc(x, y - 48, 46, -Math.PI * 0.8, Math.PI * 0.2, false);
      slash.strokePath();
    } else if (style === 'twin_slash') {
      slash.lineStyle(5, color, 1);
      slash.lineBetween(x - 36, y - 82, x + 36, y - 16);
      slash.lineBetween(x - 36, y - 16, x + 36, y - 82);
      slash.lineStyle(2, 0xffffff, 0.9);
      slash.lineBetween(x - 28, y - 74, x + 28, y - 22);
    } else if (style === 'pierce') {
      slash.lineStyle(6, 0xe2e8f0, 1);
      slash.lineBetween(x - 64, y - 50, x + 50, y - 50);
      slash.lineStyle(2.5, color, 1);
      slash.lineBetween(x - 76, y - 50, x + 58, y - 50);
    } else {
      slash.lineStyle(5, color, 1);
      slash.lineBetween(x - 38, y - 84, x + 38, y - 14);
      slash.lineStyle(2, 0xffffff, 0.9);
      slash.lineBetween(x - 30, y - 76, x + 30, y - 20);
    }

    this.tweens.add({
      targets: slash,
      alpha: 0,
      scaleX: isCrit ? 1.48 : 1.25,
      scaleY: isCrit ? 1.48 : 1.25,
      duration: 280 * speed,
      onComplete: () => {
        if (slash.scene) slash.destroy();
      },
    });

    if (isCrit) {
      const burst = this.add.circle(x, y - 48, 12, 0xfbbf24, 0.45).setDepth(25);
      burst.setStrokeStyle(3, 0xffffff, 0.95);
      this.tweens.add({
        targets: burst,
        scale: 3.5,
        alpha: 0,
        duration: 320 * speed,
        onComplete: () => {
          if (burst.scene) burst.destroy();
        },
      });
    }
  }

  private playProjectileAndBurst(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    style: CardAnimationStyle
  ): void {
    const speed = this.getSpeedMult();

    if (style === 'arrow_shot') {
      const arrow = this.add.graphics().setDepth(27);
      arrow.lineStyle(3, 0xbef264, 1);
      arrow.lineBetween(-16, 0, 12, 0);
      arrow.lineStyle(2, 0xfef08a, 1);
      arrow.lineBetween(4, -4, 14, 0);
      arrow.lineBetween(4, 4, 14, 0);
      arrow.setPosition(fromX, fromY - 58);

      this.tweens.add({
        targets: arrow,
        x: toX,
        y: toY - 52,
        duration: Math.max(95, COMBAT_TIMING.PLAYER_CAST_MS * 0.65 * speed),
        ease: 'Linear',
        onComplete: () => {
          if (arrow.scene) arrow.destroy();
          if (!this.isSceneUsable()) return;
          const spark = this.add.circle(toX, toY - 52, 8, 0xbef264, 0.45).setDepth(25);
          spark.setStrokeStyle(2.5, 0xfef08a, 0.95);
          this.tweens.add({
            targets: spark,
            scale: 2.6,
            alpha: 0,
            duration: 240 * speed,
            onComplete: () => {
              if (spark.scene) spark.destroy();
            },
          });
        },
      });
      return;
    }

    if (style === 'arcane_beam') {
      const beam = this.add.graphics().setDepth(27);
      beam.lineStyle(9, 0x38bdf8, 0.55);
      beam.lineBetween(fromX, fromY - 58, toX, toY - 52);
      beam.lineStyle(3.5, 0xe0f2fe, 0.95);
      beam.lineBetween(fromX, fromY - 58, toX, toY - 52);
      this.tweens.add({
        targets: beam,
        alpha: 0,
        duration: 280 * speed,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          if (beam.scene) beam.destroy();
        },
      });
      const flare = this.add.circle(toX, toY - 52, 14, 0x38bdf8, 0.4).setDepth(26);
      flare.setStrokeStyle(3, 0xfef08a, 0.95);
      this.tweens.add({
        targets: flare,
        scale: 3.1,
        alpha: 0,
        duration: 300 * speed,
        onComplete: () => {
          if (flare.scene) flare.destroy();
        },
      });
      return;
    }

    const color =
      style === 'fire_spell'
        ? 0xf97316
        : style === 'poison_spell'
        ? 0x10b981
        : style === 'curse'
        ? 0xdc2626
        : style === 'ritual'
        ? 0xc89b3c
        : 0xa855f7;

    const orb = this.add.circle(fromX, fromY - 58, 9, color, 0.95).setDepth(26);
    orb.setStrokeStyle(2.5, 0xffffff, 0.85);

    this.tweens.add({
      targets: orb,
      x: toX,
      y: toY - 54,
      duration: COMBAT_TIMING.PLAYER_CAST_MS * speed,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        if (orb.scene) orb.destroy();
        if (!this.isSceneUsable()) return;
        const ring = this.add.circle(toX, toY - 54, 12, color, 0.3).setDepth(25);
        ring.setStrokeStyle(3, color, 0.95);
        this.tweens.add({
          targets: ring,
          scale: 3.2,
          alpha: 0,
          duration: 320 * speed,
          onComplete: () => {
            if (ring.scene) ring.destroy();
          },
        });
      },
    });
  }

  private animateArticulatedSwing(rig: EntityRig, direction: 1 | -1, heavy = false): void {
    const speed = this.getSpeedMult();
    const weapon = rig.parts.weaponArm;
    if (!weapon) return;
    const baseAngle = rig.baseWeaponAngle;
    const windAngle = baseAngle - direction * (heavy ? 48 : 34);
    const strikeAngle = baseAngle + direction * (heavy ? 76 : 56);

    weapon.setAngle(windAngle);
    this.tweens.add({
      targets: weapon,
      angle: strikeAngle,
      duration: (heavy ? 185 : 135) * speed,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        if (!weapon.scene) return;
        this.tweens.add({
          targets: weapon,
          angle: baseAngle,
          duration: 210 * speed,
          ease: 'Sine.easeInOut',
        });
      },
    });
  }

  private executeVisualEvent(ev: CombatVisualEvent): void {
    if (!this.isSceneUsable()) return;
    const speed = this.getSpeedMult();

    if (ev.type === 'PLAYER_ATTACK' && this.playerRig) {
      const targetRig = ev.targetId ? this.enemyRigs.get(ev.targetId) : undefined;
      const animStyle = ev.animStyle ?? 'slash';
      const isRangedOrSpell =
        animStyle === 'arrow_shot' ||
        animStyle === 'arcane_beam' ||
        animStyle === 'fire_spell' ||
        animStyle === 'poison_spell' ||
        animStyle === 'shadow_spell' ||
        animStyle === 'ritual';

      if (isRangedOrSpell && targetRig) {
        if (this.playerRig.parts.weaponArm) {
          this.tweens.add({
            targets: this.playerRig.parts.weaponArm,
            angle: this.playerRig.baseWeaponAngle - (animStyle === 'arrow_shot' ? 12 : 28),
            y: this.playerRig.parts.weaponArm.y - 6,
            duration: 150 * speed,
            yoyo: true,
          });
        }
        this.playProjectileAndBurst(
          this.playerRig.baseX + 26,
          this.playerRig.baseY,
          targetRig.baseX,
          targetRig.baseY,
          animStyle
        );
      } else if (targetRig) {
        const dashX = this.settings.reducedMotion
          ? this.playerRig.baseX + 28
          : Math.max(this.playerRig.baseX + 54, targetRig.baseX - 102);
        this.playerRig.container.setDepth(22);
        this.tweens.add({
          targets: this.playerRig.container,
          x: dashX,
          duration: COMBAT_TIMING.PLAYER_LUNGE_MS * speed,
          yoyo: true,
          ease: 'Cubic.easeOut',
          onComplete: () => {
            if (this.playerRig?.container?.scene) {
              this.playerRig.container.setDepth(10);
              this.playerRig.container.x = this.playerRig.baseX;
            }
          },
        });
        this.animateArticulatedSwing(
          this.playerRig,
          1,
          animStyle === 'heavy_cleave' || animStyle === 'bastion_slam'
        );
        if (animStyle === 'twin_slash' && this.playerRig.parts.offhandArm) {
          this.tweens.add({
            targets: this.playerRig.parts.offhandArm,
            angle: this.playerRig.baseOffhandAngle + 65,
            duration: 130 * speed,
            yoyo: true,
          });
        }
        if (animStyle === 'bastion_slam') {
          const shock = this.add.ellipse(targetRig.baseX, targetRig.baseY + 4, 48, 16, 0x38bdf8, 0.35).setDepth(25);
          shock.setStrokeStyle(3, 0xfbbf24, 0.95);
          this.tweens.add({
            targets: shock,
            scale: 2.8,
            alpha: 0,
            duration: 320 * speed,
            onComplete: () => {
              if (shock.scene) shock.destroy();
            },
          });
        }
        const slashColor =
          animStyle === 'heavy_cleave'
            ? 0xf97316
            : animStyle === 'bastion_slam'
            ? 0x38bdf8
            : animStyle === 'pierce'
            ? 0xe2e8f0
            : 0xf59e0b;
        this.playWeaponSlash(targetRig.baseX, targetRig.baseY, animStyle, slashColor, Boolean(ev.isCrit));
      }
      if (ev.isCrit && targetRig) {
        this.spawnFloatingText(targetRig.baseX, targetRig.baseY - 134, 'CRITICAL!', '#FBBF24', 16);
      }
    }

    if (ev.type === 'HERO_ABILITY' && this.playerRig) {
      const col = ev.color ? Phaser.Display.Color.HexStringToColor(ev.color).color : 0xc89b3c;
      const burst = this.add
        .circle(this.playerRig.baseX, this.playerRig.baseY - 54, 24, col, 0.34)
        .setDepth(26);
      burst.setStrokeStyle(3.5, 0xfef08a, 0.95);
      this.tweens.add({
        targets: burst,
        scale: 3.6,
        alpha: 0,
        duration: 420 * speed,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          if (burst.scene) burst.destroy();
        },
      });
      this.tweens.add({
        targets: this.playerRig.bodyGroup,
        y: -12,
        duration: 180 * speed,
        yoyo: true,
        ease: 'Back.easeOut',
      });
      if (this.playerRig.parts.weaponArm) {
        this.animateArticulatedSwing(this.playerRig, 1, true);
      }
      if (ev.targetId && ev.targetId !== 'player') {
        const targetRig = this.enemyRigs.get(ev.targetId);
        if (targetRig) {
          this.playWeaponSlash(targetRig.baseX, targetRig.baseY, 'heavy_cleave', col, true);
        }
      }
      this.spawnFloatingText(
        this.playerRig.baseX + 18,
        this.playerRig.baseY - 134,
        ev.label ?? 'Heroic Art!',
        ev.color ?? '#FDE047',
        18,
        1250
      );
    }

    if (ev.type === 'ENEMY_PREPARE' && ev.sourceId) {
      const sourceRig = this.enemyRigs.get(ev.sourceId);
      if (sourceRig) {
        const prepColor = ev.color
          ? Phaser.Display.Color.HexStringToColor(ev.color).color
          : 0xef4444;
        if (sourceRig.prepRing) {
          sourceRig.prepRing.setVisible(true);
          sourceRig.prepRing.setStrokeStyle(3, prepColor, 0.95);
          sourceRig.prepRing.setScale(0.85);
          this.tweens.add({
            targets: sourceRig.prepRing,
            scale: 1.25,
            alpha: 0.25,
            duration: COMBAT_TIMING.ENEMY_PREPARE_MS * speed,
            yoyo: false,
            onComplete: () => {
              if (sourceRig.prepRing?.scene) {
                sourceRig.prepRing.setVisible(false).setAlpha(1).setScale(1);
              }
            },
          });
        }

        // Pull back + raise weapon arm to telegraph imminent action clearly
        const pullbackX = this.settings.reducedMotion ? sourceRig.baseX : sourceRig.baseX + 16;
        this.tweens.add({
          targets: sourceRig.container,
          x: pullbackX,
          duration: 240 * speed,
          ease: 'Sine.easeOut',
        });
        if (sourceRig.parts.weaponArm) {
          this.tweens.add({
            targets: sourceRig.parts.weaponArm,
            angle: sourceRig.baseWeaponAngle + 32,
            duration: 240 * speed,
            ease: 'Sine.easeOut',
          });
        }
        if (ev.label) {
          this.spawnFloatingText(
            sourceRig.baseX,
            sourceRig.baseY - 134,
            ev.label,
            ev.color ?? '#FBBF24',
            14,
            950
          );
        }
      }
    }

    if (ev.type === 'ENEMY_ATTACK' && ev.sourceId) {
      const sourceRig = this.enemyRigs.get(ev.sourceId);
      if (sourceRig && this.playerRig) {
        const lungeX = this.settings.reducedMotion
          ? sourceRig.baseX - 28
          : Math.min(sourceRig.baseX - 58, this.playerRig.baseX + 108);
        sourceRig.container.setDepth(21);
        this.tweens.add({
          targets: sourceRig.container,
          x: lungeX,
          duration: 210 * speed,
          yoyo: true,
          ease: 'Cubic.easeOut',
          onComplete: () => {
            if (sourceRig.container.scene) {
              sourceRig.container.setDepth(10);
              sourceRig.container.x = sourceRig.baseX;
            }
          },
        });
        this.animateArticulatedSwing(sourceRig, -1, Boolean(ev.isCrit));
        this.playWeaponSlash(
          this.playerRig.baseX,
          this.playerRig.baseY,
          ev.isCrit ? 'heavy_cleave' : 'slash',
          0xef4444,
          Boolean(ev.isCrit)
        );
      }
    }

    if (ev.type === 'SPELL_CAST' && this.playerRig) {
      const style = ev.animStyle ?? 'shadow_spell';
      const color =
        style === 'fire_spell'
          ? 0xf97316
          : style === 'poison_spell'
          ? 0x10b981
          : style === 'curse'
          ? 0xdc2626
          : style === 'ritual'
          ? 0xc89b3c
          : 0xa855f7;

      if (this.playerRig.parts.weaponArm) {
        this.tweens.add({
          targets: this.playerRig.parts.weaponArm,
          angle: this.playerRig.baseWeaponAngle - 24,
          duration: 180 * speed,
          yoyo: true,
        });
      }

      const castRing = this.add
        .circle(this.playerRig.baseX, this.playerRig.baseY - 48, 16, color, 0.24)
        .setDepth(24);
      castRing.setStrokeStyle(2.5, color, 0.95);
      this.tweens.add({
        targets: castRing,
        scale: 2.5,
        alpha: 0,
        duration: 320 * speed,
        onComplete: () => {
          if (castRing.scene) castRing.destroy();
        },
      });

      if (ev.targetId && ev.targetId !== 'player') {
        const targetRig = this.enemyRigs.get(ev.targetId);
        if (targetRig) {
          this.playProjectileAndBurst(
            this.playerRig.baseX + 20,
            this.playerRig.baseY,
            targetRig.baseX,
            targetRig.baseY,
            style
          );
        }
      }
    }

    if (ev.type === 'DEFENSE_CAST' && this.playerRig) {
      const isWard = ev.animStyle === 'ward';
      const shieldColor = isWard ? 0xc084fc : 0x38bdf8;
      if (this.playerRig.parts.offhandArm) {
        this.tweens.add({
          targets: this.playerRig.parts.offhandArm,
          y: this.playerRig.parts.offhandArm.y - 10,
          x: this.playerRig.parts.offhandArm.x + 12,
          duration: 180 * speed,
          yoyo: true,
        });
      }
      const dome = this.add
        .circle(this.playerRig.baseX, this.playerRig.baseY - 54, 48, shieldColor, 0.24)
        .setDepth(24);
      dome.setStrokeStyle(3, shieldColor, 0.95);
      this.tweens.add({
        targets: dome,
        scale: 1.38,
        alpha: 0,
        duration: 380 * speed,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          if (dome.scene) dome.destroy();
        },
      });
    }

    if (ev.type === 'ALLY_SUPPORT' && ev.sourceId) {
      const sourceRig = this.enemyRigs.get(ev.sourceId);
      const color = ev.color ? Phaser.Display.Color.HexStringToColor(ev.color).color : 0x10b981;
      if (sourceRig) {
        if (sourceRig.container.x !== sourceRig.baseX) {
          this.tweens.add({
            targets: sourceRig.container,
            x: sourceRig.baseX,
            duration: 180 * speed,
          });
        }
        if (sourceRig.parts.weaponArm) {
          this.tweens.add({
            targets: sourceRig.parts.weaponArm,
            angle: sourceRig.baseWeaponAngle,
            duration: 200 * speed,
          });
        }
        const pulse = this.add
          .circle(sourceRig.baseX, sourceRig.baseY - 54, 22, color, 0.3)
          .setDepth(24);
        pulse.setStrokeStyle(2.5, color, 0.95);
        this.tweens.add({
          targets: pulse,
          scale: 3.3,
          alpha: 0,
          duration: 420 * speed,
          onComplete: () => {
            if (pulse.scene) pulse.destroy();
          },
        });
      }
    }

    if (ev.type === 'DAMAGE_TAKEN') {
      const rig =
        ev.targetId === 'player'
          ? this.playerRig
          : ev.targetId
          ? this.enemyRigs.get(ev.targetId)
          : undefined;
      if (rig) {
        this.flashRigHit(rig, ev.isCrit ? 0xfef08a : 0xffb4b4, Boolean(ev.isCrit));
        this.spawnFloatingText(
          rig.baseX + Phaser.Math.Between(-14, 14),
          rig.baseY - 104,
          `-${ev.value ?? 0}`,
          ev.color ?? '#EF4444',
          ev.isCrit ? 28 : 22
        );
        this.tweens.add({
          targets: rig.container,
          x: rig.baseX + (ev.targetId === 'player' ? -15 : 15),
          duration: 95 * speed,
          yoyo: true,
        });
        this.tweens.add({
          targets: rig.bodyGroup,
          angle: ev.targetId === 'player' ? -8 : 8,
          duration: 110 * speed,
          yoyo: true,
        });
        if (!this.settings.reducedMotion && this.settings.graphicsQuality !== 'lite') {
          this.cameras.main.shake(ev.isCrit ? 160 : 95, ev.isCrit ? 0.008 : 0.004);
        }
      }
    }

    if (ev.type === 'BLOCK_GAIN') {
      const rig =
        ev.targetId === 'player'
          ? this.playerRig
          : ev.targetId
          ? this.enemyRigs.get(ev.targetId)
          : undefined;
      if (rig) {
        if (rig.container.x !== rig.baseX) {
          this.tweens.add({
            targets: rig.container,
            x: rig.baseX,
            duration: 180 * speed,
          });
        }
        if (rig.parts.weaponArm && rig.parts.weaponArm.angle !== rig.baseWeaponAngle) {
          this.tweens.add({
            targets: rig.parts.weaponArm,
            angle: rig.baseWeaponAngle,
            duration: 180 * speed,
          });
        }
        this.spawnFloatingText(
          rig.baseX,
          rig.baseY - 90,
          ev.label ?? `+${ev.value ?? 0} Block`,
          ev.color ?? '#38BDF8',
          15
        );
      }
    }

    if (ev.type === 'HEAL') {
      const rig =
        ev.targetId === 'player'
          ? this.playerRig
          : ev.targetId
          ? this.enemyRigs.get(ev.targetId)
          : this.playerRig;
      if (rig) {
        this.spawnFloatingText(
          rig.baseX,
          rig.baseY - 94,
          `+${ev.value ?? 0} HP`,
          '#10B981',
          18
        );
      }
    }

    if (ev.type === 'STATUS_APPLIED') {
      const rig =
        ev.targetId === 'player'
          ? this.playerRig
          : ev.targetId
          ? this.enemyRigs.get(ev.targetId)
          : undefined;
      if (rig && ev.label) {
        this.spawnFloatingText(rig.baseX, rig.baseY - 122, ev.label, '#FBBF24', 13);
      }
    }

    if (ev.type === 'COMPANION_SUMMON' && ev.targetId) {
      const rig = this.companionRigs.get(ev.targetId);
      if (rig) {
        const ring = this.add.ellipse(rig.baseX, rig.baseY + 8, 56, 16, 0xc89b3c, 0.35).setDepth(23);
        ring.setStrokeStyle(2, 0xfbbf24, 0.9);
        this.tweens.add({
          targets: ring,
          scale: 2.2,
          alpha: 0,
          duration: 420 * speed,
          onComplete: () => {
            if (ring.scene) ring.destroy();
          },
        });
      }
    }

    if (ev.type === 'COMPANION_ACT' && ev.sourceId) {
      const rig = this.companionRigs.get(ev.sourceId);
      if (rig) {
        this.tweens.add({
          targets: rig.container,
          x: rig.baseX + 34,
          y: rig.baseY - 16,
          duration: 185 * speed,
          yoyo: true,
          ease: 'Cubic.easeOut',
        });
      }
    }

    if (ev.type === 'TRAP_SET' && this.playerRig) {
      this.spawnFloatingText(this.playerRig.baseX + 36, this.playerRig.baseY - 90, `Trap: ${ev.label ?? 'Armed'}`, '#F59E0B', 14);
    }

    if (ev.type === 'TRAP_TRIGGER') {
      const targetRig = ev.targetId ? this.enemyRigs.get(ev.targetId) : undefined;
      const fxX = targetRig?.baseX ?? (this.playerRig?.baseX ?? 200) + 120;
      const fxY = targetRig?.baseY ?? this.playerRig?.baseY ?? 260;
      const burst = this.add.circle(fxX, fxY - 46, 16, 0xf59e0b, 0.35).setDepth(26);
      burst.setStrokeStyle(3, 0xfef08a, 0.95);
      this.tweens.add({
        targets: burst,
        scale: 2.8,
        alpha: 0,
        duration: 320 * speed,
        onComplete: () => {
          if (burst.scene) burst.destroy();
        },
      });
      this.spawnFloatingText(fxX, fxY - 118, `${ev.label ?? 'TRAP'}!`, '#F59E0B', 16);
    }

    if (ev.type === 'REACTION_ARMED' && this.playerRig) {
      this.spawnFloatingText(this.playerRig.baseX, this.playerRig.baseY - 108, `Counter: ${ev.label ?? 'Armed'}`, '#38BDF8', 14);
    }

    if (ev.type === 'REACTION_TRIGGER' && this.playerRig) {
      const ring = this.add.circle(this.playerRig.baseX, this.playerRig.baseY - 54, 24, 0x38bdf8, 0.3).setDepth(26);
      ring.setStrokeStyle(3, 0xbae6fd, 0.95);
      this.tweens.add({
        targets: ring,
        scale: 2.5,
        alpha: 0,
        duration: 280 * speed,
        onComplete: () => {
          if (ring.scene) ring.destroy();
        },
      });
      this.spawnFloatingText(this.playerRig.baseX, this.playerRig.baseY - 120, `${ev.label ?? 'COUNTER'}!`, '#7DD3FC', 16);
    }

    if (ev.type === 'STANCE_CHANGE' && this.playerRig) {
      const col = ev.color ? Phaser.Display.Color.HexStringToColor(ev.color).color : 0xc89b3c;
      const wave = this.add.circle(this.playerRig.baseX, this.playerRig.baseY - 54, 18, col, 0.28).setDepth(25);
      wave.setStrokeStyle(3, col, 0.95);
      this.tweens.add({
        targets: wave,
        scale: 3.1,
        alpha: 0,
        duration: 360 * speed,
        onComplete: () => {
          if (wave.scene) wave.destroy();
        },
      });
      this.spawnFloatingText(this.playerRig.baseX, this.playerRig.baseY - 124, `Stance: ${ev.label ?? ''}`, ev.color ?? '#FBBF24', 16);
    }

    if ((ev.type === 'RITUAL_SCHEDULED' || ev.type === 'RITUAL_RESOLVE') && this.playerRig) {
      const isResolve = ev.type === 'RITUAL_RESOLVE';
      const sigil = this.add.circle(this.playerRig.baseX, this.playerRig.baseY - 54, isResolve ? 26 : 16, 0xc084fc, 0.28).setDepth(25);
      sigil.setStrokeStyle(2.5, 0xe9d5ff, 0.95);
      this.tweens.add({
        targets: sigil,
        scale: isResolve ? 3.6 : 2.2,
        alpha: 0,
        duration: 420 * speed,
        onComplete: () => {
          if (sigil.scene) sigil.destroy();
        },
      });
      this.spawnFloatingText(
        this.playerRig.baseX,
        this.playerRig.baseY - 128,
        isResolve ? `Ritual: ${ev.label ?? 'Fulfilled'}!` : `Scheduled: ${ev.label ?? ''}`,
        '#E9D5FF',
        15
      );
    }

    if (ev.type === 'BOSS_PHASE') {
      const { width, height } = this.scale;
      if (!this.settings.reducedMotion && this.settings.graphicsQuality !== 'lite') {
        this.cameras.main.shake(320, 0.011);
      }
      this.spawnFloatingText(
        width / 2,
        height * 0.24,
        ev.label ?? 'PHASE SHIFT',
        '#F59E0B',
        26,
        1400
      );
    }

    if (ev.type === 'VICTORY' && this.playerRig) {
      this.stopRigIdleTweens(this.playerRig);
      this.tweens.add({
        targets: this.playerRig.bodyGroup,
        y: -14,
        duration: 280 * speed,
        yoyo: true,
        ease: 'Back.easeOut',
      });
      if (this.playerRig.parts.weaponArm) {
        this.tweens.add({
          targets: this.playerRig.parts.weaponArm,
          angle: -34,
          y: this.playerRig.parts.weaponArm.y - 10,
          duration: 320 * speed,
          ease: 'Back.easeOut',
        });
      }
    }

    if (ev.type === 'DEFEAT' && this.playerRig) {
      this.stopRigIdleTweens(this.playerRig);
      this.tweens.add({
        targets: this.playerRig.bodyGroup,
        angle: -16,
        y: 14,
        alpha: 0.72,
        duration: 460 * speed,
        ease: 'Power2',
      });
    }
  }
}

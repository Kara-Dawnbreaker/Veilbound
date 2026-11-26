/**
 * Procedural HiDPI (2x supersampled) CanvasTexture + Articulated Rig Generator.
 * Produces crisp, shaded, rim-lit, alpha-transparent body parts for all heroes,
 * companions, and enemies without external sprite-sheet overhead.
 */

import Phaser from 'phaser';
import { getCharacterDef } from '../data/characters';
import { getCompanionDef } from '../data/companions';
import { getEnemyDef } from '../data/enemies';
import type { ActiveCompanion, CombatEnemy } from '../types/game';

const SUPERSAMPLE = 2;
const INK_COLOR = '#090A0F';

export interface ArticulatedRigParts {
  backPart?: Phaser.GameObjects.Image;
  torso: Phaser.GameObjects.Image;
  weaponArm?: Phaser.GameObjects.Image;
  offhandArm?: Phaser.GameObjects.Image;
  baseScale: number;
}

function makeHiDpiTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
): string {
  if (scene.textures.exists(key)) {
    return key;
  }
  const canvasTex = scene.textures.createCanvas(
    key,
    Math.ceil(width * SUPERSAMPLE),
    Math.ceil(height * SUPERSAMPLE)
  );
  if (!canvasTex) return key;

  const ctx = canvasTex.getContext();
  ctx.save();
  ctx.scale(SUPERSAMPLE, SUPERSAMPLE);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  draw(ctx, width, height);
  ctx.restore();
  canvasTex.refresh();
  return key;
}

function fillShadedPolygon(
  ctx: CanvasRenderingContext2D,
  pts: [number, number][],
  fill: string | CanvasGradient,
  stroke = INK_COLOR,
  lineWidth = 2
): void {
  if (pts.length < 3) return;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i][0], pts[i][1]);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (lineWidth > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string | CanvasGradient,
  stroke = INK_COLOR,
  lineWidth = 2
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (lineWidth > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function drawGlowOrb(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  innerColor: string,
  outerColor: string
): void {
  const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
  grad.addColorStop(0, innerColor);
  grad.addColorStop(0.55, outerColor);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function linearGrad(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  stops: [number, string][]
): CanvasGradient {
  const g = ctx.createLinearGradient(x1, y1, x2, y2);
  for (const [offset, col] of stops) g.addColorStop(offset, col);
  return g;
}

// ============================================================================
// HERO ARTICULATED TEXTURES & RIG BUILDER
// ============================================================================
export function createPlayerRigParts(
  scene: Phaser.Scene,
  characterId: string
): ArticulatedRigParts {
  const charDef = getCharacterDef(characterId);
  const theme = charDef.spriteTheme;
  const prefix = `hero_${theme}`;

  if (theme === 'ash_knight') {
    const capeKey = makeHiDpiTexture(scene, `${prefix}_cape`, 84, 118, (ctx) => {
      const grad = linearGrad(ctx, 18, 12, 62, 112, [
        [0, '#451212'],
        [0.55, '#2A1116'],
        [1, '#140B10'],
      ]);
      fillShadedPolygon(
        ctx,
        [
          [34, 16],
          [56, 22],
          [66, 108],
          [44, 100],
          [26, 112],
          [10, 96],
          [20, 40],
        ],
        grad,
        INK_COLOR,
        2
      );
      ctx.strokeStyle = 'rgba(217, 91, 38, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(30, 26);
      ctx.quadraticCurveTo(22, 64, 18, 96);
      ctx.moveTo(42, 28);
      ctx.quadraticCurveTo(45, 68, 46, 98);
      ctx.stroke();
    });

    const torsoKey = makeHiDpiTexture(scene, `${prefix}_torso`, 96, 128, (ctx) => {
      // Greaves & boots
      const legGrad = linearGrad(ctx, 26, 78, 66, 122, [
        [0, '#4B5563'],
        [1, '#1F242E'],
      ]);
      fillRoundRect(ctx, 29, 82, 15, 38, 4, legGrad);
      fillRoundRect(ctx, 51, 82, 15, 38, 4, legGrad);
      fillShadedPolygon(ctx, [[27, 110], [45, 110], [48, 122], [26, 122]], '#2C313D');
      fillShadedPolygon(ctx, [[50, 110], [68, 110], [72, 122], [49, 122]], '#2C313D');

      // Tassets / waist belt
      fillShadedPolygon(
        ctx,
        [[28, 72], [68, 72], [73, 92], [52, 88], [44, 88], [23, 92]],
        linearGrad(ctx, 28, 72, 68, 92, [[0, '#374151'], [1, '#1A1F29']])
      );
      fillRoundRect(ctx, 28, 66, 40, 9, 3, '#7C2D12');
      fillRoundRect(ctx, 43, 65, 10, 11, 2, '#D97706');

      // Breastplate
      const chestGrad = linearGrad(ctx, 24, 30, 72, 74, [
        [0, '#6B7280'],
        [0.45, '#3F4756'],
        [1, '#1E232D'],
      ]);
      fillShadedPolygon(
        ctx,
        [[26, 32], [70, 32], [66, 68], [30, 68]],
        chestGrad
      );
      // Specular rim & chest brazier slit
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.55)';
      ctx.lineWidth = 1.6;
      ctx.strokeRect(31, 36, 34, 26);
      drawGlowOrb(ctx, 48, 48, 14, 'rgba(251, 191, 36, 0.9)', 'rgba(217, 91, 38, 0)');
      fillShadedPolygon(
        ctx,
        [[43, 40], [53, 40], [50, 56], [46, 56]],
        '#FBBF24',
        '#7C2D12',
        1.2
      );

      // Pauldrons
      const pauldronGrad = linearGrad(ctx, 14, 24, 38, 48, [
        [0, '#9CA3AF'],
        [1, '#374151'],
      ]);
      fillShadedPolygon(ctx, [[15, 36], [34, 26], [36, 44], [19, 48]], pauldronGrad);
      fillShadedPolygon(ctx, [[62, 26], [81, 36], [77, 48], [60, 44]], pauldronGrad);
      // Brass shoulder trim
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(18, 43);
      ctx.lineTo(35, 38);
      ctx.moveTo(61, 38);
      ctx.lineTo(78, 43);
      ctx.stroke();

      // Knight Helm & Horns
      const helmGrad = linearGrad(ctx, 34, 6, 62, 34, [
        [0, '#9CA3AF'],
        [0.5, '#4B5563'],
        [1, '#1F242E'],
      ]);
      fillShadedPolygon(
        ctx,
        [[36, 12], [60, 12], [63, 30], [48, 35], [33, 30]],
        helmGrad
      );
      fillShadedPolygon(ctx, [[36, 16], [28, 4], [41, 12]], '#9CA3AF');
      fillShadedPolygon(ctx, [[60, 16], [68, 4], [55, 12]], '#9CA3AF');
      // Glowing amber visor
      fillRoundRect(ctx, 41, 20, 18, 4, 2, '#111827', INK_COLOR, 1);
      drawGlowOrb(ctx, 51, 22, 8, '#FEF08A', 'rgba(245, 158, 11, 0)');
      fillRoundRect(ctx, 44, 21, 12, 2.5, 1, '#FDE047', '#B45309', 0.5);
    });

    const weaponKey = makeHiDpiTexture(scene, `${prefix}_weapon`, 64, 112, (ctx) => {
      // Greatsword held upright/angled forward
      fillRoundRect(ctx, 22, 82, 12, 16, 4, '#4B5563'); // gauntlet
      fillRoundRect(ctx, 26, 70, 5, 34, 2, '#78350F'); // hilt
      fillRoundRect(ctx, 15, 67, 27, 6, 2, '#D97706'); // crossguard
      const bladeGrad = linearGrad(ctx, 22, 6, 36, 68, [
        [0, '#F1F5F9'],
        [0.5, '#94A3B8'],
        [1, '#475569'],
      ]);
      fillShadedPolygon(ctx, [[23, 68], [34, 68], [33, 16], [28.5, 4], [24, 16]], bladeGrad);
      ctx.strokeStyle = '#F97316';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(28.5, 60);
      ctx.lineTo(28.5, 22);
      ctx.stroke();
    });

    const offhandKey = makeHiDpiTexture(scene, `${prefix}_offhand`, 48, 72, (ctx) => {
      // Scarred Citadel Kite Shield
      const shGrad = linearGrad(ctx, 6, 8, 42, 66, [
        [0, '#64748B'],
        [0.6, '#334155'],
        [1, '#1E293B'],
      ]);
      fillShadedPolygon(ctx, [[8, 10], [40, 10], [38, 42], [24, 64], [10, 42]], shGrad, '#D97706', 2.4);
      fillShadedPolygon(ctx, [[20, 22], [28, 22], [24, 48]], '#F97316', '#7C2D12', 1);
    });

    const backPart = scene.add.image(-12, -56, capeKey).setDisplaySize(84, 118);
    const torso = scene.add.image(0, -64, torsoKey).setDisplaySize(96, 128);
    const weaponArm = scene.add
      .image(20, -56, weaponKey)
      .setDisplaySize(64, 112)
      .setOrigin(0.42, 0.78);
    const offhandArm = scene.add
      .image(-18, -50, offhandKey)
      .setDisplaySize(48, 72)
      .setOrigin(0.5, 0.5);
    return { backPart, torso, weaponArm, offhandArm, baseScale: 1 };
  }

  if (theme === 'blight_alchemist') {
    const capeKey = makeHiDpiTexture(scene, `${prefix}_cape`, 86, 118, (ctx) => {
      const grad = linearGrad(ctx, 20, 12, 66, 112, [
        [0, '#0F3D38'],
        [0.6, '#132826'],
        [1, '#0A1315'],
      ]);
      fillShadedPolygon(
        ctx,
        [[30, 18], [58, 18], [72, 108], [46, 102], [28, 112], [12, 98]],
        grad,
        INK_COLOR,
        2
      );
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(22, 92);
      ctx.lineTo(66, 98);
      ctx.stroke();
    });

    const torsoKey = makeHiDpiTexture(scene, `${prefix}_torso`, 94, 128, (ctx) => {
      // Robe lower hem
      const robeGrad = linearGrad(ctx, 24, 34, 70, 122, [
        [0, '#1B3B36'],
        [0.5, '#122926'],
        [1, '#091516'],
      ]);
      fillShadedPolygon(ctx, [[30, 38], [64, 38], [72, 118], [22, 118]], robeGrad);
      // Leather potion bandolier & glowing vials
      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(31, 42);
      ctx.lineTo(64, 72);
      ctx.stroke();
      for (const [vx, vy] of [[39, 50], [47, 57], [55, 64]]) {
        fillRoundRect(ctx, vx - 3, vy - 5, 6, 10, 2, '#10B981', INK_COLOR, 1.2);
      }
      // High stitched collar
      fillShadedPolygon(ctx, [[27, 36], [42, 24], [52, 24], [67, 36], [47, 46]], '#244A44');
      // Hooded Arcanist cowl + beaked mask
      fillShadedPolygon(ctx, [[32, 32], [35, 10], [50, 4], [64, 16], [62, 33]], '#132A27');
      fillShadedPolygon(ctx, [[45, 16], [67, 24], [48, 30], [42, 24]], '#9CA3AF');
      drawGlowOrb(ctx, 51, 20, 7, '#99F6E4', 'rgba(20, 184, 166, 0)');
      ctx.fillStyle = '#5EEAD4';
      ctx.beginPath();
      ctx.arc(51, 20, 2.8, 0, Math.PI * 2);
      ctx.fill();
    });

    const weaponKey = makeHiDpiTexture(scene, `${prefix}_weapon`, 60, 120, (ctx) => {
      // Gnarled Reliquary Staff + glowing orb
      ctx.strokeStyle = INK_COLOR;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(28, 114);
      ctx.quadraticCurveTo(24, 68, 32, 26);
      ctx.stroke();
      ctx.strokeStyle = '#6B4F3A';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(28, 114);
      ctx.quadraticCurveTo(24, 68, 32, 26);
      ctx.stroke();
      // Cradle & glowing orb
      drawGlowOrb(ctx, 32, 18, 16, '#99F6E4', 'rgba(16, 185, 129, 0)');
      fillRoundRect(ctx, 25, 11, 14, 14, 7, '#10B981', '#A7F3D0', 1.8);
    });

    const offhandKey = makeHiDpiTexture(scene, `${prefix}_offhand`, 42, 48, (ctx) => {
      drawGlowOrb(ctx, 21, 27, 15, 'rgba(52, 211, 153, 0.7)', 'rgba(16, 185, 129, 0)');
      fillRoundRect(ctx, 13, 18, 16, 18, 7, '#0D9488', '#5EEAD4', 1.8);
      fillRoundRect(ctx, 17, 11, 8, 8, 2, '#94A3B8');
    });

    const backPart = scene.add.image(-8, -56, capeKey).setDisplaySize(86, 118);
    const torso = scene.add.image(0, -64, torsoKey).setDisplaySize(94, 128);
    const weaponArm = scene.add
      .image(20, -56, weaponKey)
      .setDisplaySize(60, 120)
      .setOrigin(0.45, 0.7);
    const offhandArm = scene.add
      .image(-18, -56, offhandKey)
      .setDisplaySize(42, 48)
      .setOrigin(0.5, 0.5);
    return { backPart, torso, weaponArm, offhandArm, baseScale: 1 };
  }

  if (theme === 'thornwind_ranger') {
    const capeKey = makeHiDpiTexture(scene, `${prefix}_cape`, 86, 118, (ctx) => {
      const grad = linearGrad(ctx, 16, 16, 62, 112, [
        [0, '#14532D'],
        [0.55, '#0F2E1E'],
        [1, '#091512'],
      ]);
      fillShadedPolygon(ctx, [[32, 18], [56, 20], [64, 108], [42, 98], [22, 112], [12, 92]], grad);
      // Leaf trim
      ctx.strokeStyle = 'rgba(134, 239, 172, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(22, 40);
      ctx.lineTo(18, 98);
      ctx.stroke();
    });

    const torsoKey = makeHiDpiTexture(scene, `${prefix}_torso`, 94, 128, (ctx) => {
      fillShadedPolygon(ctx, [[30, 80], [43, 80], [39, 120], [26, 120]], '#1F2937');
      fillShadedPolygon(ctx, [[51, 80], [64, 80], [68, 120], [55, 120]], '#1F2937');
      // Ranger leather tunic
      const tunicGrad = linearGrad(ctx, 28, 34, 66, 82, [[0, '#3F6212'], [0.6, '#1E3A2A'], [1, '#111F19']]);
      fillShadedPolygon(ctx, [[30, 35], [64, 35], [60, 82], [34, 82]], tunicGrad, '#84CC16', 1.4);
      // Quiver strap & leather belt
      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(33, 38);
      ctx.lineTo(60, 72);
      ctx.stroke();
      fillRoundRect(ctx, 32, 68, 30, 7, 2, '#78350F', '#D97706', 1);
      // Hood & glowing emerald eye
      fillShadedPolygon(ctx, [[31, 35], [40, 8], [54, 8], [64, 26], [58, 35]], '#14532D');
      fillShadedPolygon(ctx, [[40, 22], [58, 22], [56, 33], [42, 33]], '#0D1316');
      drawGlowOrb(ctx, 52, 21, 7, '#BEF264', 'rgba(34, 197, 94, 0)');
      ctx.fillStyle = '#BEF264';
      ctx.beginPath();
      ctx.arc(52, 21, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });

    const weaponKey = makeHiDpiTexture(scene, `${prefix}_weapon`, 64, 118, (ctx) => {
      // Recurve Longbow + drawn string
      ctx.strokeStyle = '#65A30D';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(22, 12);
      ctx.quadraticCurveTo(52, 58, 22, 106);
      ctx.stroke();
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(22, 12);
      ctx.lineTo(14, 59);
      ctx.lineTo(22, 106);
      ctx.stroke();
      // Nocked glowing arrow
      ctx.strokeStyle = '#FEF08A';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(14, 59);
      ctx.lineTo(56, 59);
      ctx.stroke();
      fillShadedPolygon(ctx, [[52, 54], [62, 59], [52, 64]], '#BEF264');
    });

    const offhandKey = makeHiDpiTexture(scene, `${prefix}_offhand`, 42, 52, (ctx) => {
      // Back quiver with fletched arrows
      fillShadedPolygon(ctx, [[12, 14], [28, 12], [24, 46], [10, 44]], '#78350F', '#D97706', 1.4);
      fillShadedPolygon(ctx, [[14, 6], [20, 6], [18, 14]], '#BEF264');
      fillShadedPolygon(ctx, [[21, 5], [27, 5], [24, 14]], '#86EFAC');
    });

    const backPart = scene.add.image(-12, -56, capeKey).setDisplaySize(86, 118);
    const torso = scene.add.image(0, -64, torsoKey).setDisplaySize(94, 128);
    const weaponArm = scene.add.image(20, -56, weaponKey).setDisplaySize(64, 118).setOrigin(0.32, 0.5);
    const offhandArm = scene.add.image(-18, -56, offhandKey).setDisplaySize(42, 52).setOrigin(0.5, 0.5);
    return { backPart, torso, weaponArm, offhandArm, baseScale: 1 };
  }

  if (theme === 'astral_arcanist') {
    const capeKey = makeHiDpiTexture(scene, `${prefix}_cape`, 92, 122, (ctx) => {
      const grad = linearGrad(ctx, 18, 14, 72, 114, [
        [0, '#1E3A8A'],
        [0.55, '#172554'],
        [1, '#090D1F'],
      ]);
      fillShadedPolygon(ctx, [[32, 18], [60, 18], [76, 110], [48, 102], [22, 112], [14, 92]], grad, '#38BDF8', 1.6);
      drawGlowOrb(ctx, 46, 52, 16, 'rgba(56, 189, 248, 0.4)', 'rgba(56, 189, 248, 0)');
    });

    const torsoKey = makeHiDpiTexture(scene, `${prefix}_torso`, 94, 128, (ctx) => {
      const robeGrad = linearGrad(ctx, 26, 36, 68, 122, [
        [0, '#1E3A8A'],
        [0.5, '#1E1B4B'],
        [1, '#090B1A'],
      ]);
      fillShadedPolygon(ctx, [[30, 38], [64, 38], [72, 118], [22, 118]], robeGrad, '#60A5FA', 1.5);
      // Gilded astral stole
      fillShadedPolygon(ctx, [[38, 38], [56, 38], [52, 112], [42, 112]], '#1E293B', '#FBBF24', 1.4);
      // Celestial crown & visor hood
      fillShadedPolygon(ctx, [[34, 34], [38, 10], [56, 10], [60, 34]], '#0F172A');
      ctx.strokeStyle = '#FDE047';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(47, 15, 11, Math.PI, Math.PI * 2);
      ctx.stroke();
      drawGlowOrb(ctx, 49, 22, 8, '#BAE6FD', 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = '#E0F2FE';
      ctx.beginPath();
      ctx.arc(49, 22, 2.8, 0, Math.PI * 2);
      ctx.fill();
    });

    const weaponKey = makeHiDpiTexture(scene, `${prefix}_weapon`, 62, 124, (ctx) => {
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(30, 116);
      ctx.lineTo(32, 24);
      ctx.stroke();
      // Astral Astrolabe rings
      ctx.strokeStyle = '#FBBF24';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(32, 20, 14, 0, Math.PI * 2);
      ctx.stroke();
      drawGlowOrb(ctx, 32, 20, 14, '#BAE6FD', 'rgba(56, 189, 248, 0)');
      fillRoundRect(ctx, 27, 15, 10, 10, 5, '#38BDF8', '#FFFFFF', 1.4);
    });

    const offhandKey = makeHiDpiTexture(scene, `${prefix}_offhand`, 44, 48, (ctx) => {
      drawGlowOrb(ctx, 22, 24, 16, '#E0F2FE', 'rgba(56, 189, 248, 0)');
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(22, 24, 12, 0, Math.PI * 2);
      ctx.stroke();
      fillRoundRect(ctx, 17, 19, 10, 10, 5, '#FDE047', '#FFFFFF', 1.2);
    });

    const backPart = scene.add.image(-10, -56, capeKey).setDisplaySize(92, 122);
    const torso = scene.add.image(0, -64, torsoKey).setDisplaySize(94, 128);
    const weaponArm = scene.add.image(20, -56, weaponKey).setDisplaySize(62, 124).setOrigin(0.48, 0.72);
    const offhandArm = scene.add.image(-18, -56, offhandKey).setDisplaySize(44, 48).setOrigin(0.5, 0.5);
    return { backPart, torso, weaponArm, offhandArm, baseScale: 1 };
  }

  if (theme === 'ironclad_guardian') {
    const capeKey = makeHiDpiTexture(scene, `${prefix}_cape`, 86, 118, (ctx) => {
      const grad = linearGrad(ctx, 18, 16, 66, 110, [[0, '#334155'], [1, '#0F172A']]);
      fillShadedPolygon(ctx, [[30, 18], [58, 22], [68, 108], [20, 108], [14, 88]], grad, '#94A3B8', 1.8);
    });

    const torsoKey = makeHiDpiTexture(scene, `${prefix}_torso`, 104, 130, (ctx) => {
      fillRoundRect(ctx, 31, 82, 16, 38, 4, '#334155');
      fillRoundRect(ctx, 56, 82, 16, 38, 4, '#334155');
      const chestGrad = linearGrad(ctx, 24, 30, 80, 80, [
        [0, '#94A3B8'],
        [0.45, '#475569'],
        [1, '#1E293B'],
      ]);
      fillShadedPolygon(ctx, [[24, 32], [80, 32], [74, 78], [30, 78]], chestGrad, '#C89B3C', 2.2);
      // Heavy fortress pauldrons
      fillShadedPolygon(ctx, [[10, 34], [34, 24], [36, 48], [14, 52]], '#64748B', '#C89B3C', 2);
      fillShadedPolygon(ctx, [[70, 24], [94, 34], [90, 52], [68, 48]], '#64748B', '#C89B3C', 2);
      // Barred bastion helm
      fillRoundRect(ctx, 37, 8, 30, 26, 6, '#475569', '#C89B3C', 2);
      fillRoundRect(ctx, 43, 18, 18, 4, 1, '#0F172A');
      drawGlowOrb(ctx, 52, 20, 7, '#BAE6FD', 'rgba(56, 189, 248, 0)');
    });

    const weaponKey = makeHiDpiTexture(scene, `${prefix}_weapon`, 66, 114, (ctx) => {
      // Bastion Warhammer
      fillRoundRect(ctx, 29, 26, 7, 82, 2, '#78350F');
      fillRoundRect(ctx, 14, 12, 36, 22, 4, linearGrad(ctx, 14, 12, 50, 34, [[0, '#CBD5E1'], [1, '#475569']]), '#C89B3C', 2);
    });

    const offhandKey = makeHiDpiTexture(scene, `${prefix}_offhand`, 56, 88, (ctx) => {
      // Massive Tower Shield
      const shGrad = linearGrad(ctx, 6, 8, 50, 80, [[0, '#64748B'], [0.6, '#334155'], [1, '#0F172A']]);
      fillShadedPolygon(ctx, [[8, 10], [48, 10], [46, 56], [28, 82], [10, 56]], shGrad, '#C89B3C', 2.6);
      fillRoundRect(ctx, 22, 26, 12, 28, 3, '#38BDF8', '#C89B3C', 1.4);
    });

    const backPart = scene.add.image(-12, -56, capeKey).setDisplaySize(86, 118);
    const torso = scene.add.image(0, -64, torsoKey).setDisplaySize(104, 130);
    const weaponArm = scene.add.image(22, -58, weaponKey).setDisplaySize(66, 114).setOrigin(0.48, 0.78);
    const offhandArm = scene.add.image(-20, -48, offhandKey).setDisplaySize(56, 88).setOrigin(0.5, 0.5);
    return { backPart, torso, weaponArm, offhandArm, baseScale: 1 };
  }

  if (theme === 'veil_conjurer') {
    const capeKey = makeHiDpiTexture(scene, `${prefix}_cape`, 88, 120, (ctx) => {
      const grad = linearGrad(ctx, 16, 14, 68, 112, [
        [0, '#581C87'],
        [0.55, '#3B0764'],
        [1, '#090612'],
      ]);
      fillShadedPolygon(ctx, [[30, 18], [58, 18], [70, 110], [44, 96], [24, 112], [14, 92]], grad, '#A855F7', 1.6);
    });

    const torsoKey = makeHiDpiTexture(scene, `${prefix}_torso`, 94, 128, (ctx) => {
      const robeGrad = linearGrad(ctx, 26, 36, 68, 120, [[0, '#3B0764'], [0.6, '#1E1035'], [1, '#0B0816']]);
      fillShadedPolygon(ctx, [[28, 38], [66, 38], [72, 118], [22, 118]], robeGrad, '#C084FC', 1.5);
      // Bone & violet ceremonial mantle
      fillShadedPolygon(ctx, [[24, 34], [47, 48], [70, 34], [58, 26], [36, 26]], '#E2E8F0', INK_COLOR, 1.6);
      // Horned Veil Mask
      fillShadedPolygon(ctx, [[36, 32], [38, 12], [56, 12], [58, 32]], '#E2E8F0');
      fillShadedPolygon(ctx, [[36, 14], [24, 4], [42, 12]], '#9333EA');
      fillShadedPolygon(ctx, [[58, 14], [70, 4], [52, 12]], '#9333EA');
      drawGlowOrb(ctx, 47, 22, 8, '#F5D0FE', 'rgba(168, 85, 247, 0)');
      ctx.fillStyle = '#E879F9';
      ctx.beginPath();
      ctx.arc(47, 22, 2.8, 0, Math.PI * 2);
      ctx.fill();
    });

    const weaponKey = makeHiDpiTexture(scene, `${prefix}_weapon`, 60, 122, (ctx) => {
      ctx.strokeStyle = '#6B21A8';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(28, 114);
      ctx.quadraticCurveTo(22, 68, 32, 24);
      ctx.stroke();
      // Hanging Soul Censer
      drawGlowOrb(ctx, 36, 38, 14, '#F0ABFC', 'rgba(168, 85, 247, 0)');
      fillShadedPolygon(ctx, [[28, 32], [44, 32], [40, 48], [32, 48]], '#C084FC', '#F5D0FE', 1.5);
    });

    const offhandKey = makeHiDpiTexture(scene, `${prefix}_offhand`, 42, 46, (ctx) => {
      // Bound Spirit Grimoire
      fillRoundRect(ctx, 10, 10, 22, 28, 3, '#3B0764', '#E879F9', 1.8);
      drawGlowOrb(ctx, 21, 24, 10, '#F5D0FE', 'rgba(168, 85, 247, 0)');
    });

    const backPart = scene.add.image(-10, -56, capeKey).setDisplaySize(88, 120);
    const torso = scene.add.image(0, -64, torsoKey).setDisplaySize(94, 128);
    const weaponArm = scene.add.image(20, -56, weaponKey).setDisplaySize(60, 122).setOrigin(0.45, 0.72);
    const offhandArm = scene.add.image(-18, -54, offhandKey).setDisplaySize(42, 46).setOrigin(0.5, 0.5);
    return { backPart, torso, weaponArm, offhandArm, baseScale: 1 };
  }

  // Default / veil_stalker (Kaelith)
  const capeKey = makeHiDpiTexture(scene, `${prefix}_cape`, 88, 116, (ctx) => {
    const grad = linearGrad(ctx, 14, 18, 66, 110, [
      [0, '#4C1D95'],
      [0.5, '#2E1065'],
      [1, '#110B22'],
    ]);
    fillShadedPolygon(ctx, [[34, 18], [58, 20], [50, 108], [28, 82], [12, 106], [18, 42]], grad);
    ctx.strokeStyle = 'rgba(192, 132, 252, 0.45)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(22, 44);
    ctx.lineTo(15, 98);
    ctx.stroke();
  });

  const torsoKey = makeHiDpiTexture(scene, `${prefix}_torso`, 92, 126, (ctx) => {
    // Boots & agile stance
    fillShadedPolygon(ctx, [[27, 80], [41, 80], [36, 120], [23, 120]], '#1F1B33');
    fillShadedPolygon(ctx, [[51, 80], [65, 80], [70, 120], [56, 120]], '#1F1B33');
    // Leather brigandine
    const bodyGrad = linearGrad(ctx, 30, 34, 62, 82, [
      [0, '#4C3D75'],
      [0.5, '#2E2545'],
      [1, '#19142B'],
    ]);
    fillShadedPolygon(ctx, [[30, 35], [62, 35], [58, 78], [34, 78]], bodyGrad);
    ctx.strokeStyle = '#C084FC';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(35, 42);
    ctx.lineTo(57, 66);
    ctx.moveTo(57, 42);
    ctx.lineTo(35, 66);
    ctx.stroke();
    // Pointed cowl & half-mask
    fillShadedPolygon(ctx, [[31, 34], [38, 8], [52, 6], [62, 24], [58, 35]], '#1E1633');
    fillShadedPolygon(ctx, [[38, 22], [58, 22], [55, 33], [41, 33]], '#0F0B1A');
    drawGlowOrb(ctx, 51, 20, 7, '#F3E8FF', 'rgba(168, 85, 247, 0)');
    ctx.fillStyle = '#E9D5FF';
    ctx.beginPath();
    ctx.arc(51, 20, 2.5, 0, Math.PI * 2);
    ctx.fill();
  });

  const weaponKey = makeHiDpiTexture(scene, `${prefix}_weapon`, 66, 86, (ctx) => {
    // Curved Eclipse Scimitar
    ctx.beginPath();
    ctx.moveTo(18, 66);
    ctx.quadraticCurveTo(46, 46, 54, 10);
    ctx.quadraticCurveTo(38, 34, 14, 58);
    ctx.closePath();
    ctx.fillStyle = linearGrad(ctx, 18, 66, 54, 10, [[0, '#C084FC'], [0.6, '#E2E8F0'], [1, '#FFFFFF']]);
    ctx.fill();
    ctx.strokeStyle = INK_COLOR;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    fillRoundRect(ctx, 10, 58, 12, 6, 2, '#A855F7');
  });

  const offhandKey = makeHiDpiTexture(scene, `${prefix}_offhand`, 52, 62, (ctx) => {
    // Inverted Parrying Dagger
    fillShadedPolygon(ctx, [[38, 20], [10, 48], [18, 30], [34, 14]], '#E9D5FF');
    fillRoundRect(ctx, 32, 12, 10, 6, 2, '#9333EA');
  });

  const backPart = scene.add.image(-12, -56, capeKey).setDisplaySize(88, 116);
  const torso = scene.add.image(0, -63, torsoKey).setDisplaySize(92, 126);
  const weaponArm = scene.add
    .image(18, -56, weaponKey)
    .setDisplaySize(66, 86)
    .setOrigin(0.22, 0.78);
  const offhandArm = scene.add
    .image(-18, -50, offhandKey)
    .setDisplaySize(52, 62)
    .setOrigin(0.75, 0.35);
  return { backPart, torso, weaponArm, offhandArm, baseScale: 1 };
}

// ============================================================================
// COMPANION RIG BUILDER
// ============================================================================
export function createCompanionRigParts(
  scene: Phaser.Scene,
  comp: ActiveCompanion
): ArticulatedRigParts {
  const def = getCompanionDef(comp.defId);
  const key = `comp_${def.id}`;

  const texKey = makeHiDpiTexture(scene, key, 76, 76, (ctx) => {
    if (def.spriteShape === 'hound') {
      drawGlowOrb(ctx, 38, 46, 20, 'rgba(249, 115, 22, 0.65)', 'rgba(217, 91, 38, 0)');
      fillShadedPolygon(
        ctx,
        [[14, 52], [28, 34], [52, 34], [66, 24], [70, 34], [58, 44], [52, 64], [44, 64], [46, 50], [26, 52], [20, 64], [14, 64]],
        linearGrad(ctx, 14, 24, 66, 64, [[0, '#57534E'], [1, '#292524']])
      );
      fillRoundRect(ctx, 31, 39, 16, 8, 3, '#F97316', '#7C2D12', 1);
      ctx.fillStyle = '#FEF08A';
      ctx.beginPath();
      ctx.arc(62, 30, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (def.spriteShape === 'construct') {
      const grad = linearGrad(ctx, 18, 14, 58, 68, [[0, '#D6D3D1'], [1, '#78716C']]);
      fillShadedPolygon(ctx, [[20, 20], [56, 20], [52, 66], [24, 66]], grad);
      fillRoundRect(ctx, 29, 10, 18, 14, 4, '#E7E5E4');
      drawGlowOrb(ctx, 38, 40, 12, '#93C5FD', 'rgba(59, 130, 246, 0)');
      fillRoundRect(ctx, 33, 35, 10, 10, 5, '#60A5FA', '#1E3A8A', 1.2);
    } else if (def.spriteShape === 'wisp') {
      drawGlowOrb(ctx, 38, 38, 30, '#99F6E4', 'rgba(16, 185, 129, 0)');
      ctx.strokeStyle = '#5EEAD4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(38, 38, 22, 10, 0.4, 0, Math.PI * 2);
      ctx.stroke();
      fillRoundRect(ctx, 28, 28, 20, 20, 10, '#34D399', '#ECFEFF', 1.8);
    } else if (def.spriteShape === 'hawk') {
      drawGlowOrb(ctx, 38, 34, 24, 'rgba(190, 242, 100, 0.45)', 'rgba(34, 197, 94, 0)');
      // Spread wings + raptor beak
      fillShadedPolygon(ctx, [[10, 26], [36, 30], [26, 44], [6, 36]], '#166534', '#BEF264', 1.4);
      fillShadedPolygon(ctx, [[40, 30], [66, 16], [56, 38], [40, 42]], '#15803D', '#BEF264', 1.4);
      fillShadedPolygon(ctx, [[28, 32], [48, 28], [52, 44], [34, 54], [24, 42]], '#1E293B', '#86EFAC', 1.4);
      fillShadedPolygon(ctx, [[48, 30], [60, 34], [50, 38]], '#FACC15');
      ctx.fillStyle = '#FEF08A';
      ctx.beginPath();
      ctx.arc(46, 32, 2.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (def.spriteShape === 'familiar') {
      drawGlowOrb(ctx, 38, 38, 28, 'rgba(56, 189, 248, 0.7)', 'rgba(56, 189, 248, 0)');
      ctx.strokeStyle = '#FDE047';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(38, 38, 24, 10, -0.45, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(38, 38, 24, 10, 0.45, 0, Math.PI * 2);
      ctx.stroke();
      fillShadedPolygon(ctx, [[38, 16], [50, 38], [38, 60], [26, 38]], '#38BDF8', '#E0F2FE', 1.8);
    } else if (def.spriteShape === 'squire') {
      const grad = linearGrad(ctx, 18, 16, 58, 64, [[0, '#94A3B8'], [1, '#334155']]);
      fillShadedPolygon(ctx, [[22, 26], [54, 26], [50, 64], [26, 64]], grad, '#F59E0B', 1.8);
      fillRoundRect(ctx, 29, 12, 18, 15, 4, '#64748B', '#F59E0B', 1.5);
      // Mini kite shield
      fillShadedPolygon(ctx, [[42, 32], [62, 32], [58, 56], [50, 64], [42, 56]], '#334155', '#FBBF24', 1.8);
      ctx.fillStyle = '#BAE6FD';
      ctx.fillRect(34, 18, 8, 2.5);
    } else {
      // sentinel / veil_shade / hollow_wraith
      drawGlowOrb(ctx, 38, 36, 26, 'rgba(192, 132, 252, 0.65)', 'rgba(126, 87, 194, 0)');
      fillShadedPolygon(
        ctx,
        [[38, 10], [56, 30], [52, 64], [38, 56], [24, 64], [20, 30]],
        linearGrad(ctx, 20, 10, 56, 64, [[0, '#581C87'], [1, '#1E1B4B']])
      );
      fillShadedPolygon(ctx, [[52, 40], [70, 22], [58, 46]], '#E9D5FF');
      ctx.fillStyle = '#F3E8FF';
      ctx.beginPath();
      ctx.arc(42, 26, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  const torso = scene.add.image(0, -34, texKey).setDisplaySize(76, 76);
  return { torso, baseScale: 1 };
}

// ============================================================================
// ENEMY ARTICULATED TEXTURES & RIG BUILDER (ALL 17+ STYLES)
// ============================================================================
export function createEnemyRigParts(
  scene: Phaser.Scene,
  enemy: CombatEnemy
): ArticulatedRigParts {
  const def = getEnemyDef(enemy.defId);
  const s = def.scale ?? 1;
  const style = def.spriteStyle;
  const prefix = `enemy_${style}`;

  let backPart: Phaser.GameObjects.Image | undefined;
  let torso: Phaser.GameObjects.Image;
  let weaponArm: Phaser.GameObjects.Image | undefined;
  let offhandArm: Phaser.GameObjects.Image | undefined;

  switch (style) {
    case 'hollow_hound':
    case 'ash_stalker': {
      const bodyKey = makeHiDpiTexture(scene, `${prefix}_torso`, 104, 104, (ctx) => {
        drawGlowOrb(ctx, 48, 56, 20, 'rgba(249, 115, 22, 0.75)', 'rgba(234, 88, 12, 0)');
        // Hunched skeletal torso & spine spikes
        fillShadedPolygon(
          ctx,
          [[24, 52], [44, 38], [80, 42], [90, 68], [66, 74], [32, 68]],
          linearGrad(ctx, 24, 38, 90, 74, [[0, '#52525B'], [1, '#27272A']])
        );
        // Ribs & legs
        ctx.fillStyle = '#D4D4D8';
        for (const rx of [40, 50, 60]) {
          fillRoundRect(ctx, rx, 46, 5, 16, 2, '#E4E4E7', INK_COLOR, 1);
        }
        fillRoundRect(ctx, 64, 68, 10, 26, 3, '#3F3F46');
        fillRoundRect(ctx, 28, 66, 9, 28, 3, '#3F3F46');
        // Horned skull facing left
        fillShadedPolygon(ctx, [[12, 42], [24, 26], [42, 32], [38, 50], [18, 52]], '#E4E4E7');
        fillShadedPolygon(ctx, [[34, 28], [48, 16], [42, 34]], '#71717A');
        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.arc(22, 39, 3, 0, Math.PI * 2);
        ctx.fill();
      });
      const clawKey = makeHiDpiTexture(scene, `${prefix}_weapon`, 54, 54, (ctx) => {
        fillShadedPolygon(ctx, [[40, 14], [14, 34], [24, 20]], '#E4E4E7');
        fillShadedPolygon(ctx, [[42, 22], [10, 44], [24, 32]], '#F97316');
      });
      torso = scene.add.image(0, -44 * s, bodyKey).setDisplaySize(104 * s, 104 * s);
      weaponArm = scene.add
        .image(-22 * s, -42 * s, clawKey)
        .setDisplaySize(54 * s, 54 * s)
        .setOrigin(0.75, 0.35);
      break;
    }

    case 'cinder_husk': {
      const bodyKey = makeHiDpiTexture(scene, `${prefix}_torso`, 96, 122, (ctx) => {
        const armorGrad = linearGrad(ctx, 26, 26, 72, 114, [
          [0, '#44403C'],
          [0.5, '#292524'],
          [1, '#141210'],
        ]);
        fillRoundRect(ctx, 32, 80, 14, 34, 4, '#292524');
        fillRoundRect(ctx, 52, 80, 14, 34, 4, '#292524');
        fillShadedPolygon(ctx, [[26, 36], [72, 36], [68, 84], [30, 84]], armorGrad, '#EA580C', 2);
        fillRoundRect(ctx, 36, 12, 26, 26, 6, '#1C1917', '#78716C', 2);
        drawGlowOrb(ctx, 44, 24, 9, '#FDE047', 'rgba(249, 115, 22, 0)');
        fillRoundRect(ctx, 38, 22, 12, 3.5, 1, '#FBBF24', INK_COLOR, 0.8);
      });
      const shieldKey = makeHiDpiTexture(scene, `${prefix}_weapon`, 48, 88, (ctx) => {
        const shGrad = linearGrad(ctx, 8, 8, 40, 80, [[0, '#57534E'], [1, '#1C1917']]);
        fillShadedPolygon(ctx, [[12, 8], [38, 12], [36, 78], [16, 82], [8, 46]], shGrad, '#F97316', 2.4);
        ctx.strokeStyle = '#FB923C';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(23, 22);
        ctx.lineTo(23, 66);
        ctx.stroke();
      });
      torso = scene.add.image(6 * s, -58 * s, bodyKey).setDisplaySize(96 * s, 122 * s);
      weaponArm = scene.add
        .image(-24 * s, -52 * s, shieldKey)
        .setDisplaySize(48 * s, 88 * s)
        .setOrigin(0.55, 0.5);
      break;
    }

    case 'crossbowman': {
      const bodyKey = makeHiDpiTexture(scene, `${prefix}_torso`, 88, 118, (ctx) => {
        const cloakGrad = linearGrad(ctx, 20, 22, 68, 112, [[0, '#334155'], [0.6, '#1E293B'], [1, '#0F172A']]);
        fillShadedPolygon(ctx, [[28, 30], [60, 30], [70, 112], [20, 112]], cloakGrad);
        fillShadedPolygon(ctx, [[30, 32], [58, 32], [54, 62], [34, 62]], '#451A1A');
        fillShadedPolygon(ctx, [[28, 32], [44, 6], [60, 32]], '#0F172A');
        ctx.fillStyle = '#F87171';
        ctx.beginPath();
        ctx.arc(38, 22, 2.8, 0, Math.PI * 2);
        ctx.fill();
      });
      const bowKey = makeHiDpiTexture(scene, `${prefix}_weapon`, 76, 56, (ctx) => {
        fillRoundRect(ctx, 18, 25, 48, 7, 2, '#78350F');
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(24, 28, 20, Math.PI * 0.6, Math.PI * 1.4);
        ctx.stroke();
        fillShadedPolygon(ctx, [[6, 28], [26, 25], [26, 31]], '#E2E8F0');
      });
      torso = scene.add.image(4 * s, -56 * s, bodyKey).setDisplaySize(88 * s, 118 * s);
      weaponArm = scene.add
        .image(-18 * s, -58 * s, bowKey)
        .setDisplaySize(76 * s, 56 * s)
        .setOrigin(0.75, 0.5);
      break;
    }

    case 'flagellant': {
      const bodyKey = makeHiDpiTexture(scene, `${prefix}_torso`, 92, 118, (ctx) => {
        fillRoundRect(ctx, 32, 76, 12, 34, 3, '#27272A');
        fillRoundRect(ctx, 50, 76, 12, 34, 3, '#27272A');
        fillShadedPolygon(ctx, [[28, 36], [64, 36], [60, 82], [32, 82]], linearGrad(ctx, 28, 36, 64, 82, [[0, '#7F1D1D'], [1, '#2D0E0E']]));
        // Spiked iron penitent halo
        ctx.strokeStyle = '#DC2626';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(46, 24, 18, 0, Math.PI * 2);
        ctx.stroke();
        fillRoundRect(ctx, 34, 12, 24, 24, 12, '#18181B');
        ctx.fillStyle = '#FCA5A5';
        ctx.beginPath();
        ctx.arc(41, 23, 2.8, 0, Math.PI * 2);
        ctx.fill();
      });
      const flailKey = makeHiDpiTexture(scene, `${prefix}_weapon`, 62, 76, (ctx) => {
        ctx.strokeStyle = '#9CA3AF';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(46, 18);
        ctx.lineTo(18, 52);
        ctx.stroke();
        ctx.setLineDash([]);
        fillRoundRect(ctx, 8, 44, 20, 20, 10, '#52525B', '#EF4444', 2);
      });
      torso = scene.add.image(4 * s, -56 * s, bodyKey).setDisplaySize(92 * s, 118 * s);
      weaponArm = scene.add
        .image(-20 * s, -54 * s, flailKey)
        .setDisplaySize(62 * s, 76 * s)
        .setOrigin(0.75, 0.25);
      break;
    }

    case 'oathbreaker': {
      const capeKey = makeHiDpiTexture(scene, `${prefix}_cape`, 84, 114, (ctx) => {
        fillShadedPolygon(ctx, [[24, 18], [58, 18], [76, 108], [32, 102], [18, 96]], linearGrad(ctx, 20, 18, 76, 108, [[0, '#991B1B'], [1, '#3B0808']]));
      });
      const bodyKey = makeHiDpiTexture(scene, `${prefix}_torso`, 102, 128, (ctx) => {
        fillRoundRect(ctx, 33, 82, 14, 38, 4, '#1E293B');
        fillRoundRect(ctx, 55, 82, 14, 38, 4, '#1E293B');
        const plateGrad = linearGrad(ctx, 28, 34, 74, 82, [[0, '#64748B'], [0.5, '#334155'], [1, '#1E293B']]);
        fillShadedPolygon(ctx, [[28, 36], [74, 36], [68, 82], [34, 82]], plateGrad, '#C89B3C', 2.2);
        fillShadedPolygon(ctx, [[16, 38], [34, 28], [36, 48], [20, 50]], '#475569', '#C89B3C', 1.8);
        fillShadedPolygon(ctx, [[66, 28], [86, 38], [82, 50], [64, 48]], '#475569', '#C89B3C', 1.8);
        fillRoundRect(ctx, 38, 10, 26, 26, 6, '#1E293B', '#C89B3C', 1.8);
        fillShadedPolygon(ctx, [[52, 12], [68, 2], [64, 20]], '#B91C1C');
        fillRoundRect(ctx, 41, 20, 14, 3.5, 1, '#FEF08A', INK_COLOR, 0.8);
      });
      const swordKey = makeHiDpiTexture(scene, `${prefix}_weapon`, 62, 114, (ctx) => {
        fillRoundRect(ctx, 24, 74, 16, 6, 2, '#C89B3C');
        fillRoundRect(ctx, 30, 80, 5, 22, 2, '#78350F');
        fillShadedPolygon(ctx, [[27, 74], [38, 74], [36, 18], [32, 4], [28, 18]], linearGrad(ctx, 27, 4, 38, 74, [[0, '#F8FAFC'], [1, '#64748B']]));
      });
      backPart = scene.add.image(16 * s, -54 * s, capeKey).setDisplaySize(84 * s, 114 * s);
      torso = scene.add.image(0, -62 * s, bodyKey).setDisplaySize(102 * s, 128 * s);
      weaponArm = scene.add
        .image(-24 * s, -56 * s, swordKey)
        .setDisplaySize(62 * s, 114 * s)
        .setOrigin(0.55, 0.78);
      break;
    }

    case 'cinder_warden': {
      // Regional Boss: Furnace Plate + Molten Grate + Horned Crown + Massive Maul
      const capeKey = makeHiDpiTexture(scene, `${prefix}_cape`, 114, 134, (ctx) => {
        fillShadedPolygon(ctx, [[30, 18], [86, 18], [108, 126], [8, 126]], linearGrad(ctx, 30, 18, 86, 126, [[0, '#451A03'], [1, '#1C1917']]));
      });
      const bodyKey = makeHiDpiTexture(scene, `${prefix}_torso`, 124, 144, (ctx) => {
        fillRoundRect(ctx, 34, 94, 20, 42, 5, '#292524');
        fillRoundRect(ctx, 70, 94, 20, 42, 5, '#292524');
        const kilnGrad = linearGrad(ctx, 24, 34, 100, 98, [[0, '#78350F'], [0.45, '#44403C'], [1, '#1C1917']]);
        fillShadedPolygon(ctx, [[24, 38], [100, 38], [92, 98], [32, 98]], kilnGrad, '#F59E0B', 2.6);
        // Molten furnace grate core
        drawGlowOrb(ctx, 62, 66, 26, '#FEF08A', 'rgba(249, 115, 22, 0)');
        fillRoundRect(ctx, 44, 50, 36, 32, 8, '#F97316', '#7C2D12', 2);
        ctx.strokeStyle = '#1C1917';
        ctx.lineWidth = 3.5;
        for (const gx of [52, 62, 72]) {
          ctx.beginPath();
          ctx.moveTo(gx, 50);
          ctx.lineTo(gx, 82);
          ctx.stroke();
        }
        // Horned crown helm
        fillRoundRect(ctx, 44, 16, 36, 26, 7, '#27272A', '#F59E0B', 2);
        fillShadedPolygon(ctx, [[46, 18], [30, 2], [54, 16]], '#52525B', '#F59E0B', 1.4);
        fillShadedPolygon(ctx, [[78, 18], [94, 2], [70, 16]], '#52525B', '#F59E0B', 1.4);
        ctx.fillStyle = '#FDE047';
        ctx.beginPath();
        ctx.arc(54, 28, 3.5, 0, Math.PI * 2);
        ctx.arc(68, 28, 3.5, 0, Math.PI * 2);
        ctx.fill();
      });
      const maulKey = makeHiDpiTexture(scene, `${prefix}_weapon`, 76, 128, (ctx) => {
        fillRoundRect(ctx, 35, 32, 9, 90, 3, '#78716C');
        fillRoundRect(ctx, 14, 10, 50, 28, 5, linearGrad(ctx, 14, 10, 64, 38, [[0, '#57534E'], [1, '#292524']]), '#F97316', 2.2);
        drawGlowOrb(ctx, 39, 24, 14, 'rgba(251, 146, 60, 0.8)', 'rgba(249, 115, 22, 0)');
      });
      backPart = scene.add.image(14 * s, -60 * s, capeKey).setDisplaySize(114 * s, 134 * s);
      torso = scene.add.image(0, -68 * s, bodyKey).setDisplaySize(124 * s, 144 * s);
      weaponArm = scene.add
        .image(-36 * s, -62 * s, maulKey)
        .setDisplaySize(76 * s, 128 * s)
        .setOrigin(0.55, 0.78);
      break;
    }

    case 'mire_leech': {
      const bodyKey = makeHiDpiTexture(scene, `${prefix}_torso`, 102, 82, (ctx) => {
        drawGlowOrb(ctx, 42, 42, 26, 'rgba(45, 212, 191, 0.45)', 'rgba(15, 118, 110, 0)');
        const segGrad = linearGrad(ctx, 14, 18, 92, 70, [[0, '#14B8A6'], [0.5, '#115E59'], [1, '#042F2E']]);
        fillRoundRect(ctx, 46, 36, 44, 32, 16, segGrad);
        fillRoundRect(ctx, 28, 22, 42, 34, 17, segGrad);
        fillRoundRect(ctx, 10, 24, 30, 28, 14, '#0F3F3C');
        // Glowing venom sacs
        fillRoundRect(ctx, 40, 26, 12, 10, 5, '#5EEAD4', '#0F766E', 1.2);
        fillRoundRect(ctx, 58, 38, 10, 8, 4, '#2DD4BF', '#0F766E', 1.2);
        // Lamprey teeth
        ctx.fillStyle = '#E2E8F0';
        fillShadedPolygon(ctx, [[10, 32], [4, 36], [10, 40]], '#F1F5F9', INK_COLOR, 1);
      });
      torso = scene.add.image(0, -38 * s, bodyKey).setDisplaySize(102 * s, 82 * s);
      break;
    }

    case 'drowned_acolyte': {
      const bodyKey = makeHiDpiTexture(scene, `${prefix}_torso`, 92, 120, (ctx) => {
        const robeGrad = linearGrad(ctx, 22, 24, 70, 114, [[0, '#14B8A6'], [0.45, '#115E59'], [1, '#042F2E']]);
        fillShadedPolygon(ctx, [[30, 34], [62, 34], [72, 114], [20, 114]], robeGrad, '#5EEAD4', 1.6);
        fillRoundRect(ctx, 32, 12, 28, 26, 12, '#042F2E');
        ctx.fillStyle = '#5EEAD4';
        ctx.beginPath();
        ctx.arc(40, 24, 3, 0, Math.PI * 2);
        ctx.fill();
      });
      const censerKey = makeHiDpiTexture(scene, `${prefix}_weapon`, 48, 72, (ctx) => {
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(32, 12);
        ctx.lineTo(18, 44);
        ctx.stroke();
        drawGlowOrb(ctx, 18, 50, 14, '#6EE7B7', 'rgba(16, 185, 129, 0)');
        fillRoundRect(ctx, 10, 42, 16, 16, 6, '#10B981', '#A7F3D0', 1.6);
      });
      torso = scene.add.image(4 * s, -56 * s, bodyKey).setDisplaySize(92 * s, 120 * s);
      weaponArm = scene.add
        .image(-22 * s, -52 * s, censerKey)
        .setDisplaySize(48 * s, 72 * s)
        .setOrigin(0.68, 0.2);
      break;
    }

    case 'crypt_gorger': {
      const bodyKey = makeHiDpiTexture(scene, `${prefix}_torso`, 112, 112, (ctx) => {
        const stoneGrad = linearGrad(ctx, 20, 22, 92, 102, [[0, '#475569'], [0.55, '#334155'], [1, '#1E293B']]);
        fillRoundRect(ctx, 22, 28, 70, 68, 28, stoneGrad);
        // Dorsal bone spines
        fillShadedPolygon(ctx, [[34, 32], [46, 12], [58, 30]], '#CBD5E1');
        fillShadedPolygon(ctx, [[56, 30], [70, 10], [78, 34]], '#CBD5E1');
        // Glowing eyes & fangs
        drawGlowOrb(ctx, 34, 48, 9, '#99F6E4', 'rgba(20, 184, 166, 0)');
        ctx.fillStyle = '#5EEAD4';
        ctx.beginPath();
        ctx.arc(34, 48, 3.8, 0, Math.PI * 2);
        ctx.fill();
        fillShadedPolygon(ctx, [[18, 62], [26, 76], [34, 62]], '#F1F5F9');
        fillShadedPolygon(ctx, [[32, 62], [38, 74], [44, 62]], '#F1F5F9');
      });
      const armKey = makeHiDpiTexture(scene, `${prefix}_weapon`, 54, 64, (ctx) => {
        fillRoundRect(ctx, 18, 12, 24, 36, 8, '#334155');
        fillShadedPolygon(ctx, [[18, 44], [8, 56], [26, 50]], '#CBD5E1');
      });
      torso = scene.add.image(6 * s, -52 * s, bodyKey).setDisplaySize(112 * s, 112 * s);
      weaponArm = scene.add
        .image(-26 * s, -44 * s, armKey)
        .setDisplaySize(54 * s, 64 * s)
        .setOrigin(0.65, 0.3);
      break;
    }

    case 'choir_cantor': {
      const haloKey = makeHiDpiTexture(scene, `${prefix}_cape`, 88, 88, (ctx) => {
        drawGlowOrb(ctx, 44, 44, 32, 'rgba(94, 234, 212, 0.5)', 'rgba(20, 184, 166, 0)');
        ctx.strokeStyle = '#5EEAD4';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(44, 44, 28, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = '#A78BFA';
        ctx.lineWidth = 1.6;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.arc(44, 44, 34, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      });
      const bodyKey = makeHiDpiTexture(scene, `${prefix}_torso`, 88, 120, (ctx) => {
        const robeGrad = linearGrad(ctx, 22, 24, 66, 110, [[0, '#312E81'], [0.6, '#1E1B4B'], [1, '#09091A']]);
        fillShadedPolygon(ctx, [[32, 34], [56, 34], [68, 106], [44, 96], [20, 108]], robeGrad, '#5EEAD4', 1.8);
        fillRoundRect(ctx, 32, 14, 24, 24, 12, '#0F172A');
        ctx.fillStyle = '#5EEAD4';
        ctx.beginPath();
        ctx.arc(40, 26, 2.8, 0, Math.PI * 2);
        ctx.fill();
      });
      const staffKey = makeHiDpiTexture(scene, `${prefix}_weapon`, 42, 92, (ctx) => {
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(21, 86);
        ctx.lineTo(21, 18);
        ctx.stroke();
        fillRoundRect(ctx, 14, 8, 14, 14, 7, '#5EEAD4', '#0F766E', 1.6);
      });
      backPart = scene.add.image(0, -88 * s, haloKey).setDisplaySize(88 * s, 88 * s);
      torso = scene.add.image(0, -58 * s, bodyKey).setDisplaySize(88 * s, 120 * s);
      weaponArm = scene.add
        .image(-20 * s, -54 * s, staffKey)
        .setDisplaySize(42 * s, 92 * s)
        .setOrigin(0.5, 0.72);
      break;
    }

    case 'prelate_vespera': {
      const haloKey = makeHiDpiTexture(scene, `${prefix}_cape`, 98, 98, (ctx) => {
        drawGlowOrb(ctx, 49, 49, 36, 'rgba(94, 234, 212, 0.5)', 'rgba(13, 148, 136, 0)');
        ctx.strokeStyle = '#5EEAD4';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(49, 49, 30, 0, Math.PI * 2);
        ctx.stroke();
      });
      const bodyKey = makeHiDpiTexture(scene, `${prefix}_torso`, 104, 136, (ctx) => {
        const vestGrad = linearGrad(ctx, 22, 34, 82, 130, [[0, '#0F766E'], [0.55, '#134E4A'], [1, '#042F2E']]);
        fillShadedPolygon(ctx, [[32, 38], [72, 38], [86, 130], [18, 130]], vestGrad, '#5EEAD4', 2);
        // Bishop miter crown
        fillShadedPolygon(ctx, [[36, 38], [38, 18], [52, 4], [66, 18], [68, 38]], '#0F172A', '#C89B3C', 2);
        fillRoundRect(ctx, 40, 26, 24, 5, 2, '#5EEAD4', '#0F766E', 1);
      });
      const staffKey = makeHiDpiTexture(scene, `${prefix}_weapon`, 48, 118, (ctx) => {
        ctx.strokeStyle = '#99F6E4';
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.moveTo(26, 112);
        ctx.lineTo(26, 22);
        ctx.arc(18, 22, 10, 0, Math.PI * 1.4, true);
        ctx.stroke();
      });
      backPart = scene.add.image(0, -96 * s, haloKey).setDisplaySize(98 * s, 98 * s);
      torso = scene.add.image(0, -64 * s, bodyKey).setDisplaySize(104 * s, 136 * s);
      weaponArm = scene.add
        .image(-28 * s, -58 * s, staffKey)
        .setDisplaySize(48 * s, 118 * s)
        .setOrigin(0.55, 0.72);
      break;
    }

    case 'ossuary_leviathan': {
      // Regional Boss: Coiled Serpent Body + Cathedral Bone Spires + Articulated Skull Head
      const bodyKey = makeHiDpiTexture(scene, `${prefix}_torso`, 136, 132, (ctx) => {
        const scaleGrad = linearGrad(ctx, 20, 32, 120, 120, [[0, '#14B8A6'], [0.5, '#0F766E'], [1, '#042F2E']]);
        // Coiled tail base
        fillRoundRect(ctx, 26, 74, 96, 46, 22, scaleGrad, '#CBD5E1', 2.2);
        fillShadedPolygon(ctx, [[36, 94], [46, 26], [88, 28], [98, 96]], scaleGrad, '#CBD5E1', 2.2);
        // Gothic bone arch ribs
        for (const [bx, by] of [[52, 42], [72, 34], [90, 56]]) {
          fillShadedPolygon(ctx, [[bx, by + 20], [bx + 8, by], [bx + 16, by + 20]], '#E2E8F0');
        }
      });
      const headKey = makeHiDpiTexture(scene, `${prefix}_weapon`, 84, 78, (ctx) => {
        drawGlowOrb(ctx, 32, 38, 22, 'rgba(94, 234, 212, 0.5)', 'rgba(20, 184, 166, 0)');
        fillShadedPolygon(ctx, [[12, 36], [34, 18], [72, 22], [68, 52], [22, 54]], '#E2E8F0', INK_COLOR, 2.2);
        fillShadedPolygon(ctx, [[38, 20], [48, 4], [54, 20]], '#CBD5E1');
        fillShadedPolygon(ctx, [[54, 22], [66, 6], [68, 24]], '#CBD5E1');
        ctx.fillStyle = '#5EEAD4';
        ctx.beginPath();
        ctx.arc(30, 36, 4.5, 0, Math.PI * 2);
        ctx.fill();
        fillShadedPolygon(ctx, [[16, 52], [22, 64], [28, 52]], '#FFFFFF');
        fillShadedPolygon(ctx, [[30, 52], [36, 64], [42, 52]], '#FFFFFF');
      });
      torso = scene.add.image(10 * s, -62 * s, bodyKey).setDisplaySize(136 * s, 132 * s);
      weaponArm = scene.add
        .image(-22 * s, -88 * s, headKey)
        .setDisplaySize(84 * s, 78 * s)
        .setOrigin(0.75, 0.55);
      break;
    }

    case 'basalt_sentinel': {
      const bodyKey = makeHiDpiTexture(scene, `${prefix}_torso`, 96, 122, (ctx) => {
        drawGlowOrb(ctx, 48, 58, 28, 'rgba(245, 158, 11, 0.45)', 'rgba(249, 115, 22, 0)');
        const rockGrad = linearGrad(ctx, 20, 10, 76, 114, [[0, '#3F3F46'], [0.5, '#18181B'], [1, '#09090B']]);
        fillShadedPolygon(ctx, [[48, 8], [74, 48], [64, 114], [32, 114], [22, 48]], rockGrad, '#F59E0B', 2.2);
        ctx.strokeStyle = '#F97316';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(48, 26);
        ctx.lineTo(48, 92);
        ctx.moveTo(34, 56);
        ctx.lineTo(62, 56);
        ctx.stroke();
        fillRoundRect(ctx, 41, 49, 14, 14, 7, '#FBBF24', '#FEF08A', 1.4);
      });
      const shardKey = makeHiDpiTexture(scene, `${prefix}_weapon`, 36, 64, (ctx) => {
        fillShadedPolygon(ctx, [[18, 6], [30, 32], [18, 58], [6, 32]], '#27272A', '#F59E0B', 1.8);
      });
      torso = scene.add.image(0, -58 * s, bodyKey).setDisplaySize(96 * s, 122 * s);
      weaponArm = scene.add
        .image(-30 * s, -58 * s, shardKey)
        .setDisplaySize(36 * s, 64 * s)
        .setOrigin(0.5, 0.5);
      offhandArm = scene.add
        .image(30 * s, -58 * s, shardKey)
        .setDisplaySize(36 * s, 64 * s)
        .setOrigin(0.5, 0.5);
      break;
    }

    case 'void_harpy': {
      const wingKey = makeHiDpiTexture(scene, `${prefix}_cape`, 122, 84, (ctx) => {
        const wingGrad = linearGrad(ctx, 6, 12, 116, 68, [[0, '#4C1D95'], [1, '#1E1B4B']]);
        fillShadedPolygon(ctx, [[56, 44], [6, 14], [18, 56], [42, 52]], wingGrad, '#A855F7', 1.8);
        fillShadedPolygon(ctx, [[66, 44], [116, 14], [104, 56], [80, 52]], wingGrad, '#A855F7', 1.8);
      });
      const bodyKey = makeHiDpiTexture(scene, `${prefix}_torso`, 72, 92, (ctx) => {
        fillRoundRect(ctx, 22, 24, 28, 46, 14, '#1E1B4B', '#C89B3C', 1.6);
        fillShadedPolygon(ctx, [[26, 26], [36, 10], [46, 26]], '#F59E0B');
        ctx.fillStyle = '#FDE047';
        ctx.beginPath();
        ctx.arc(31, 34, 2.8, 0, Math.PI * 2);
        ctx.arc(41, 34, 2.8, 0, Math.PI * 2);
        ctx.fill();
      });
      backPart = scene.add.image(0, -64 * s, wingKey).setDisplaySize(122 * s, 84 * s);
      torso = scene.add.image(0, -56 * s, bodyKey).setDisplaySize(72 * s, 92 * s);
      break;
    }

    case 'eclipse_zealot':
    case 'vanguard_duelist': {
      const bodyKey = makeHiDpiTexture(scene, `${prefix}_torso`, 94, 120, (ctx) => {
        fillRoundRect(ctx, 32, 78, 12, 34, 4, '#0F172A');
        fillRoundRect(ctx, 52, 78, 12, 34, 4, '#0F172A');
        fillShadedPolygon(ctx, [[30, 34], [64, 34], [58, 78], [36, 78]], linearGrad(ctx, 30, 34, 64, 78, [[0, '#312E81'], [1, '#111827']]), '#C89B3C', 1.8);
        fillRoundRect(ctx, 35, 12, 24, 22, 8, '#09090B', '#C89B3C', 1.6);
        fillRoundRect(ctx, 39, 20, 12, 3, 1, '#F59E0B', INK_COLOR, 0.5);
      });
      const saberKey = makeHiDpiTexture(scene, `${prefix}_weapon`, 58, 76, (ctx) => {
        ctx.beginPath();
        ctx.moveTo(42, 62);
        ctx.quadraticCurveTo(14, 44, 10, 10);
        ctx.quadraticCurveTo(28, 32, 48, 54);
        ctx.closePath();
        ctx.fillStyle = '#E2E8F0';
        ctx.fill();
        ctx.strokeStyle = '#C89B3C';
        ctx.lineWidth = 1.6;
        ctx.stroke();
      });
      torso = scene.add.image(0, -58 * s, bodyKey).setDisplaySize(94 * s, 120 * s);
      weaponArm = scene.add
        .image(-20 * s, -54 * s, saberKey)
        .setDisplaySize(58 * s, 76 * s)
        .setOrigin(0.75, 0.78);
      offhandArm = scene.add
        .image(18 * s, -50 * s, saberKey)
        .setDisplaySize(52 * s, 68 * s)
        .setOrigin(0.75, 0.78)
        .setFlipX(true);
      break;
    }

    case 'archon_kael': {
      const capeKey = makeHiDpiTexture(scene, `${prefix}_cape`, 94, 120, (ctx) => {
        fillShadedPolygon(ctx, [[28, 18], [64, 18], [84, 112], [20, 104]], linearGrad(ctx, 28, 18, 84, 112, [[0, '#4C1D95'], [1, '#1E1B4B']]));
      });
      const bodyKey = makeHiDpiTexture(scene, `${prefix}_torso`, 108, 132, (ctx) => {
        fillRoundRect(ctx, 35, 84, 14, 38, 4, '#1E1B4B');
        fillRoundRect(ctx, 59, 84, 14, 38, 4, '#1E1B4B');
        fillShadedPolygon(ctx, [[30, 36], [78, 36], [72, 84], [36, 84]], linearGrad(ctx, 30, 36, 78, 84, [[0, '#4338CA'], [1, '#1E1B4B']]), '#C89B3C', 2.4);
        // Winged marshal helm
        fillRoundRect(ctx, 41, 12, 26, 24, 8, '#18181B', '#C89B3C', 1.8);
        fillShadedPolygon(ctx, [[42, 18], [22, 4], [38, 26]], '#C89B3C');
        fillShadedPolygon(ctx, [[66, 18], [86, 4], [70, 26]], '#C89B3C');
        ctx.fillStyle = '#FBBF24';
        ctx.beginPath();
        ctx.arc(49, 23, 3, 0, Math.PI * 2);
        ctx.fill();
      });
      const glaiveKey = makeHiDpiTexture(scene, `${prefix}_weapon`, 54, 126, (ctx) => {
        fillRoundRect(ctx, 25, 36, 5, 84, 2, '#C89B3C');
        fillShadedPolygon(ctx, [[24, 38], [32, 38], [34, 14], [26, 2], [20, 20]], '#FEF08A', '#78350F', 1.6);
      });
      backPart = scene.add.image(14 * s, -58 * s, capeKey).setDisplaySize(94 * s, 120 * s);
      torso = scene.add.image(0, -64 * s, bodyKey).setDisplaySize(108 * s, 132 * s);
      weaponArm = scene.add
        .image(-26 * s, -58 * s, glaiveKey)
        .setDisplaySize(54 * s, 126 * s)
        .setOrigin(0.5, 0.72);
      break;
    }

    case 'spore_stalker': {
      const bodyKey = makeHiDpiTexture(scene, `${prefix}_torso`, 108, 108, (ctx) => {
        drawGlowOrb(ctx, 50, 52, 26, 'rgba(74, 222, 128, 0.5)', 'rgba(22, 163, 74, 0)');
        fillShadedPolygon(
          ctx,
          [[24, 54], [46, 32], [84, 42], [90, 74], [62, 78], [28, 68]],
          linearGrad(ctx, 24, 32, 90, 78, [[0, '#365314'], [1, '#14532D']]),
          '#4ADE80',
          1.8
        );
        // Glowing fungal caps along back
        fillRoundRect(ctx, 42, 22, 22, 14, 7, '#10B981', '#A7F3D0', 1.4);
        fillRoundRect(ctx, 64, 28, 18, 12, 6, '#34D399', '#A7F3D0', 1.4);
        fillRoundRect(ctx, 64, 70, 10, 26, 3, '#1E293B');
        fillRoundRect(ctx, 28, 68, 9, 28, 3, '#1E293B');
        // Horned bark snout
        fillShadedPolygon(ctx, [[10, 46], [24, 28], [42, 34], [38, 54], [18, 54]], '#4D7C0F');
        ctx.fillStyle = '#BEF264';
        ctx.beginPath();
        ctx.arc(22, 42, 3.2, 0, Math.PI * 2);
        ctx.fill();
      });
      const clawKey = makeHiDpiTexture(scene, `${prefix}_weapon`, 54, 54, (ctx) => {
        fillShadedPolygon(ctx, [[40, 14], [12, 34], [24, 20]], '#A3E635');
        fillShadedPolygon(ctx, [[42, 22], [10, 44], [24, 32]], '#22C55E');
      });
      torso = scene.add.image(0, -46 * s, bodyKey).setDisplaySize(108 * s, 108 * s);
      weaponArm = scene.add
        .image(-22 * s, -42 * s, clawKey)
        .setDisplaySize(54 * s, 54 * s)
        .setOrigin(0.75, 0.35);
      break;
    }

    case 'thorn_dryad': {
      const canopyKey = makeHiDpiTexture(scene, `${prefix}_cape`, 94, 112, (ctx) => {
        fillShadedPolygon(ctx, [[26, 16], [68, 16], [88, 104], [8, 104]], linearGrad(ctx, 26, 16, 68, 104, [[0, '#14532D'], [1, '#052E16']]), '#4ADE80', 1.5);
      });
      const bodyKey = makeHiDpiTexture(scene, `${prefix}_torso`, 92, 124, (ctx) => {
        const barkGrad = linearGrad(ctx, 28, 26, 64, 116, [[0, '#78350F'], [0.5, '#3F2E1E'], [1, '#14532D']]);
        fillShadedPolygon(ctx, [[32, 36], [60, 36], [68, 116], [24, 116]], barkGrad, '#4ADE80', 1.8);
        // Thorn antler crown
        fillShadedPolygon(ctx, [[36, 22], [22, 4], [40, 20]], '#65A30D');
        fillShadedPolygon(ctx, [[56, 22], [70, 4], [52, 20]], '#65A30D');
        fillRoundRect(ctx, 34, 14, 24, 24, 10, '#1C1917', '#4ADE80', 1.4);
        ctx.fillStyle = '#86EFAC';
        ctx.beginPath();
        ctx.arc(41, 25, 2.8, 0, Math.PI * 2);
        ctx.fill();
      });
      const staffKey = makeHiDpiTexture(scene, `${prefix}_weapon`, 46, 102, (ctx) => {
        ctx.strokeStyle = '#78350F';
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.moveTo(23, 96);
        ctx.lineTo(23, 18);
        ctx.stroke();
        drawGlowOrb(ctx, 23, 18, 14, '#86EFAC', 'rgba(34, 197, 94, 0)');
        fillRoundRect(ctx, 16, 11, 14, 14, 7, '#22C55E', '#DCFCE7', 1.4);
      });
      backPart = scene.add.image(10 * s, -56 * s, canopyKey).setDisplaySize(94 * s, 112 * s);
      torso = scene.add.image(0, -58 * s, bodyKey).setDisplaySize(92 * s, 124 * s);
      weaponArm = scene.add
        .image(-24 * s, -54 * s, staffKey)
        .setDisplaySize(46 * s, 102 * s)
        .setOrigin(0.5, 0.72);
      break;
    }

    case 'hollow_archdruid': {
      const haloKey = makeHiDpiTexture(scene, `${prefix}_cape`, 132, 138, (ctx) => {
        drawGlowOrb(ctx, 66, 56, 46, 'rgba(74, 222, 128, 0.48)', 'rgba(20, 83, 45, 0)');
        ctx.strokeStyle = '#4ADE80';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(66, 56, 38, 0, Math.PI * 2);
        ctx.stroke();
        fillShadedPolygon(ctx, [[30, 54], [102, 54], [118, 132], [14, 132]], linearGrad(ctx, 30, 54, 102, 132, [[0, '#14532D'], [1, '#052E16']]), '#84CC16', 2);
      });
      const bodyKey = makeHiDpiTexture(scene, `${prefix}_torso`, 118, 142, (ctx) => {
        const barkGrad = linearGrad(ctx, 28, 38, 90, 130, [[0, '#365314'], [0.55, '#14532D'], [1, '#0F172A']]);
        fillShadedPolygon(ctx, [[30, 44], [88, 44], [94, 134], [24, 134]], barkGrad, '#86EFAC', 2.2);
        // Antlered skull mask
        fillRoundRect(ctx, 42, 22, 34, 26, 8, '#E7E5E4', '#166534', 2);
        fillShadedPolygon(ctx, [[42, 24], [18, 4], [48, 20]], '#D6D3D1');
        fillShadedPolygon(ctx, [[76, 24], [100, 4], [70, 20]], '#D6D3D1');
        ctx.fillStyle = '#4ADE80';
        ctx.beginPath();
        ctx.arc(52, 34, 3.6, 0, Math.PI * 2);
        ctx.arc(66, 34, 3.6, 0, Math.PI * 2);
        ctx.fill();
      });
      const staffKey = makeHiDpiTexture(scene, `${prefix}_weapon`, 58, 132, (ctx) => {
        fillRoundRect(ctx, 26, 28, 6, 98, 3, '#713F12');
        drawGlowOrb(ctx, 29, 20, 18, '#BEF264', 'rgba(34, 197, 94, 0)');
        fillRoundRect(ctx, 19, 10, 20, 20, 10, '#22C55E', '#ECFCCB', 2);
      });
      backPart = scene.add.image(0, -70 * s, haloKey).setDisplaySize(132 * s, 138 * s);
      torso = scene.add.image(0, -68 * s, bodyKey).setDisplaySize(118 * s, 142 * s);
      weaponArm = scene.add
        .image(-34 * s, -62 * s, staffKey)
        .setDisplaySize(58 * s, 132 * s)
        .setOrigin(0.5, 0.75);
      break;
    }

    case 'abyssal_knight': {
      const capeKey = makeHiDpiTexture(scene, `${prefix}_cape`, 88, 118, (ctx) => {
        fillShadedPolygon(ctx, [[26, 18], [62, 18], [78, 110], [18, 106]], linearGrad(ctx, 26, 18, 78, 110, [[0, '#0E7490'], [1, '#082F49']]));
      });
      const bodyKey = makeHiDpiTexture(scene, `${prefix}_torso`, 102, 128, (ctx) => {
        fillRoundRect(ctx, 33, 82, 14, 38, 4, '#0F172A');
        fillRoundRect(ctx, 55, 82, 14, 38, 4, '#0F172A');
        const plateGrad = linearGrad(ctx, 28, 34, 74, 84, [[0, '#0891B2'], [0.55, '#164E63'], [1, '#082F49']]);
        fillShadedPolygon(ctx, [[28, 36], [74, 36], [68, 84], [34, 84]], plateGrad, '#38BDF8', 2.2);
        fillRoundRect(ctx, 38, 10, 26, 26, 6, '#0F172A', '#38BDF8', 1.8);
        fillRoundRect(ctx, 41, 20, 14, 3.5, 1, '#7DD3FC', INK_COLOR, 0.8);
      });
      const halberdKey = makeHiDpiTexture(scene, `${prefix}_weapon`, 62, 122, (ctx) => {
        fillRoundRect(ctx, 29, 24, 5, 92, 2, '#64748B');
        fillShadedPolygon(ctx, [[28, 36], [10, 22], [28, 8]], '#BAE6FD', '#0284C7', 1.6);
      });
      backPart = scene.add.image(14 * s, -54 * s, capeKey).setDisplaySize(88 * s, 118 * s);
      torso = scene.add.image(0, -62 * s, bodyKey).setDisplaySize(102 * s, 128 * s);
      weaponArm = scene.add
        .image(-24 * s, -58 * s, halberdKey)
        .setDisplaySize(62 * s, 122 * s)
        .setOrigin(0.55, 0.78);
      break;
    }

    case 'sunken_sovereign': {
      const haloKey = makeHiDpiTexture(scene, `${prefix}_cape`, 132, 142, (ctx) => {
        drawGlowOrb(ctx, 66, 52, 48, 'rgba(56, 189, 248, 0.48)', 'rgba(14, 116, 144, 0)');
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(66, 52, 38, 0, Math.PI * 2);
        ctx.stroke();
        fillShadedPolygon(ctx, [[32, 62], [100, 62], [116, 136], [16, 136]], linearGrad(ctx, 32, 62, 100, 136, [[0, '#0C4A6E'], [1, '#082F49']]), '#7DD3FC', 2);
      });
      const bodyKey = makeHiDpiTexture(scene, `${prefix}_torso`, 116, 142, (ctx) => {
        const royalGrad = linearGrad(ctx, 28, 36, 88, 128, [[0, '#0284C7'], [0.5, '#0C4A6E'], [1, '#0F172A']]);
        fillShadedPolygon(ctx, [[32, 44], [84, 44], [92, 132], [24, 132]], royalGrad, '#7DD3FC', 2.4);
        fillRoundRect(ctx, 43, 24, 30, 22, 6, '#0F172A', '#38BDF8', 1.8);
        fillShadedPolygon(ctx, [[42, 24], [46, 6], [52, 24]], '#7DD3FC');
        fillShadedPolygon(ctx, [[53, 24], [58, 2], [63, 24]], '#BAE6FD');
        fillShadedPolygon(ctx, [[64, 24], [70, 6], [74, 24]], '#7DD3FC');
        ctx.fillStyle = '#E0F2FE';
        ctx.beginPath();
        ctx.arc(52, 34, 3.2, 0, Math.PI * 2);
        ctx.arc(64, 34, 3.2, 0, Math.PI * 2);
        ctx.fill();
      });
      const tridentKey = makeHiDpiTexture(scene, `${prefix}_weapon`, 62, 134, (ctx) => {
        fillRoundRect(ctx, 28, 30, 6, 98, 3, '#38BDF8');
        fillShadedPolygon(ctx, [[16, 30], [20, 8], [24, 30]], '#BAE6FD');
        fillShadedPolygon(ctx, [[27, 28], [31, 2], [35, 28]], '#E0F2FE');
        fillShadedPolygon(ctx, [[38, 30], [42, 8], [46, 30]], '#BAE6FD');
      });
      backPart = scene.add.image(0, -72 * s, haloKey).setDisplaySize(132 * s, 142 * s);
      torso = scene.add.image(0, -68 * s, bodyKey).setDisplaySize(116 * s, 142 * s);
      weaponArm = scene.add
        .image(-34 * s, -62 * s, tridentKey)
        .setDisplaySize(62 * s, 134 * s)
        .setOrigin(0.5, 0.75);
      break;
    }

    case 'crag_wyvern': {
      const wingKey = makeHiDpiTexture(scene, `${prefix}_cape`, 132, 92, (ctx) => {
        const wingGrad = linearGrad(ctx, 6, 12, 126, 74, [[0, '#64748B'], [1, '#1E293B']]);
        fillShadedPolygon(ctx, [[58, 48], [6, 10], [18, 58], [46, 56]], wingGrad, '#CBD5E1', 1.8);
        fillShadedPolygon(ctx, [[74, 48], [126, 10], [114, 58], [86, 56]], wingGrad, '#CBD5E1', 1.8);
      });
      const bodyKey = makeHiDpiTexture(scene, `${prefix}_torso`, 94, 102, (ctx) => {
        fillShadedPolygon(ctx, [[24, 38], [64, 34], [74, 78], [34, 84]], linearGrad(ctx, 24, 34, 74, 84, [[0, '#475569'], [1, '#0F172A']]), '#94A3B8', 2);
        fillShadedPolygon(ctx, [[8, 32], [28, 20], [44, 34], [24, 46]], '#64748B', '#E2E8F0', 1.6);
        ctx.fillStyle = '#FBBF24';
        ctx.beginPath();
        ctx.arc(22, 32, 3, 0, Math.PI * 2);
        ctx.fill();
      });
      backPart = scene.add.image(0, -66 * s, wingKey).setDisplaySize(132 * s, 92 * s);
      torso = scene.add.image(0, -56 * s, bodyKey).setDisplaySize(94 * s, 102 * s);
      break;
    }

    case 'storm_warden': {
      const haloKey = makeHiDpiTexture(scene, `${prefix}_cape`, 122, 134, (ctx) => {
        drawGlowOrb(ctx, 61, 56, 44, 'rgba(148, 163, 184, 0.5)', 'rgba(56, 189, 248, 0)');
        fillShadedPolygon(ctx, [[28, 22], [94, 22], [112, 126], [10, 126]], linearGrad(ctx, 28, 22, 94, 126, [[0, '#334155'], [1, '#0F172A']]), '#94A3B8', 2);
      });
      const bodyKey = makeHiDpiTexture(scene, `${prefix}_torso`, 120, 142, (ctx) => {
        fillRoundRect(ctx, 34, 92, 18, 42, 5, '#1E293B');
        fillRoundRect(ctx, 68, 92, 18, 42, 5, '#1E293B');
        fillShadedPolygon(ctx, [[26, 36], [94, 36], [88, 94], [32, 94]], linearGrad(ctx, 26, 36, 94, 94, [[0, '#64748B'], [1, '#1E293B']]), '#7DD3FC', 2.4);
        fillRoundRect(ctx, 42, 14, 36, 26, 7, '#0F172A', '#E2E8F0', 2);
        fillRoundRect(ctx, 48, 23, 22, 4, 2, '#38BDF8', INK_COLOR, 0.6);
      });
      const axeKey = makeHiDpiTexture(scene, `${prefix}_weapon`, 74, 130, (ctx) => {
        fillRoundRect(ctx, 34, 26, 7, 98, 3, '#94A3B8');
        fillShadedPolygon(ctx, [[34, 24], [8, 8], [14, 48], [34, 38]], '#E2E8F0', '#38BDF8', 2);
      });
      backPart = scene.add.image(6 * s, -62 * s, haloKey).setDisplaySize(122 * s, 134 * s);
      torso = scene.add.image(0, -68 * s, bodyKey).setDisplaySize(120 * s, 142 * s);
      weaponArm = scene.add
        .image(-34 * s, -62 * s, axeKey)
        .setDisplaySize(74 * s, 130 * s)
        .setOrigin(0.55, 0.78);
      break;
    }

    case 'sepulcher_wraith': {
      const bodyKey = makeHiDpiTexture(scene, `${prefix}_torso`, 94, 126, (ctx) => {
        drawGlowOrb(ctx, 47, 46, 30, 'rgba(168, 85, 247, 0.45)', 'rgba(88, 28, 135, 0)');
        fillShadedPolygon(
          ctx,
          [[30, 32], [64, 32], [74, 114], [54, 102], [44, 118], [22, 108]],
          linearGrad(ctx, 22, 32, 74, 118, [[0, '#581C87'], [1, '#09090B']]),
          '#C084FC',
          1.8
        );
        fillRoundRect(ctx, 34, 12, 26, 26, 12, '#09090B', '#A855F7', 1.4);
        ctx.fillStyle = '#E9D5FF';
        ctx.beginPath();
        ctx.arc(42, 24, 3, 0, Math.PI * 2);
        ctx.fill();
      });
      const scytheKey = makeHiDpiTexture(scene, `${prefix}_weapon`, 66, 116, (ctx) => {
        fillRoundRect(ctx, 36, 22, 5, 88, 2, '#6B7280');
        fillShadedPolygon(ctx, [[38, 22], [8, 10], [20, 30], [38, 28]], '#E9D5FF', '#A855F7', 1.6);
      });
      torso = scene.add.image(0, -62 * s, bodyKey).setDisplaySize(94 * s, 126 * s);
      weaponArm = scene.add
        .image(-24 * s, -58 * s, scytheKey)
        .setDisplaySize(66 * s, 116 * s)
        .setOrigin(0.65, 0.72);
      break;
    }

    case 'crypt_lord': {
      const haloKey = makeHiDpiTexture(scene, `${prefix}_cape`, 132, 142, (ctx) => {
        drawGlowOrb(ctx, 66, 52, 48, 'rgba(192, 132, 252, 0.5)', 'rgba(88, 28, 135, 0)');
        ctx.strokeStyle = '#C084FC';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(66, 52, 38, 0, Math.PI * 2);
        ctx.stroke();
        fillShadedPolygon(ctx, [[32, 60], [100, 60], [116, 136], [16, 136]], linearGrad(ctx, 32, 60, 100, 136, [[0, '#3B0764'], [1, '#09090B']]), '#C89B3C', 2);
      });
      const bodyKey = makeHiDpiTexture(scene, `${prefix}_torso`, 118, 142, (ctx) => {
        fillShadedPolygon(ctx, [[30, 44], [88, 44], [92, 132], [26, 132]], linearGrad(ctx, 30, 44, 88, 132, [[0, '#4C1D95'], [1, '#111827']]), '#E2E8F0', 2.2);
        // Skeletal crown skull
        fillRoundRect(ctx, 43, 20, 32, 26, 7, '#E2E8F0', '#C89B3C', 2);
        fillShadedPolygon(ctx, [[43, 20], [34, 4], [52, 20]], '#C89B3C');
        fillShadedPolygon(ctx, [[75, 20], [84, 4], [66, 20]], '#C89B3C');
        ctx.fillStyle = '#C084FC';
        ctx.beginPath();
        ctx.arc(53, 32, 3.5, 0, Math.PI * 2);
        ctx.arc(65, 32, 3.5, 0, Math.PI * 2);
        ctx.fill();
      });
      const bladeKey = makeHiDpiTexture(scene, `${prefix}_weapon`, 60, 134, (ctx) => {
        fillRoundRect(ctx, 27, 86, 6, 38, 2, '#C89B3C');
        fillShadedPolygon(ctx, [[24, 86], [36, 86], [35, 16], [30, 4], [25, 16]], '#DDD6FE', '#7E22CE', 1.8);
      });
      backPart = scene.add.image(0, -72 * s, haloKey).setDisplaySize(132 * s, 142 * s);
      torso = scene.add.image(0, -68 * s, bodyKey).setDisplaySize(118 * s, 142 * s);
      weaponArm = scene.add
        .image(-34 * s, -62 * s, bladeKey)
        .setDisplaySize(60 * s, 134 * s)
        .setOrigin(0.5, 0.78);
      break;
    }

    case 'gnarlmaw_behemoth': {
      const antlersKey = makeHiDpiTexture(scene, `${prefix}_cape`, 138, 146, (ctx) => {
        // Great iron-oak antlers & mossy spine
        fillShadedPolygon(ctx, [[34, 62], [104, 62], [118, 138], [20, 138]], linearGrad(ctx, 20, 62, 118, 138, [[0, '#365314'], [1, '#1A2E05']]), '#14532D', 2);
        ctx.strokeStyle = '#78350F';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(46, 54);
        ctx.lineTo(18, 16);
        ctx.moveTo(28, 30);
        ctx.lineTo(10, 34);
        ctx.moveTo(92, 54);
        ctx.lineTo(120, 16);
        ctx.moveTo(110, 30);
        ctx.lineTo(128, 34);
        ctx.stroke();
        drawGlowOrb(ctx, 20, 18, 10, '#A3E635', 'rgba(132, 204, 22, 0)');
        drawGlowOrb(ctx, 118, 18, 10, '#A3E635', 'rgba(132, 204, 22, 0)');
      });
      const bodyKey = makeHiDpiTexture(scene, `${prefix}_torso`, 124, 140, (ctx) => {
        fillShadedPolygon(
          ctx,
          [[24, 38], [100, 38], [108, 128], [16, 128]],
          linearGrad(ctx, 24, 38, 100, 128, [[0, '#4D7C0F'], [0.55, '#3F2E21'], [1, '#1C1917']]),
          '#090A0F',
          2.2
        );
        // Amber heartwood core
        drawGlowOrb(ctx, 62, 74, 22, 'rgba(245, 158, 11, 0.9)', 'rgba(217, 119, 6, 0)');
        fillShadedPolygon(ctx, [[54, 60], [70, 60], [66, 88], [58, 88]], '#FBBF24', '#78350F', 1.5);
        // Stag skull helm
        fillRoundRect(ctx, 42, 16, 40, 26, 8, '#D6D3D1', '#292524', 2);
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.arc(53, 28, 3.5, 0, Math.PI * 2);
        ctx.arc(71, 28, 3.5, 0, Math.PI * 2);
        ctx.fill();
      });
      const clawKey = makeHiDpiTexture(scene, `${prefix}_weapon`, 62, 118, (ctx) => {
        fillShadedPolygon(ctx, [[30, 18], [48, 22], [44, 86], [24, 84]], '#44403C');
        fillShadedPolygon(ctx, [[22, 84], [10, 112], [26, 94]], '#E7E5E4');
        fillShadedPolygon(ctx, [[34, 84], [24, 116], [38, 94]], '#E7E5E4');
        fillShadedPolygon(ctx, [[44, 84], [40, 112], [50, 92]], '#E7E5E4');
      });
      backPart = scene.add.image(0, -70 * s, antlersKey).setDisplaySize(138 * s, 146 * s);
      torso = scene.add.image(0, -66 * s, bodyKey).setDisplaySize(124 * s, 140 * s);
      weaponArm = scene.add
        .image(-38 * s, -54 * s, clawKey)
        .setDisplaySize(62 * s, 118 * s)
        .setOrigin(0.55, 0.25);
      break;
    }

    case 'sanctum_automaton': {
      const auraKey = makeHiDpiTexture(scene, `${prefix}_cape`, 128, 138, (ctx) => {
        ctx.strokeStyle = '#D97706';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(64, 52, 42, Math.PI * 0.85, Math.PI * 2.15);
        ctx.stroke();
        fillShadedPolygon(ctx, [[28, 36], [48, 22], [52, 72], [24, 68]], '#92400E', '#F59E0B', 1.8);
        fillShadedPolygon(ctx, [[100, 36], [80, 22], [76, 72], [104, 68]], '#92400E', '#F59E0B', 1.8);
      });
      const bodyKey = makeHiDpiTexture(scene, `${prefix}_torso`, 114, 138, (ctx) => {
        fillShadedPolygon(
          ctx,
          [[26, 36], [88, 36], [96, 126], [18, 126]],
          linearGrad(ctx, 26, 36, 88, 126, [[0, '#D97706'], [0.5, '#78350F'], [1, '#292524']]),
          '#090A0F',
          2.2
        );
        // Cyan reliquary core lens
        drawGlowOrb(ctx, 57, 64, 20, '#67E8F9', 'rgba(6, 182, 212, 0)');
        fillRoundRect(ctx, 47, 54, 20, 20, 10, '#22D3EE', '#FDE68A', 2);
        // Automaton dome helm
        fillRoundRect(ctx, 41, 14, 32, 24, 10, '#B45309', '#FDE68A', 2);
        fillRoundRect(ctx, 46, 22, 22, 5, 2, '#0E7490', '#67E8F9', 1.2);
      });
      const maceKey = makeHiDpiTexture(scene, `${prefix}_weapon`, 62, 128, (ctx) => {
        fillRoundRect(ctx, 27, 40, 8, 80, 3, '#78350F', '#D97706', 1.5);
        fillShadedPolygon(ctx, [[16, 14], [46, 14], [52, 40], [10, 40]], '#F59E0B', '#FEF3C7', 1.8);
        drawGlowOrb(ctx, 31, 27, 12, '#67E8F9', 'rgba(34, 211, 238, 0)');
      });
      backPart = scene.add.image(0, -68 * s, auraKey).setDisplaySize(128 * s, 138 * s);
      torso = scene.add.image(0, -66 * s, bodyKey).setDisplaySize(114 * s, 138 * s);
      weaponArm = scene.add
        .image(-36 * s, -56 * s, maceKey)
        .setDisplaySize(62 * s, 128 * s)
        .setOrigin(0.5, 0.78);
      break;
    }

    case 'highland_colossus': {
      const monolithKey = makeHiDpiTexture(scene, `${prefix}_cape`, 136, 144, (ctx) => {
        drawGlowOrb(ctx, 68, 48, 44, 'rgba(56, 189, 248, 0.45)', 'rgba(14, 116, 144, 0)');
        // Floating runic shoulder stones
        fillShadedPolygon(ctx, [[12, 34], [36, 18], [42, 54], [14, 58]], '#334155', '#38BDF8', 2);
        fillShadedPolygon(ctx, [[124, 34], [100, 18], [94, 54], [122, 58]], '#334155', '#38BDF8', 2);
      });
      const bodyKey = makeHiDpiTexture(scene, `${prefix}_torso`, 122, 142, (ctx) => {
        fillShadedPolygon(
          ctx,
          [[24, 34], [98, 34], [106, 132], [16, 132]],
          linearGrad(ctx, 24, 34, 98, 132, [[0, '#475569'], [0.6, '#1E293B'], [1, '#0F172A']]),
          '#090A0F',
          2.4
        );
        // Storm rune seams
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(46, 52);
        ctx.lineTo(61, 78);
        ctx.lineTo(76, 52);
        ctx.moveTo(61, 78);
        ctx.lineTo(61, 110);
        ctx.stroke();
        // Stone monolith head
        fillRoundRect(ctx, 42, 12, 38, 26, 4, '#334155', '#38BDF8', 2);
        drawGlowOrb(ctx, 61, 24, 10, '#BAE6FD', 'rgba(56, 189, 248, 0)');
      });
      const hammerKey = makeHiDpiTexture(scene, `${prefix}_weapon`, 68, 132, (ctx) => {
        fillRoundRect(ctx, 30, 36, 8, 90, 3, '#475569', '#0F172A', 1.6);
        fillRoundRect(ctx, 10, 12, 48, 28, 4, '#1E293B', '#38BDF8', 2);
      });
      backPart = scene.add.image(0, -68 * s, monolithKey).setDisplaySize(136 * s, 144 * s);
      torso = scene.add.image(0, -66 * s, bodyKey).setDisplaySize(122 * s, 142 * s);
      weaponArm = scene.add
        .image(-38 * s, -58 * s, hammerKey)
        .setDisplaySize(68 * s, 132 * s)
        .setOrigin(0.5, 0.78);
      break;
    }

    case 'vespera_houndmaster': {
      const cloakKey = makeHiDpiTexture(scene, `${prefix}_cape`, 118, 136, (ctx) => {
        fillShadedPolygon(ctx, [[34, 24], [84, 24], [108, 130], [10, 130]], linearGrad(ctx, 20, 24, 98, 130, [[0, '#7F1D1D'], [1, '#1F1215']]), '#C89B3C', 1.8);
      });
      const bodyKey = makeHiDpiTexture(scene, `${prefix}_torso`, 104, 132, (ctx) => {
        fillShadedPolygon(ctx, [[30, 38], [74, 38], [82, 124], [22, 124]], linearGrad(ctx, 26, 38, 78, 124, [[0, '#44403C'], [1, '#1C1917']]), '#D97706', 2);
        // Iron hound-mask helm
        fillRoundRect(ctx, 37, 14, 30, 26, 6, '#292524', '#C89B3C', 1.8);
        fillShadedPolygon(ctx, [[38, 18], [32, 4], [46, 16]], '#D6D3D1');
        fillShadedPolygon(ctx, [[66, 18], [72, 4], [58, 16]], '#D6D3D1');
        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.arc(46, 26, 2.8, 0, Math.PI * 2);
        ctx.arc(58, 26, 2.8, 0, Math.PI * 2);
        ctx.fill();
      });
      const whipKey = makeHiDpiTexture(scene, `${prefix}_weapon`, 66, 126, (ctx) => {
        fillRoundRect(ctx, 30, 82, 6, 38, 2, '#92400E', '#C89B3C', 1.4);
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(33, 82);
        ctx.bezierCurveTo(10, 62, 54, 42, 18, 12);
        ctx.stroke();
      });
      backPart = scene.add.image(0, -64 * s, cloakKey).setDisplaySize(118 * s, 136 * s);
      torso = scene.add.image(0, -62 * s, bodyKey).setDisplaySize(104 * s, 132 * s);
      weaponArm = scene.add
        .image(-30 * s, -56 * s, whipKey)
        .setDisplaySize(66 * s, 126 * s)
        .setOrigin(0.55, 0.78);
      break;
    }

    case 'pale_cartographer': {
      const astrolabeKey = makeHiDpiTexture(scene, `${prefix}_cape`, 136, 144, (ctx) => {
        drawGlowOrb(ctx, 68, 48, 48, 'rgba(226, 232, 240, 0.35)', 'rgba(148, 163, 184, 0)');
        // Brass astrolabe halo
        ctx.strokeStyle = '#EAB308';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(68, 48, 40, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = '#CBD5E1';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(68, 48, 30, 0.3, Math.PI * 1.85);
        ctx.stroke();
        fillShadedPolygon(ctx, [[34, 56], [102, 56], [116, 138], [20, 138]], linearGrad(ctx, 34, 56, 102, 138, [[0, '#E2E8F0'], [1, '#475569']]), '#1E293B', 2);
      });
      const bodyKey = makeHiDpiTexture(scene, `${prefix}_torso`, 112, 140, (ctx) => {
        fillShadedPolygon(ctx, [[32, 40], [80, 40], [92, 132], [20, 132]], linearGrad(ctx, 28, 40, 84, 132, [[0, '#F1F5F9'], [0.5, '#94A3B8'], [1, '#334155']]), '#1E293B', 2);
        // Pale hooded mask & monocle gleam
        fillShadedPolygon(ctx, [[38, 28], [56, 8], [74, 28], [68, 42], [44, 42]], '#CBD5E1', '#334155', 1.8);
        drawGlowOrb(ctx, 62, 26, 8, '#FDE047', 'rgba(250, 204, 21, 0)');
      });
      const compassBladeKey = makeHiDpiTexture(scene, `${prefix}_weapon`, 60, 134, (ctx) => {
        fillRoundRect(ctx, 27, 84, 6, 42, 2, '#EAB308');
        fillShadedPolygon(ctx, [[24, 84], [36, 84], [30, 8]], '#F8FAFC', '#EAB308', 1.8);
        ctx.strokeStyle = '#EAB308';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(30, 84, 11, 0, Math.PI * 2);
        ctx.stroke();
      });
      backPart = scene.add.image(0, -70 * s, astrolabeKey).setDisplaySize(136 * s, 144 * s);
      torso = scene.add.image(0, -66 * s, bodyKey).setDisplaySize(112 * s, 140 * s);
      weaponArm = scene.add
        .image(-34 * s, -60 * s, compassBladeKey)
        .setDisplaySize(60 * s, 134 * s)
        .setOrigin(0.5, 0.78);
      break;
    }

    case 'sunken_oracle': {
      const mirrorKey = makeHiDpiTexture(scene, `${prefix}_cape`, 134, 144, (ctx) => {
        drawGlowOrb(ctx, 67, 50, 48, 'rgba(45, 212, 191, 0.45)', 'rgba(13, 148, 136, 0)');
        // Mercury mirror halo
        ctx.strokeStyle = '#5EEAD4';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(67, 50, 38, 0, Math.PI * 2);
        ctx.stroke();
        fillShadedPolygon(ctx, [[30, 56], [104, 56], [118, 138], [16, 138]], linearGrad(ctx, 30, 56, 104, 138, [[0, '#115E59'], [1, '#042F2E']]), '#2DD4BF', 2);
      });
      const bodyKey = makeHiDpiTexture(scene, `${prefix}_torso`, 114, 140, (ctx) => {
        fillShadedPolygon(ctx, [[32, 42], [82, 42], [94, 132], [20, 132]], linearGrad(ctx, 28, 42, 86, 132, [[0, '#0D9488'], [0.6, '#134E4A'], [1, '#090A0F']]), '#5EEAD4', 2);
        // Pearlescent veil & triple eye crown
        fillRoundRect(ctx, 41, 16, 32, 28, 12, '#CCFBF1', '#0F766E', 1.8);
        ctx.fillStyle = '#0F766E';
        ctx.beginPath();
        ctx.arc(57, 24, 3.2, 0, Math.PI * 2);
        ctx.arc(49, 32, 2.5, 0, Math.PI * 2);
        ctx.arc(65, 32, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });
      const staffKey = makeHiDpiTexture(scene, `${prefix}_weapon`, 58, 134, (ctx) => {
        fillRoundRect(ctx, 26, 30, 6, 98, 3, '#5EEAD4');
        drawGlowOrb(ctx, 29, 20, 16, '#CCFBF1', 'rgba(20, 184, 166, 0)');
        fillRoundRect(ctx, 21, 12, 16, 16, 8, '#14B8A6', '#CCFBF1', 2);
      });
      backPart = scene.add.image(0, -70 * s, mirrorKey).setDisplaySize(134 * s, 144 * s);
      torso = scene.add.image(0, -66 * s, bodyKey).setDisplaySize(114 * s, 140 * s);
      weaponArm = scene.add
        .image(-34 * s, -60 * s, staffKey)
        .setDisplaySize(58 * s, 134 * s)
        .setOrigin(0.5, 0.78);
      break;
    }

    case 'hollowed_seraph': {
      const wingsKey = makeHiDpiTexture(scene, `${prefix}_cape`, 156, 148, (ctx) => {
        drawGlowOrb(ctx, 78, 52, 54, 'rgba(251, 191, 36, 0.4)', 'rgba(147, 51, 234, 0)');
        // Six fractured seraph wings (three pairs)
        const wingGrad = linearGrad(ctx, 10, 16, 146, 124, [[0, '#312E81'], [0.5, '#1E1B4B'], [1, '#09090B']]);
        fillShadedPolygon(ctx, [[64, 52], [12, 12], [28, 48], [60, 64]], wingGrad, '#F59E0B', 1.8);
        fillShadedPolygon(ctx, [[92, 52], [144, 12], [128, 48], [96, 64]], wingGrad, '#F59E0B', 1.8);
        fillShadedPolygon(ctx, [[62, 68], [6, 58], [22, 88], [58, 78]], wingGrad, '#A855F7', 1.6);
        fillShadedPolygon(ctx, [[94, 68], [150, 58], [134, 88], [98, 78]], wingGrad, '#A855F7', 1.6);
        fillShadedPolygon(ctx, [[62, 82], [16, 102], [32, 126], [62, 92]], wingGrad, '#F59E0B', 1.6);
        fillShadedPolygon(ctx, [[94, 82], [140, 102], [124, 126], [94, 92]], wingGrad, '#F59E0B', 1.6);
        // Split golden halo
        ctx.strokeStyle = '#FBBF24';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(78, 34, 24, 0.25, Math.PI - 0.25);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(78, 34, 24, Math.PI + 0.25, Math.PI * 2 - 0.25);
        ctx.stroke();
      });
      const bodyKey = makeHiDpiTexture(scene, `${prefix}_torso`, 114, 142, (ctx) => {
        fillShadedPolygon(ctx, [[34, 42], [80, 42], [90, 134], [24, 134]], linearGrad(ctx, 28, 42, 86, 134, [[0, '#3B0764'], [0.5, '#1E1B4B'], [1, '#09090B']]), '#F59E0B', 2.2);
        // Hollowed golden visor mask
        fillShadedPolygon(ctx, [[43, 18], [71, 18], [66, 40], [57, 45], [48, 40]], '#FDE68A', '#78350F', 2);
        fillRoundRect(ctx, 49, 25, 16, 5, 2, '#09090B');
        drawGlowOrb(ctx, 57, 66, 14, '#F59E0B', 'rgba(168, 85, 247, 0)');
      });
      const glaiveKey = makeHiDpiTexture(scene, `${prefix}_weapon`, 62, 138, (ctx) => {
        fillRoundRect(ctx, 28, 36, 6, 96, 2, '#D97706');
        fillShadedPolygon(ctx, [[22, 36], [40, 36], [31, 4]], '#FEF08A', '#F59E0B', 2);
      });
      backPart = scene.add.image(0, -72 * s, wingsKey).setDisplaySize(156 * s, 148 * s);
      torso = scene.add.image(0, -66 * s, bodyKey).setDisplaySize(114 * s, 142 * s);
      weaponArm = scene.add
        .image(-36 * s, -60 * s, glaiveKey)
        .setDisplaySize(62 * s, 138 * s)
        .setOrigin(0.5, 0.78);
      break;
    }

    case 'sovereign_eclipse':
    default: {
      // Apex Boss: Eclipse Sun-Halo + Royal Mantle + Crowned Obsidian Plate + Blazing Sun-Scepter
      const haloKey = makeHiDpiTexture(scene, `${prefix}_cape`, 132, 142, (ctx) => {
        drawGlowOrb(ctx, 66, 52, 48, 'rgba(245, 158, 11, 0.48)', 'rgba(126, 34, 206, 0)');
        // Eclipse solar ring
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(66, 52, 38, 0, Math.PI * 2);
        ctx.stroke();
        fillRoundRect(ctx, 40, 26, 52, 52, 26, '#09090B');
        // Royal void mantle
        fillShadedPolygon(ctx, [[34, 62], [98, 62], [116, 136], [16, 136]], linearGrad(ctx, 34, 62, 98, 136, [[0, '#3B0764'], [1, '#09090B']]), '#C89B3C', 2);
      });
      const bodyKey = makeHiDpiTexture(scene, `${prefix}_torso`, 116, 142, (ctx) => {
        const royalGrad = linearGrad(ctx, 28, 36, 88, 128, [[0, '#581C87'], [0.5, '#2E1065'], [1, '#09090B']]);
        fillShadedPolygon(ctx, [[32, 44], [84, 44], [92, 132], [24, 132]], royalGrad, '#C89B3C', 2.4);
        // Triple-spired golden crown & visor
        fillRoundRect(ctx, 43, 24, 30, 22, 6, '#18181B', '#C89B3C', 1.8);
        fillShadedPolygon(ctx, [[42, 24], [46, 6], [52, 24]], '#F59E0B');
        fillShadedPolygon(ctx, [[53, 24], [58, 2], [63, 24]], '#FDE047');
        fillShadedPolygon(ctx, [[64, 24], [70, 6], [74, 24]], '#F59E0B');
        ctx.fillStyle = '#FBBF24';
        ctx.beginPath();
        ctx.arc(52, 34, 3.2, 0, Math.PI * 2);
        ctx.arc(64, 34, 3.2, 0, Math.PI * 2);
        ctx.fill();
      });
      const scepterKey = makeHiDpiTexture(scene, `${prefix}_weapon`, 58, 132, (ctx) => {
        fillRoundRect(ctx, 26, 30, 6, 96, 3, '#C89B3C');
        drawGlowOrb(ctx, 29, 22, 18, '#FEF08A', 'rgba(245, 158, 11, 0)');
        fillRoundRect(ctx, 20, 13, 18, 18, 9, '#F59E0B', '#FEF08A', 2);
      });
      backPart = scene.add.image(0, -72 * s, haloKey).setDisplaySize(132 * s, 142 * s);
      torso = scene.add.image(0, -68 * s, bodyKey).setDisplaySize(116 * s, 142 * s);
      weaponArm = scene.add
        .image(-34 * s, -62 * s, scepterKey)
        .setDisplaySize(58 * s, 132 * s)
        .setOrigin(0.5, 0.75);
      break;
    }
  }

  return { backPart, torso, weaponArm, offhandArm, baseScale: s };
}

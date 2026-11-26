import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Castle,
  Compass,
  Crown,
  Eye,
  Flame,
  Gem,
  HelpCircle,
  Landmark,
  PawPrint,
  ShoppingBag,
  Skull,
  Sparkles,
  Swords,
  Tent,
  Users,
} from 'lucide-react';
import { getRegionBackdropUrl } from '../assets/imageUrls';
import { getContractDef, getFactionDef } from '../data/factions';
import { getRegionDef } from '../data/regions';
import { getNodeTypeMeta, getReachableNodeIds } from '../engine/mapGenerator';
import type { MapNode, MapNodeType, RunState } from '../types/game';

interface ExpeditionMapViewProps {
  run: RunState;
  reducedMotion?: boolean;
  onSelectNode: (nodeId: string) => void;
}

function getNodeVisuals(type: MapNodeType): {
  Icon: typeof Swords;
  accentText: string;
  reachableRing: string;
} {
  switch (type) {
    case 'combat':
      return { Icon: Swords, accentText: 'text-rose-300', reachableRing: 'border-[#C89B3C]' };
    case 'elite':
      return { Icon: Skull, accentText: 'text-amber-300', reachableRing: 'border-amber-400' };
    case 'boss':
      return { Icon: Crown, accentText: 'text-rose-400', reachableRing: 'border-rose-400' };
    case 'rest':
      return { Icon: Flame, accentText: 'text-orange-300', reachableRing: 'border-orange-400' };
    case 'shop':
      return { Icon: ShoppingBag, accentText: 'text-yellow-300', reachableRing: 'border-yellow-400' };
    case 'treasure':
      return { Icon: Gem, accentText: 'text-amber-300', reachableRing: 'border-amber-300' };
    case 'event':
      return { Icon: HelpCircle, accentText: 'text-sky-300', reachableRing: 'border-sky-400' };
    case 'hidden':
      return { Icon: Eye, accentText: 'text-violet-300', reachableRing: 'border-violet-400' };
    case 'shrine':
      return { Icon: Sparkles, accentText: 'text-cyan-300', reachableRing: 'border-cyan-400' };
    case 'library':
      return { Icon: BookOpen, accentText: 'text-indigo-300', reachableRing: 'border-indigo-400' };
    case 'camp':
      return { Icon: Tent, accentText: 'text-emerald-300', reachableRing: 'border-emerald-400' };
    case 'monster_den':
      return { Icon: PawPrint, accentText: 'text-rose-300', reachableRing: 'border-rose-400' };
    case 'stronghold':
      return { Icon: Castle, accentText: 'text-amber-400', reachableRing: 'border-amber-500' };
    case 'companion':
      return { Icon: Users, accentText: 'text-teal-300', reachableRing: 'border-teal-400' };
    case 'cursed_altar':
      return { Icon: Landmark, accentText: 'text-fuchsia-300', reachableRing: 'border-fuchsia-400' };
    case 'challenge':
      return { Icon: AlertTriangle, accentText: 'text-orange-400', reachableRing: 'border-orange-500' };
    case 'crossroads':
      return { Icon: Compass, accentText: 'text-[#C89B3C]', reachableRing: 'border-[#C89B3C]' };
  }
}

function getDangerClass(rating?: string): string {
  switch (rating) {
    case 'Extreme':
      return 'text-rose-400';
    case 'High':
      return 'text-orange-300';
    case 'Moderate':
      return 'text-amber-300';
    case 'Low':
      return 'text-sky-300';
    default:
      return 'text-emerald-300';
  }
}

function buildCurvedPath(x1: number, y1: number, x2: number, y2: number): string {
  const midY = (y1 + y2) / 2;
  return `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
}

export function ExpeditionMapView({
  run,
  reducedMotion = false,
  onSelectNode,
}: ExpeditionMapViewProps) {
  const region = getRegionDef(run.regionId);
  const reachableList = getReachableNodeIds(run.map);
  const reachable = useMemo(() => new Set(reachableList), [reachableList]);
  const nodes = Object.values(run.map.nodes).filter((n) => n.revealed);
  const hiddenTotal = Object.values(run.map.nodes).filter((n) => n.isHiddenBranch).length;
  const hiddenRevealed = Object.values(run.map.nodes).filter(
    (n) => n.isHiddenBranch && n.revealed
  ).length;

  const defaultInspectId = reachableList[0] ?? run.map.currentNodeId ?? run.map.bossNodeId;
  const [inspectedId, setInspectedId] = useState<string>(defaultInspectId);

  const inspectedNode: MapNode | undefined =
    run.map.nodes[inspectedId] ?? run.map.nodes[defaultInspectId] ?? nodes[0];
  const inspectedMeta = inspectedNode ? getNodeTypeMeta(inspectedNode.type) : null;
  const inspectedIsReachable = inspectedNode ? reachable.has(inspectedNode.id) : false;
  const activeContractDef = run.activeContract
    ? getContractDef(run.activeContract.contractId)
    : undefined;

  return (
    <div className="flex-1 flex flex-col bg-[#0B0C10] px-4 sm:px-8 py-5">
      <div className="max-w-7xl w-full mx-auto flex-1 flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs text-[#C89B3C] font-medium">
              Act {region.tier} · {region.subtitle}
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#F3EFE6]">
              {region.name}
            </h1>
            <p className="text-xs sm:text-sm text-[#9499A8] mt-1">
              Hover or focus any waypoint to inspect its hazards, then enter a reachable route.
            </p>
          </div>
          <div className="text-xs text-[#9499A8] tabular-nums">
            Nodes Cleared: {run.nodesCleared} · Secrets Charted: {hiddenRevealed}/{hiddenTotal} ·
            Difficulty: <span className="capitalize text-[#E6E2D8]">{run.difficulty}</span>
          </div>
        </div>

        {run.activeContract && activeContractDef && (
          <div className="rounded-md border border-[#282D3D] bg-[#111520] px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[#C89B3C] font-semibold">Contract:</span>
              <span className="text-[#F3EFE6] font-medium">{activeContractDef.title}</span>
              <span className="text-[#9499A8]">· {activeContractDef.description}</span>
            </div>
            <div className="flex items-center gap-3 font-mono-tabular shrink-0">
              <span
                className={
                  run.activeContract.failed
                    ? 'text-rose-400 font-semibold'
                    : run.activeContract.completed
                    ? 'text-emerald-400 font-semibold'
                    : 'text-amber-300 font-semibold'
                }
              >
                {run.activeContract.failed
                  ? 'Failed'
                  : run.activeContract.completed
                  ? 'Completed'
                  : `${run.activeContract.progress}/${run.activeContract.target} · In Progress`}
              </span>
              <span className="text-[#9499A8]">
                +{activeContractDef.rewardGold}G · +{activeContractDef.rewardShards}S
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 items-stretch">
          {/* Interactive Map Canvas */}
          <div className="lg:col-span-8 relative min-h-[400px] sm:min-h-[540px] rounded-lg border border-[#232734] bg-[#10131C] overflow-hidden">
            <img
              src={getRegionBackdropUrl(region.id)}
              alt={region.name}
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover opacity-18 pointer-events-none"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0C10]/85 via-transparent to-[#0B0C10]/65 pointer-events-none" />

            {/* SVG Curved Directional Routes */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <defs>
                <marker
                  id="routeArrowActive"
                  viewBox="0 0 6 6"
                  refX="4.5"
                  refY="3"
                  markerWidth="2.8"
                  markerHeight="2.8"
                  orient="auto"
                >
                  <path d="M 0 0 L 6 3 L 0 6 z" fill="#C89B3C" />
                </marker>
              </defs>

              {nodes.map((node) =>
                node.connections
                  .filter((targetId) => run.map.nodes[targetId]?.revealed)
                  .map((targetId) => {
                    const target = run.map.nodes[targetId];
                    const isActiveEdge =
                      (run.map.currentNodeId === node.id ||
                        (!run.map.currentNodeId && run.map.startNodeIds.includes(target.id))) &&
                      reachable.has(target.id);
                    const isTraversed = node.visited && target.visited;
                    const pathD = buildCurvedPath(node.xPct, node.yPct, target.xPct, target.yPct);

                    return (
                      <path
                        key={`${node.id}-${targetId}`}
                        d={pathD}
                        fill="none"
                        stroke={
                          isActiveEdge
                            ? '#C89B3C'
                            : isTraversed
                            ? '#6B7280'
                            : target.isHiddenBranch
                            ? '#7C3AED'
                            : '#2B3245'
                        }
                        strokeWidth={isActiveEdge ? 0.62 : 0.36}
                        strokeOpacity={isActiveEdge ? 0.95 : isTraversed ? 0.8 : 0.72}
                        strokeDasharray={target.isHiddenBranch ? '1.2 1.1' : undefined}
                        markerEnd={isActiveEdge ? 'url(#routeArrowActive)' : undefined}
                      />
                    );
                  })
              )}
            </svg>

            {/* Interactive Waypoint Nodes */}
            {nodes.map((node) => {
              const visuals = getNodeVisuals(node.type);
              const Icon = node.isSecretBoss ? Crown : visuals.Icon;
              const isCurrent = run.map.currentNodeId === node.id;
              const isReachable = reachable.has(node.id);
              const isInspected = inspectedNode?.id === node.id;
              const isBoss = node.type === 'boss';
              const isApex = Boolean(node.isLegendary || node.isSecretBoss);

              return (
                <button
                  key={node.id}
                  type="button"
                  onMouseEnter={() => setInspectedId(node.id)}
                  onFocus={() => setInspectedId(node.id)}
                  onClick={() => {
                    const isCoarsePointer =
                      typeof window !== 'undefined' &&
                      window.matchMedia('(pointer: coarse)').matches;
                    if (isCoarsePointer && inspectedId !== node.id) {
                      setInspectedId(node.id);
                      return;
                    }
                    setInspectedId(node.id);
                    if (isReachable) {
                      onSelectNode(node.id);
                    }
                  }}
                  aria-label={`${node.label}${isReachable ? ' (Reachable)' : ''}`}
                  style={{
                    left: `${node.xPct}%`,
                    top: `${node.yPct}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className={`absolute min-w-[44px] min-h-[44px] flex flex-col items-center justify-center gap-1 group touch-manipulation focus-visible:outline-2 focus-visible:outline-[#C89B3C] ${
                    isReachable ? 'cursor-pointer z-20' : 'cursor-pointer z-10'
                  }`}
                >
                  <div
                    className={`flex items-center justify-center rounded-full border-2 ${
                      reducedMotion ? '' : 'transition-transform duration-150'
                    } ${isBoss || isApex ? 'w-12 h-12 sm:w-14 sm:h-14' : 'w-10 h-10 sm:w-11 sm:h-11'} ${
                      isCurrent
                        ? 'bg-[#C89B3C] border-[#FDE68A] text-[#0B0C10] scale-110 shadow-lg shadow-amber-900/40'
                        : isReachable
                        ? node.isSecretBoss
                          ? 'bg-[#1D122C] border-violet-400 text-violet-300 hover:scale-110 shadow-lg shadow-black/70'
                          : node.isLegendary
                          ? 'bg-[#221912] border-amber-400 text-amber-300 hover:scale-110 shadow-lg shadow-black/70'
                          : `bg-[#1B202E] ${visuals.reachableRing} ${visuals.accentText} hover:scale-110 shadow-lg shadow-black/70`
                        : node.visited
                        ? 'bg-[#171A22] border-[#4B5563] text-[#6B7280]'
                        : isInspected
                        ? 'bg-[#161A25] border-[#78829E] text-[#CFCBC0]'
                        : node.isSecretBoss
                        ? 'bg-[#1A1128]/95 border-violet-400/75 text-violet-300'
                        : node.isLegendary
                        ? 'bg-[#201710]/95 border-amber-500/70 text-amber-300'
                        : node.isHiddenBranch
                        ? 'bg-[#191326]/95 border-violet-500/60 text-violet-300'
                        : 'bg-[#11141D]/90 border-[#262B3A] text-[#7D8394] opacity-85'
                    }`}
                  >
                    <Icon className={isBoss || isApex ? 'w-5 h-5 sm:w-6 sm:h-6' : 'w-4 h-4 sm:w-5 sm:h-5'} />
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-medium whitespace-nowrap bg-[#0B0C10]/90 ${
                      isReachable
                        ? 'text-[#F5E6C4]'
                        : isCurrent
                        ? 'text-[#C89B3C]'
                        : node.isSecretBoss
                        ? 'text-violet-300'
                        : node.isLegendary
                        ? 'text-amber-300'
                        : node.isHiddenBranch
                        ? 'text-violet-300'
                        : 'text-[#8C92A3]'
                    }`}
                  >
                    {node.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Interactive Location Inspection Panel */}
          <aside className="lg:col-span-4 rounded-lg border border-[#232734] bg-[#11141C] p-5 flex flex-col justify-between gap-5">
            {inspectedNode && inspectedMeta ? (
              <div className="space-y-4">
                <div className="border-b border-[#202432] pb-3.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-[#C89B3C] font-medium capitalize">
                      {inspectedNode.isSecretBoss
                        ? 'Secret Boss Sanctum'
                        : inspectedNode.isLegendary
                        ? 'Legendary Hunt'
                        : inspectedNode.type.replace('_', ' ')}
                      {inspectedNode.isHiddenBranch ? ' · Hidden Route' : ''}
                    </span>
                    <span
                      className={`font-semibold ${getDangerClass(
                        inspectedNode.dangerRating ?? inspectedMeta.dangerRating
                      )}`}
                    >
                      Hazard: {inspectedNode.dangerRating ?? inspectedMeta.dangerRating}
                    </span>
                  </div>
                  <h2 className="font-display text-xl font-bold text-[#F3EFE6] mt-1">
                    {inspectedNode.label}
                  </h2>
                  {inspectedNode.factionId && (
                    <div className="text-xs text-[#9499A8] mt-0.5">
                      Territory: {getFactionDef(inspectedNode.factionId).name}
                    </div>
                  )}
                </div>

                <p className="text-sm text-[#CFCBC0] leading-relaxed">
                  {inspectedNode.description ?? inspectedMeta.description}
                </p>

                <div className="rounded-md border border-[#222736] bg-[#151923] p-3.5 space-y-2 text-xs">
                  <div className="text-[#9499A8] font-medium">Expected Rewards &amp; Effects</div>
                  <div className="text-[#E6E2D8] font-medium">
                    {inspectedNode.rewardPreview ?? inspectedMeta.rewardPreview}
                  </div>
                  {(inspectedNode.secretConditionHint ?? inspectedMeta.secretConditionHint) && (
                    <div className="pt-2 border-t border-[#222736] text-violet-300">
                      {inspectedNode.secretConditionHint ?? inspectedMeta.secretConditionHint}
                    </div>
                  )}
                </div>

                <div className="text-xs text-[#9499A8]">
                  Status:{' '}
                  {inspectedNode.id === run.map.currentNodeId ? (
                    <span className="text-[#C89B3C] font-medium">Current Position</span>
                  ) : inspectedIsReachable ? (
                    <span className="text-emerald-400 font-medium">
                      Reachable from current trail
                    </span>
                  ) : inspectedNode.visited ? (
                    <span className="text-[#9499A8]">Already Explored</span>
                  ) : (
                    <span className="text-[#8E94A6]">Ahead on the expedition path</span>
                  )}
                </div>
              </div>
            ) : null}

            <div className="space-y-3 pt-4 border-t border-[#202432]">
              {inspectedNode && inspectedIsReachable ? (
                <button
                  type="button"
                  onClick={() => onSelectNode(inspectedNode.id)}
                  className="w-full min-h-[44px] px-5 py-2.5 rounded-md bg-[#C89B3C] hover:bg-[#D8AD4E] text-[#0B0C10] text-sm font-semibold cursor-pointer whitespace-nowrap"
                >
                  Enter {inspectedNode.label}
                </button>
              ) : (
                <div className="text-xs text-[#8E94A6]">
                  Click a gold-bordered waypoint on the map to advance your expedition.
                </div>
              )}

              <div className="text-[11px] text-[#8E94A6] leading-relaxed">
                Tip: Visit <strong className="text-[#CFCBC0]">Crossroads</strong> waypoints to chart
                dashed <strong className="text-violet-300">Hidden Branches</strong> and secret
                chambers.
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

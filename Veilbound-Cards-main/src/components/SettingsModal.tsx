import { useState } from 'react';
import { Volume2, VolumeX, X } from 'lucide-react';
import type { GameSettings } from '../types/game';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdate: (next: GameSettings) => void;
  onResetSave: () => void;
  onClose: () => void;
}

export function SettingsModal({
  settings,
  onUpdate,
  onResetSave,
  onClose,
}: SettingsModalProps) {
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
    >
      <div className="w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-lg border border-[#2A2F3E] bg-[#12151E] p-5 sm:p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-[#232734]">
          <h2 className="font-display text-xl font-semibold text-[#F3EFE6]">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-[#9499A8] hover:text-white hover:bg-[#1E2230] transition-colors cursor-pointer"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-5 space-y-5">
          {/* Audio Mute & Volume */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-[#E6E2D8]">Audio Output</div>
              <div className="text-xs text-[#9499A8]">Synthesized sound effects and ambient score</div>
            </div>
            <button
              type="button"
              onClick={() => onUpdate({ ...settings, muted: !settings.muted })}
              className="min-h-[44px] px-4 py-2 rounded-md border border-[#2E3446] bg-[#191D28] hover:bg-[#222736] text-xs font-medium flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {settings.muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-[#C89B3C]" />}
              {settings.muted ? 'Muted' : 'Active'}
            </button>
          </div>

          <div className="space-y-3">
            <label className="block">
              <div className="flex justify-between text-xs text-[#B5B9C4] mb-1">
                <span>Master Volume</span>
                <span className="font-mono-tabular">{Math.round(settings.masterVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.masterVolume}
                onChange={(e) => onUpdate({ ...settings, masterVolume: Number(e.target.value) })}
                className="w-full accent-[#C89B3C]"
              />
            </label>

            <label className="block">
              <div className="flex justify-between text-xs text-[#B5B9C4] mb-1">
                <span>Sound Effects</span>
                <span className="font-mono-tabular">{Math.round(settings.sfxVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.sfxVolume}
                onChange={(e) => onUpdate({ ...settings, sfxVolume: Number(e.target.value) })}
                className="w-full accent-[#C89B3C]"
              />
            </label>

            <label className="block">
              <div className="flex justify-between text-xs text-[#B5B9C4] mb-1">
                <span>Ambient Music</span>
                <span className="font-mono-tabular">{Math.round(settings.musicVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.musicVolume}
                onChange={(e) => onUpdate({ ...settings, musicVolume: Number(e.target.value) })}
                className="w-full accent-[#C89B3C]"
              />
            </label>

            <label className="block">
              <div className="flex justify-between text-xs text-[#B5B9C4] mb-1">
                <span>Environmental Ambience</span>
                <span className="font-mono-tabular">
                  {Math.round((settings.ambientVolume ?? 0.45) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.ambientVolume ?? 0.45}
                onChange={(e) => onUpdate({ ...settings, ambientVolume: Number(e.target.value) })}
                className="w-full accent-[#C89B3C]"
              />
            </label>
          </div>

          <div className="h-px bg-[#232734]" />

          {/* Gameplay & Visual Toggles */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div>
                  <div className="text-sm font-medium text-[#E6E2D8]">Combat Pacing</div>
                  <div className="text-xs text-[#9499A8]">
                    Adjust enemy preparation and turn animation speed
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'deliberate', label: 'Deliberate' },
                    { id: 'normal', label: 'Normal' },
                    { id: 'fast', label: 'Fast' },
                  ] as const
                ).map((opt) => {
                  const activeMode =
                    settings.combatSpeed ?? (settings.fastAnimations ? 'fast' : 'normal');
                  const isActive = activeMode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        onUpdate({
                          ...settings,
                          combatSpeed: opt.id,
                          fastAnimations: opt.id === 'fast',
                        })
                      }
                      className={`min-h-[44px] px-3 py-2 rounded-md border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                        isActive
                          ? 'bg-[#C89B3C] border-[#C89B3C] text-[#0B0C10] font-semibold'
                          : 'bg-[#191D28] border-[#2E3446] text-[#CFCBC0] hover:bg-[#222736]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div>
                  <div className="text-sm font-medium text-[#E6E2D8]">Graphics Quality</div>
                  <div className="text-xs text-[#9499A8]">
                    Scale particle density and screen shake for battery or performance
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'high', label: 'High' },
                    { id: 'balanced', label: 'Balanced' },
                    { id: 'lite', label: 'Lite' },
                  ] as const
                ).map((opt) => {
                  const activeQuality = settings.graphicsQuality ?? 'balanced';
                  const isActive = activeQuality === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        onUpdate({
                          ...settings,
                          graphicsQuality: opt.id,
                        })
                      }
                      className={`min-h-[44px] px-3 py-2 rounded-md border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                        isActive
                          ? 'bg-[#C89B3C] border-[#C89B3C] text-[#0B0C10] font-semibold'
                          : 'bg-[#191D28] border-[#2E3446] text-[#CFCBC0] hover:bg-[#222736]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex items-center justify-between gap-4 cursor-pointer min-h-[44px]">
              <div>
                <div className="text-sm font-medium text-[#E6E2D8]">Reduced Motion</div>
                <div className="text-xs text-[#9499A8]">Disable camera shake and ambient floating particles</div>
              </div>
              <input
                type="checkbox"
                checked={settings.reducedMotion}
                onChange={(e) => onUpdate({ ...settings, reducedMotion: e.target.checked })}
                className="w-5 h-5 accent-[#C89B3C]"
              />
            </label>

            <label className="flex items-center justify-between gap-4 cursor-pointer min-h-[44px]">
              <div>
                <div className="text-sm font-medium text-[#E6E2D8]">Confirm End Turn</div>
                <div className="text-xs text-[#9499A8]">Ask before ending turn when Energy remains</div>
              </div>
              <input
                type="checkbox"
                checked={settings.confirmEndTurn}
                onChange={(e) => onUpdate({ ...settings, confirmEndTurn: e.target.checked })}
                className="w-5 h-5 accent-[#C89B3C]"
              />
            </label>
          </div>

          <div className="h-px bg-[#232734]" />

          {/* Safe Reset Save */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-rose-300">Erase Local Save</div>
              <div className="text-xs text-[#9499A8]">Clears all unlocks, Soul Shards, and active expeditions</div>
            </div>
            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="min-h-[44px] px-4 py-2 rounded-md border border-rose-900/70 bg-rose-950/30 hover:bg-rose-950/60 text-xs font-medium text-rose-300 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Reset Save
              </button>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="min-h-[44px] px-3 py-2 rounded-md border border-[#2E3446] text-xs text-[#B5B9C4] whitespace-nowrap cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onResetSave();
                    setConfirmReset(false);
                  }}
                  className="min-h-[44px] px-3 py-2 rounded-md bg-rose-700 hover:bg-rose-600 text-xs font-medium text-white whitespace-nowrap cursor-pointer"
                >
                  Confirm Erase
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-[#232734] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-5 py-2 rounded-md bg-[#C89B3C] hover:bg-[#D8AD4E] text-[#0B0C10] text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useReducer } from 'react';
import {
  appReducer,
  createInitialState,
  type AppScreen
} from '../domain/state';
import { loadSave, writeSave } from '../platform/persistence/saveRepository';
import { handleGlobalShortcut } from '../platform/input/keyboard';

function getStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function getInitialState() {
  const state = createInitialState();
  const storage = getStorage();
  if (!storage) return state;
  const save = loadSave(storage);
  return save
    ? { ...state, settings: save.settings, profile: save.profile }
    : state;
}

const screenLabels: Record<AppScreen, string> = {
  'main-menu': 'Continue',
  sanctuary: 'Sanctuary',
  bestiary: 'Bestiary'
};

export function App() {
  const [state, dispatch] = useReducer(appReducer, undefined, getInitialState);
  const navigate = (screen: AppScreen) => dispatch({ type: 'screen/changed', screen });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => handleGlobalShortcut(event, navigate);
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const storage = getStorage();
    if (storage) writeSave(storage, state.settings, state.profile);
  }, [state.settings, state.profile]);

  return (
    <main className={`app-shell screen-${state.screen}`}>
      <div className="scene-art" aria-hidden="true" />
      <div className="scene-shade" aria-hidden="true" />
      <div className="scene-grain" aria-hidden="true" />

      <header className="topbar">
        <a className="wordmark" href="#home" onClick={(event) => {
          event.preventDefault();
          navigate('main-menu');
        }}>
          <span className="wordmark-mark" aria-hidden="true">V</span>
          <span className="wordmark-name">VEILBOUND</span>
          <span className="wordmark-subtitle">ASHEN CROWN</span>
        </a>
        <div className="topbar-right">
          <span className="world-status"><i /> THE VEIL IS QUIET</span>
          <span className="profile-chip" aria-label={`${state.profile.soulShards} Soul Shards`}>
            <span className="chip-rune">✧</span>
            <strong>{state.profile.soulShards}</strong>
            <span>SHARDS</span>
          </span>
        </div>
      </header>

      <section className="content-frame" aria-live="polite">
        <div className="hero-copy">
          {state.screen === 'main-menu' && (
            <>
              <p className="eyebrow"><span /> A WORLD ON THE EDGE OF RUIN</p>
              <h1>THE WORLD<br />HAS <em>FORGOTTEN</em><br />YOUR NAME.</h1>
              <p className="intro-copy">
                Beyond the veil lie fallen kingdoms, forgotten gods, and paths
                that remember every choice. Your journey begins in the ashes.
              </p>
              <div className="menu-actions">
                <button className="primary-button" onClick={() => navigate('sanctuary')}>
                  <span className="button-mark">✦</span>
                  <span>ENTER THE SANCTUARY</span>
                  <span className="button-arrow">↗</span>
                </button>
                <button className="secondary-button" onClick={() => navigate('bestiary')}>
                  <span className="secondary-dash" />
                  EXPLORE THE BESTIARY
                </button>
              </div>
              <div className="chapter-note">
                <span className="chapter-line" />
                <span>CHAPTER I</span>
                <span className="chapter-separator">/</span>
                <span>THE ASHEN CROWN</span>
              </div>
            </>
          )}

          {state.screen === 'sanctuary' && (
            <div className="subscreen-copy">
              <p className="eyebrow"><span /> THE LAST PLACE OF REFUGE</p>
              <h1>THE<br /><em>SANCTUARY.</em></h1>
              <p className="intro-copy">A fragile refuge at the edge of a broken world. Here, your legacy will take shape as the journey grows.</p>
              <button className="secondary-button return-button" onClick={() => navigate('main-menu')}>← RETURN TO THE MAIN MENU</button>
            </div>
          )}

          {state.screen === 'bestiary' && (
            <div className="subscreen-copy">
              <p className="eyebrow"><span /> FRAGMENTS OF THE KNOWN WORLD</p>
              <h1>THE<br /><em>BESTIARY.</em></h1>
              <p className="intro-copy">A record of the creatures, legends, and forgotten things waiting beyond the veil.</p>
              <button className="secondary-button return-button" onClick={() => navigate('main-menu')}>← RETURN TO THE MAIN MENU</button>
            </div>
          )}
        </div>

        <nav className="main-nav" aria-label="Game sections">
          <p className="nav-heading">YOUR JOURNEY</p>
          {(Object.keys(screenLabels) as AppScreen[]).map((screen) => (
            <button
              className={state.screen === screen ? 'nav-item active' : 'nav-item'}
              key={screen}
              onClick={() => navigate(screen)}
              aria-current={state.screen === screen ? 'page' : undefined}
            >
              <span className="nav-indicator" />
              <span>{screenLabels[screen]}</span>
              {screen === 'main-menu' && <span className="nav-key">ESC</span>}
            </button>
          ))}
          <div className="nav-divider" />
          <p className="nav-caption">THE FIRST EMBERS ARE KINDLING</p>
        </nav>

        <div className="scene-caption">
          <span className="caption-rule" />
          <span>THE FORGOTTEN KINGDOMS</span>
          <span className="caption-coordinates">01 — 07</span>
        </div>
      </section>

      <footer className="footer">
        <span>VEILBOUND <i>·</i> ASHEN CROWN</span>
        <span className="footer-center">A JOURNEY THROUGH THE VEIL</span>
        <span>FOUNDATION BUILD <i>·</i> PHASE 1</span>
      </footer>
    </main>
  );
}

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
  'main-menu': 'Main menu',
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
    <main className="app-shell">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />

      <header className="topbar">
        <a className="wordmark" href="#home" onClick={(event) => {
          event.preventDefault();
          navigate('main-menu');
        }}>
          <span className="wordmark-mark" aria-hidden="true">V</span>
          <span>VEILBOUND</span>
        </a>
        <span className="topbar-caption">ASHEN CROWN <i /> REBUILD</span>
      </header>

      <section className="content-frame" aria-live="polite">
        <nav className="side-nav" aria-label="Game sections">
          {(Object.keys(screenLabels) as AppScreen[]).map((screen) => (
            <button
              className={state.screen === screen ? 'nav-item active' : 'nav-item'}
              key={screen}
              onClick={() => navigate(screen)}
              aria-current={state.screen === screen ? 'page' : undefined}
            >
              <span className="nav-dot" />
              {screenLabels[screen]}
            </button>
          ))}
        </nav>

        <section className="main-panel">
          {state.screen === 'main-menu' && (
            <div className="welcome-panel">
              <p className="eyebrow">A WORLD THAT REMEMBERS</p>
              <h1>Beyond the veil,<br /><em>the journey begins.</em></h1>
              <p className="intro-copy">
                A new foundation is taking shape for a dark-fantasy journey of
                heroes, branching expeditions, and tactical card battles.
              </p>
              <div className="action-row">
                <button className="primary-button" onClick={() => navigate('sanctuary')}>
                  Enter the Sanctuary <span aria-hidden="true">↗</span>
                </button>
                <button className="quiet-button" onClick={() => navigate('bestiary')}>
                  View the Bestiary
                </button>
              </div>
              <div className="foundation-note">
                <span className="status-orb" />
                <span>Foundation online</span>
                <span className="note-divider">/</span>
                <span>Gameplay systems arrive in later phases</span>
              </div>
            </div>
          )}

          {state.screen === 'sanctuary' && (
            <div className="placeholder-panel">
              <p className="eyebrow">THE LAST PLACE OF REFUGE</p>
              <h1>The Sanctuary</h1>
              <p className="intro-copy">
                This hub will connect hero mastery, Soul Shards, quests, and
                the persistent world. Its systems are scheduled for later phases.
              </p>
              <button className="quiet-button" onClick={() => navigate('main-menu')}>Return to menu</button>
            </div>
          )}

          {state.screen === 'bestiary' && (
            <div className="placeholder-panel">
              <p className="eyebrow">FRAGMENTS OF THE KNOWN WORLD</p>
              <h1>The Bestiary</h1>
              <p className="intro-copy">
                Discoveries, enemies, and secrets will be recorded here once
                the expedition and content systems are built.
              </p>
              <button className="quiet-button" onClick={() => navigate('main-menu')}>Return to menu</button>
            </div>
          )}
        </section>

        <aside className="profile-panel" aria-label="Profile overview">
          <p className="eyebrow">YOUR LEGACY</p>
          <div className="shard-count">
            <span className="shard-symbol" aria-hidden="true">✧</span>
            <strong>{state.profile.soulShards}</strong>
          </div>
          <span className="profile-label">Soul Shards</span>
          <div className="profile-divider" />
          <p className="profile-label">Available heroes</p>
          <strong className="profile-value">{state.profile.unlockedHeroIds.length}</strong>
          <p className="profile-footnote">Your progress is saved on this device.</p>
        </aside>
      </section>

      <footer className="footer">
        <span>VEILBOUND: ASHEN CROWN</span>
        <span>FOUNDATION BUILD · PHASE 1</span>
      </footer>
    </main>
  );
}

import type { AppScreen } from '../../domain/state';

export function handleGlobalShortcut(
  event: KeyboardEvent,
  navigate: (screen: AppScreen) => void
): void {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key === 'Escape') {
    navigate('main-menu');
  }
}

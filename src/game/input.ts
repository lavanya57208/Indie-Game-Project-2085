// Unified input manager — keyboard + touch
export type InputAction = 'jump' | 'slide' | 'left' | 'right' | 'pause' | 'restart' | 'ability';

interface InputState {
  actions: Set<InputAction>;
  justPressed: Set<InputAction>;
  touchStart: { x: number; y: number; t: number } | null;
  sensitivity: number;
}

class InputManager {
  private state: InputState = {
    actions: new Set(),
    justPressed: new Set(),
    touchStart: null,
    sensitivity: 1,
  };
  private keyMap: Record<string, InputAction> = {
    ArrowUp: 'jump', KeyW: 'jump', Space: 'jump',
    ArrowDown: 'slide', KeyS: 'slide',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    KeyP: 'pause', Escape: 'pause',
    KeyR: 'restart',
    KeyQ: 'ability', ShiftLeft: 'ability',
  };
  private listeners: ((a: InputAction) => void)[] = [];
  private touchEl: HTMLElement | null = null;
  private bound = false;

  init(el: HTMLElement) {
    this.touchEl = el;
    if (this.bound) return;
    this.bound = true;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    el.addEventListener('touchstart', this.onTouchStart, { passive: false });
    el.addEventListener('touchend', this.onTouchEnd, { passive: false });
    el.addEventListener('touchmove', this.onTouchMove, { passive: false });
  }

  destroy() {
    if (!this.bound) return;
    this.bound = false;
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    if (this.touchEl) {
      this.touchEl.removeEventListener('touchstart', this.onTouchStart);
      this.touchEl.removeEventListener('touchend', this.onTouchEnd);
      this.touchEl.removeEventListener('touchmove', this.onTouchMove);
    }
  }

  setSensitivity(s: number) { this.state.sensitivity = s; }

  onAction(cb: (a: InputAction) => void) { this.listeners.push(cb); }

  private onKeyDown = (e: KeyboardEvent) => {
    const action = this.keyMap[e.code];
    if (action) {
      e.preventDefault();
      if (!this.state.actions.has(action)) {
        this.state.justPressed.add(action);
        this.listeners.forEach(l => l(action));
      }
      this.state.actions.add(action);
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    const action = this.keyMap[e.code];
    if (action) this.state.actions.delete(action);
  };

  private onTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    const t = e.touches[0];
    this.state.touchStart = { x: t.clientX, y: t.clientY, t: Date.now() };
  };

  private onTouchMove = (e: TouchEvent) => { e.preventDefault(); };

  private onTouchEnd = (e: TouchEvent) => {
    e.preventDefault();
    if (!this.state.touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - this.state.touchStart.x;
    const dy = t.clientY - this.state.touchStart.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const elapsed = Date.now() - this.state.touchStart.t;

    if (dist < 20 && elapsed < 300) {
      this.dispatch('jump');
    } else if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 40) this.dispatch('right');
      else if (dx < -40) this.dispatch('left');
    } else {
      if (dy > 40) this.dispatch('slide');
      else if (dy < -40) this.dispatch('jump');
    }
    this.state.touchStart = null;
  };

  private dispatch(a: InputAction) {
    this.state.justPressed.add(a);
    this.listeners.forEach(l => l(a));
  }

  isPressed(a: InputAction): boolean { return this.state.actions.has(a); }
  consume(a: InputAction): boolean {
    if (this.state.justPressed.has(a)) {
      this.state.justPressed.delete(a);
      return true;
    }
    return false;
  }

  clearJustPressed() { this.state.justPressed.clear(); }
}

export const input = new InputManager();

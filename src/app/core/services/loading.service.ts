import { Injectable, computed, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private count = signal(0);
  readonly message = signal('Cargando...');
  isLoading = computed(() => this.count() > 0);
  show() { this.count.update(n => n + 1); }
  hide() {
    this.count.update(n => Math.max(0, n - 1));
    if (this.count() === 0) this.message.set('Cargando...');
  }
  setMessage(msg: string) { this.message.set(msg); }
}

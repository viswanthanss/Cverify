import { Injectable, signal } from '@angular/core';

export interface Toast { id: number; message: string; type: 'success' | 'error' | 'info'; }

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _counter = 0;
  readonly toasts = signal<Toast[]>([]);

  show(message: string, type: Toast['type'] = 'info', duration = 3500): void {
    const id = ++this._counter;
    this.toasts.update(t => [...t, { id, message, type }]);
    setTimeout(() => this.toasts.update(t => t.filter(x => x.id !== id)), duration);
  }
}

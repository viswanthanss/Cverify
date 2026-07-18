import { Component } from '@angular/core';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  template: `
    <div class="toast-container">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast {{ t.type }}">{{ t.message }}</div>
      }
    </div>
  `,
})
export class ToastComponent {
  constructor(public toast: ToastService) {}
}

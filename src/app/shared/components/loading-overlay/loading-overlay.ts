import { Component, inject } from '@angular/core';
import { LoadingService } from '../../../core/services/loading.service';

@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  template: `
    @if (loading.isLoading()) {
      <div class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div class="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4">
          <div class="animate-spin rounded-full h-12 w-12 border-4 border-blue-100 border-t-blue-600"></div>
          <span class="text-sm text-gray-500 font-medium">{{ loading.message() }}</span>
        </div>
      </div>
    }
  `
})
export class LoadingOverlayComponent {
  protected readonly loading = inject(LoadingService);
}

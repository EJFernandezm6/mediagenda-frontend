import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ButtonComponent],
  template: `
    <div class="sm:flex sm:items-center justify-between mb-4">
      <div class="sm:flex-auto">
        <h1 class="text-xl font-bold text-text-main leading-tight">{{ title() }}</h1>
        <p *ngIf="subtitle()" class="mt-0.5 text-xs text-text-muted font-normal">{{ subtitle() }}</p>
      </div>
      <div *ngIf="buttonText()" class="mt-2 sm:ml-16 sm:mt-0 sm:flex-none">
        <app-button 
          (onClick)="actionClick.emit()" 
          variant="accent" 
          [size]="largeButton() ? 'md' : 'sm'"
          [class]="largeButton() ? 'px-6 py-3 text-sm font-bold' : ''">
          <lucide-icon *ngIf="buttonIcon()" [img]="buttonIcon()" class="w-4 h-4 mr-2"></lucide-icon>
          {{ buttonText() }}
        </app-button>
      </div>
    </div>
  `
})
export class PageHeaderComponent {
  title = input.required<string>();
  subtitle = input<string>();
  buttonText = input<string>();
  buttonIcon = input<any>();
  largeButton = input<boolean>(false);
  actionClick = output<void>();
}

import { Component, input, output, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Search, X } from 'lucide-angular';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-search-input',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule],
  template: `
    <div class="relative w-full">
      <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <lucide-icon [img]="icons.Search" class="h-4 w-4 text-text-light"></lucide-icon>
      </div>
      <input 
        #searchInput
        [value]="currentValue()" 
        (input)="onInputChange($event)"
        type="text" 
        class="pl-11 w-full"
        [placeholder]="placeholder()">
      
      <button 
        *ngIf="currentValue()" 
        (click)="clear()"
        class="absolute inset-y-0 right-0 pr-4 flex items-center text-text-light hover:text-text-main transition-colors">
        <lucide-icon [img]="icons.X" class="h-3.5 w-3.5"></lucide-icon>
      </button>
    </div>
  `
})
export class SearchInputComponent {
  placeholder = input<string>('Buscar...');
  initialValue = input<string>('');
  search = output<string>();

  currentValue = signal('');
  readonly icons = { Search, X };

  private searchSubject = new Subject<string>();
  private subscription?: Subscription;

  constructor() {
    effect(() => {
      this.currentValue.set(this.initialValue());
    }, { allowSignalWrites: true });

    this.subscription = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(value => {
      this.search.emit(value);
    });
  }

  onInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    // Solo permitir letras, números y espacios
    const sanitized = value.replace(/[^a-zA-Z0-9\sñÑáéíóúÁÉÍÓÚ]/g, '');
    
    if (value !== sanitized) {
      input.value = sanitized;
    }
    
    this.currentValue.set(sanitized);
    this.searchSubject.next(sanitized);
  }

  clear() {
    this.currentValue.set('');
    this.searchSubject.next('');
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }
}

import { Component, computed, signal, input, output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Search } from 'lucide-angular';

export interface SelectOption {
    id: string | number;
    label: string;
    description?: string;
}

@Component({
    selector: 'app-searchable-select',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideAngularModule],
    templateUrl: './searchable-select.html',
    styles: [`
    .dropdown-backdrop {
        position: fixed;
        inset: 0;
        z-index: 30;
        background: transparent;
    }
  `]
})
export class SearchableSelectComponent {
    // Inputs (Using older @Input syntax for broad compatibility with forms, though input() is nice)
    // We will use standard model binding compatible approach

    @Input() options: SelectOption[] = [];
    @Input() placeholder: string = 'Buscar...';

    // We handle disabled through a setter to easily update the UI signal
    disabledState = signal(false);
    @Input('disabled')
    set disabled(value: boolean) {
        this.disabledState.set(value);
    }

    // NgModel value binding
    currentValue = signal<string | number>('');
    @Input('ngModel')
    set ngModel(value: string | number) {
        this.currentValue.set(value || '');
        this.updateSearchTextFromValue(value);
    }

    @Input() displayMode: 'default' | 'compact' = 'default';

    // Outputs
    selectionChanged = output<string | number>();
    ngModelChange = output<string | number>();

    // Internal UI State
    isOpen = signal(false);
    searchText = signal('');
    icons = { Search };

    // Computed filtered list
    filteredOptions = computed(() => {
        const search = this.searchText().toLowerCase();
        if (!search) return this.options;

        return this.options.filter(opt =>
            opt.label.toLowerCase().includes(search) ||
            (opt.description && opt.description.toLowerCase().includes(search))
        );
    });

    onSearchChange(text: string) {
        this.searchText.set(text);
        this.isOpen.set(true);
    }

    selectOption(option: SelectOption) {
        this.currentValue.set(option.id);
        this.searchText.set(option.label);
        this.isOpen.set(false);
        this.selectionChanged.emit(option.id);
        this.ngModelChange.emit(option.id);
    }

    private updateSearchTextFromValue(val: string | number) {
        if (!val) {
            this.searchText.set('');
            return;
        }
        // Wait a tick to ensure options are loaded if they come async
        setTimeout(() => {
            const found = this.options.find(o => o.id === val);
            if (found) {
                this.searchText.set(found.label);
            }
        });
    }
}

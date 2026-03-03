import { Component, computed, signal, input, output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Search, X } from 'lucide-angular';

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
    private static activeSelect: SearchableSelectComponent | null = null;
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

    // Value binding
    currentValue = signal<string | number>('');
    @Input()
    set value(v: string | number) {
        this.currentValue.set(v || '');
        this.updateSearchTextFromValue(v);
    }

    @Input() displayMode: 'default' | 'compact' = 'default';

    // Outputs
    selectionChanged = output<string | number>();
    valueChange = output<string | number>();

    // Internal UI State
    isOpen = signal(false);
    searchText = signal('');
    icons = { Search, X };

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
        this.openDropdown();
    }

    openDropdown() {
        if (SearchableSelectComponent.activeSelect && SearchableSelectComponent.activeSelect !== this) {
            SearchableSelectComponent.activeSelect.isOpen.set(false);
        }
        SearchableSelectComponent.activeSelect = this;
        this.isOpen.set(true);
    }

    clearSelection(event?: Event) {
        if (event) event.stopPropagation();
        this.currentValue.set('');
        this.searchText.set('');
        this.isOpen.set(false);
        this.selectionChanged.emit('');
        this.valueChange.emit('');
    }

    selectOption(option: SelectOption) {
        this.currentValue.set(option.id);
        this.searchText.set(option.label);
        this.isOpen.set(false);
        this.selectionChanged.emit(option.id);
        this.valueChange.emit(option.id);
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

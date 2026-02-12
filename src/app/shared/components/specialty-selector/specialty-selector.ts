import { Component, computed, signal, inject, output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Search } from 'lucide-angular';
import { SpecialtiesService } from '../../../core/services/specialties';

@Component({
    selector: 'app-specialty-selector',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideAngularModule],
    templateUrl: './specialty-selector.html',
    styles: [`
    .dropdown-backdrop {
        position: fixed;
        inset: 0;
        z-index: 30;
        background: transparent;
    }
  `]
})
export class SpecialtySelectorComponent {
    private specialtyService = inject(SpecialtiesService);

    // Inputs/Models
    selectedSpecialtyId = signal('');
    disabled = signal(false);
    selectionChanged = output<string>();

    @Input('disabled')
    set setDisabled(v: boolean) {
        this.disabled.set(v);
    }

    // State
    isOpen = signal(false);
    searchText = signal('');

    // Data
    specialties = this.specialtyService.specialties;

    icons = { Search };

    // Computed
    filteredOptions = computed(() => {
        const search = this.searchText().toLowerCase();
        return this.specialties().filter(s =>
            s.name.toLowerCase().includes(search)
        );
    });

    onSearchChange(text: string) {
        this.searchText.set(text);
        this.isOpen.set(true);
        if (!text) {
            this.selectedSpecialtyId.set('');
            this.selectionChanged.emit('');
        }
    }

    selectSpecialty(specialty: any) {
        this.selectedSpecialtyId.set(specialty.specialtyId);
        this.searchText.set(specialty.name);
        this.isOpen.set(false);
        this.selectionChanged.emit(specialty.specialtyId);
    }

    clear() {
        this.selectedSpecialtyId.set('');
        this.searchText.set('');
        this.selectionChanged.emit('');
    }

    // Public method to set initial value
    setValue(id: string) {
        const specialty = this.specialties().find(s => s.specialtyId === id);
        if (specialty) {
            this.selectedSpecialtyId.set(id);
            this.searchText.set(specialty.name);
        } else {
            this.selectedSpecialtyId.set('');
            this.searchText.set('');
        }
    }
}

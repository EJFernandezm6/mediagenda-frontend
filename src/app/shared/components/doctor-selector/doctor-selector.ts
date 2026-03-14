import { Component, computed, signal, inject, output, Input, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Search, X } from 'lucide-angular';
import { DoctorsService } from '../../../core/services/doctors';
import { DoctorSpecialtyService, DoctorSpecialty } from '../../../features/doctors/doctor-specialty/doctor-specialty.service';

@Component({
    selector: 'app-doctor-selector',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideAngularModule],
    templateUrl: './doctor-selector.html',
    styles: [`
    .dropdown-backdrop {
        position: fixed;
        inset: 0;
        z-index: 30;
        background: transparent;
    }
  `]
})
export class DoctorSelectorComponent {
    private doctorService = inject(DoctorsService);
    private doctorSpecialtyService = inject(DoctorSpecialtyService);
    private elementRef = inject(ElementRef);

    selectedDoctorId = signal('');
    disabled = signal(false); // Add disabled input
    requireSpecialties = signal(false);
    requireActive = signal(false);
    selectionChanged = output<string>();

    // Use input() API if available in future, for now standard properties or signals with @Input is safer for older angular versions but since we are on 20...
    // Wait, I should better use @Input in case signal inputs are not fully adopted or I want to be safe.
    // Actually, let's stick to signals if possible but standard @Input with signal set is easy.

    @Input('disabled')
    set setDisabled(v: boolean) {
        this.disabled.set(v);
    }

    @Input('requireSpecialties')
    set setRequireSpecialties(v: boolean) {
        this.requireSpecialties.set(v);
    }

    @Input('requireActive')
    set setRequireActive(v: boolean) {
        this.requireActive.set(v);
    }

    // State
    isOpen = signal(false);
    searchText = signal('');

    @HostListener('document:click', ['$event'])
    onClickOutside(event: Event) {
        if (!this.elementRef.nativeElement.contains(event.target)) {
            this.isOpen.set(false);
        }
    }

    // Data
    doctors = this.doctorService.selectableDoctors;

    icons = { Search, X };

    // Computed
    formattedDoctors = computed(() => {
        const uniqueDoctorsMap = new Map();
        const reqSpec = this.requireSpecialties();
        const reqActive = this.requireActive();

        this.doctors()
            .forEach(doctor => {
                const docId = doctor.doctorId || doctor.id;

                if (reqActive && !doctor.active) {
                    return; // Skip inactive doctors
                }

                if (reqSpec) {
                    const assocs = this.doctorSpecialtyService.getSpecialtiesForDoctor(docId);
                    if (!assocs || assocs.length === 0) {
                        return; // Skip doctor if no specialties
                    }
                }

                if (!uniqueDoctorsMap.has(docId)) {
                    uniqueDoctorsMap.set(docId, {
                        ...doctor,
                        valueId: docId,
                        displayName: doctor.documentNumber ? `${doctor.documentNumber} - ${doctor.fullName}` : doctor.fullName
                    });
                }
            });

        return Array.from(uniqueDoctorsMap.values());
    });

    filteredOptions = computed(() => {
        const search = this.searchText().toLowerCase();
        return this.formattedDoctors().filter(d =>
            d.displayName.toLowerCase().includes(search)
        );
    });

    onSearchChange(text: string) {
        this.searchText.set(text);
        this.isOpen.set(true);
        // Do NOT clear selectedDoctorId here to persist selection
    }

    selectDoctor(doctor: any) {
        if (!doctor.valueId) { // Check for proper doctor ID
            console.warn('Selected doctor has no doctorId/valueId', doctor);
            return;
        }
        this.selectedDoctorId.set(doctor.valueId);
        this.searchText.set(doctor.displayName);
        this.isOpen.set(false);
        this.selectionChanged.emit(doctor.valueId);
    }

    clear() {
        this.selectedDoctorId.set('');
        this.searchText.set('');
        this.selectionChanged.emit('');
    }

    clearSelection(event?: Event) {
        if (event) event.stopPropagation();
        this.clear();
    }

    // Public method to set initial value
    setValue(id: string) {
        const doctor = this.formattedDoctors().find(d => d.valueId === id);
        if (doctor) {
            this.selectedDoctorId.set(id);
            this.searchText.set(doctor.displayName);
        } else {
            this.selectedDoctorId.set('');
            this.searchText.set('');
        }
    }
}

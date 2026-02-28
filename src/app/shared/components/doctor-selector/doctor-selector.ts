import { Component, computed, signal, inject, output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Search } from 'lucide-angular';
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

    // Inputs/Models
    selectedDoctorId = signal('');
    disabled = signal(false); // Add disabled input
    selectionChanged = output<string>();

    // Use input() API if available in future, for now standard properties or signals with @Input is safer for older angular versions but since we are on 20...
    // Wait, I should better use @Input in case signal inputs are not fully adopted or I want to be safe.
    // Actually, let's stick to signals if possible but standard @Input with signal set is easy.

    @Input('disabled')
    set setDisabled(v: boolean) {
        this.disabled.set(v);
    }

    // State
    isOpen = signal(false);
    searchText = signal('');

    // Data
    doctors = this.doctorService.selectableDoctors;

    icons = { Search };

    // Computed
    formattedDoctors = computed(() => {
        const activeAssociations = this.doctorSpecialtyService.associations();
        // Extract unique doctor IDs that have at least one specialty mapped to them
        const doctorIdsWithSpecialties = new Set(activeAssociations.map((a: DoctorSpecialty) => a.doctorId));

        const uniqueDoctorsMap = new Map();

        this.doctors()
            .filter(doctor => {
                const docId = doctor.doctorId || doctor.id;
                return doctorIdsWithSpecialties.has(docId);
            })
            .forEach(doctor => {
                const docId = doctor.doctorId || doctor.id;
                if (!uniqueDoctorsMap.has(docId)) {
                    uniqueDoctorsMap.set(docId, {
                        ...doctor,
                        valueId: docId,
                        displayName: doctor.dni ? `${doctor.dni} - ${doctor.fullName}` : doctor.fullName
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

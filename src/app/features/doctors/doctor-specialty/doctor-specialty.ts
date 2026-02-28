import { Component, inject, signal, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DoctorSpecialtyService, DoctorSpecialty } from './doctor-specialty.service';
import { DoctorsService } from '../../../core/services/doctors';
import { DoctorSelectorComponent } from '../../../shared/components/doctor-selector/doctor-selector';
import { SpecialtySelectorComponent } from '../../../shared/components/specialty-selector/specialty-selector';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select';
import { SpecialtiesService } from '../../../core/services/specialties';
import { ConfirmModalService } from '../../../core/services/confirm.service';
import { LucideAngularModule, Plus, Trash2, Edit, Search, X, Filter } from 'lucide-angular';

@Component({
  selector: 'app-doctor-specialty',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, DoctorSelectorComponent, SpecialtySelectorComponent, SearchableSelectComponent],
  templateUrl: './doctor-specialty.html',
  styleUrl: './doctor-specialty.css'
})
export class DoctorSpecialtyComponent {
  private associationService = inject(DoctorSpecialtyService);
  private doctorService = inject(DoctorsService);
  private specialtyService = inject(SpecialtiesService);
  private confirmService = inject(ConfirmModalService);

  readonly icons = { Plus, Trash2, Edit, Search, X, Filter };

  // Data Signals
  doctors = this.doctorService.doctors;
  specialties = this.specialtyService.specialties;
  associations = this.associationService.associations;

  // Filter State
  searchTerm = signal('');
  filterDoctorId = signal('');
  filterSpecialtyId = signal('');

  // Modal State
  isModalOpen = signal(false);
  isEditMode = signal(false);

  // Form State
  selectedDoctorId = '';
  selectedSpecialtyId = '';
  cost: number = 0;
  duration: number = 30;

  // Track original for editing
  private originalAssociation: DoctorSpecialty | null = null;

  // Computed: Doctors with formatted display (DNI - Name)
  formattedDoctors = computed(() => {
    return this.doctors().map(doctor => ({
      ...doctor,
      valueId: doctor.doctorId || doctor.id,
      displayName: doctor.dni ? `${doctor.dni} - ${doctor.fullName}` : doctor.fullName
    }));
  });

  get doctorFilterOptions(): SelectOption[] {
    const opts = this.formattedDoctors().map(d => ({ id: d.valueId, label: d.displayName }));
    return [{ id: '', label: 'Todos los especialistas' }, ...opts];
  }

  get specialtyFilterOptions(): SelectOption[] {
    const opts = this.specialties().map(s => ({ id: s.specialtyId, label: s.name }));
    return [{ id: '', label: 'Todas las especialidades' }, ...opts];
  }

  // Computed Methods
  filteredAssociations = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const docFilter = this.filterDoctorId();
    const specFilter = this.filterSpecialtyId();

    return this.associations().filter(item => {
      // Find doctor using the stored ID (which is DoctorID)
      const doctor = this.doctors().find(d => d.doctorId === item.doctorId || d.id === item.doctorId);
      const doctorName = doctor?.fullName.toLowerCase() || '';
      const doctorDNI = doctor?.dni?.toLowerCase() || '';
      const specialtyName = this.getSpecialtyName(item.specialtyId).toLowerCase();

      // Search by doctor name, DNI, or specialty name
      const matchesSearch = doctorName.includes(term) || doctorDNI.includes(term) || specialtyName.includes(term);

      // Filter by doctor ID (Profile ID)
      const matchesDoctor = !docFilter || item.doctorId === docFilter;
      const matchesSpecialty = !specFilter || item.specialtyId === specFilter;

      return matchesSearch && matchesDoctor && matchesSpecialty;
    }).sort((a, b) => {
      const specA = this.getSpecialtyName(a.specialtyId).toLowerCase();
      const specB = this.getSpecialtyName(b.specialtyId).toLowerCase();

      if (specA < specB) return -1;
      if (specA > specB) return 1;

      // Secondary sort by Doctor Name
      const docA = this.getDoctorName(a.doctorId).toLowerCase();
      const docB = this.getDoctorName(b.doctorId).toLowerCase();
      return docA.localeCompare(docB);
    });
  });

  @ViewChild(DoctorSelectorComponent) doctorSelector!: DoctorSelectorComponent;
  @ViewChild(SpecialtySelectorComponent) specialtySelector!: SpecialtySelectorComponent;

  // Input Validations
  onSearchInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const cleanValue = input.value.replace(/[^a-zA-Z0-9 áéíóúÁÉÍÓÚñÑ]/g, '');
    if (input.value !== cleanValue) {
      input.value = cleanValue;
    }
    this.searchTerm.set(cleanValue);
  }

  onCostInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let val = input.value.replace(/[^0-9.]/g, '');

    // Prevent multiple dots
    const parts = val.split('.');
    if (parts.length > 2) {
      val = parts[0] + '.' + parts.slice(1).join('').replace(/\./g, '');
    }
    // Limit to 2 decimals
    if (parts.length === 2 && parts[1].length > 2) {
      val = parts[0] + '.' + parts[1].substring(0, 2);
    }

    if (input.value !== val) {
      input.value = val;
    }
    this.cost = parseFloat(val) || 0;
  }

  onDurationInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let val = input.value.replace(/\D/g, ''); // Only digits

    // Limit to 3 digits
    if (val.length > 3) {
      val = val.substring(0, 3);
    }

    if (input.value !== val) {
      input.value = val;
    }
    this.duration = parseInt(val, 10) || 0;
  }

  getDoctorName(id: string) {
    // The id passed here is likely the Doctor Profile ID (from association.doctorId)
    // But our doctors() list is indexed by User ID (d.id)
    // So we must find the doctor where d.doctorId matches the input id
    const doctor = this.doctors().find(d => d.doctorId === id || d.id === id);

    if (!doctor) {
      // console.warn('Doctor not found for ID:', id, 'Available doctors:', this.doctors());
      return 'Desconocido';
    }
    return doctor.dni ? `${doctor.dni} - ${doctor.fullName}` : doctor.fullName;
  }

  getSpecialtyName(id: string) {
    return this.specialties().find(s => s.specialtyId === id)?.name || 'Desconocida';
  }

  // Modal Actions
  openAddModal() {
    this.isEditMode.set(false);
    this.resetForm();
    this.doctorSelector?.clear();
    this.specialtySelector?.clear();
    this.isModalOpen.set(true);
  }

  openEditModal(item: DoctorSpecialty) {
    this.isEditMode.set(true);
    this.selectedDoctorId = item.doctorId;
    this.selectedSpecialtyId = item.specialtyId;
    this.cost = item.cost;
    this.duration = item.durationMinutes;
    this.originalAssociation = { ...item };

    this.isModalOpen.set(true);

    // Set initial value for selector
    // Use timeout to ensure modal content (and component) is rendered if using *ngIf inside modal
    setTimeout(() => {
      this.doctorSelector?.setValue(item.doctorId);
      this.specialtySelector?.setValue(item.specialtyId);
    });
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.resetForm();
    this.originalAssociation = null;
  }

  save() {
    if (!this.selectedDoctorId || !this.selectedSpecialtyId) return;

    const association: DoctorSpecialty = {
      doctorId: this.selectedDoctorId, // This must be the Doctor Profile ID
      specialtyId: this.selectedSpecialtyId,
      cost: this.cost,
      durationMinutes: this.duration
    };

    console.log('💾 Saving association for Doctor ID:', this.selectedDoctorId);

    if (this.isEditMode() && this.originalAssociation?.doctorSpecialtyId) {
      this.associationService.updateAssociation(this.originalAssociation.doctorSpecialtyId, association).subscribe({
        next: () => this.closeModal(),
        error: (err) => alert('Error al actualizar: ' + (err.error?.message || err.message))
      });
    } else {
      // Check if association already exists (using Doctor Profile ID)
      const exists = this.associations().some(a => a.doctorId === association.doctorId && a.specialtyId === association.specialtyId);
      if (exists) {
        alert('Esta asignación ya existe.');
        return;
      }
      this.associationService.addAssociation(this.selectedDoctorId, association).subscribe({
        next: () => this.closeModal(),
        error: (err) => alert('Error al guardar: ' + (err.error?.message || err.message))
      });
    }
  }

  async delete(item: DoctorSpecialty) {
    if (!item.doctorSpecialtyId) return;

    const confirmed = await this.confirmService.confirm({
      title: 'Eliminar Asignación',
      message: `¿Estás seguro de eliminar la asignación de ${this.getSpecialtyName(item.specialtyId)} a ${this.getDoctorName(item.doctorId)}?`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar'
    });

    if (confirmed) {
      this.associationService.removeAssociation(item.doctorSpecialtyId).subscribe();
    }
  }

  private resetForm() {
    this.selectedDoctorId = '';
    this.selectedSpecialtyId = '';
    this.cost = 0;
    this.duration = 30;
  }
}

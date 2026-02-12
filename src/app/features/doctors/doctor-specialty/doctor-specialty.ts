import { Component, inject, signal, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DoctorSpecialtyService, DoctorSpecialty } from './doctor-specialty.service';
import { DoctorsService } from '../../../core/services/doctors';
import { DoctorSelectorComponent } from '../../../shared/components/doctor-selector/doctor-selector';
import { SpecialtiesService } from '../../../core/services/specialties';
import { ConfirmModalService } from '../../../core/services/confirm.service';
import { LucideAngularModule, Plus, Trash2, Edit, Search, X, Filter } from 'lucide-angular';

@Component({
  selector: 'app-doctor-specialty',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, DoctorSelectorComponent],
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
    });
  });

  @ViewChild(DoctorSelectorComponent) doctorSelector!: DoctorSelectorComponent;

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
    this.doctorSelector?.clear(); // Use component method
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

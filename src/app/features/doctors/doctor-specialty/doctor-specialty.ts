import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DoctorSpecialtyService, DoctorSpecialty } from './doctor-specialty.service';
import { DoctorsService } from '../../../core/services/doctors';
import { SpecialtiesService } from '../../../core/services/specialties';
import { ConfirmModalService } from '../../../core/services/confirm.service';
import { LucideAngularModule, Plus, Trash2, Edit, Search, X, Filter } from 'lucide-angular';

@Component({
  selector: 'app-doctor-specialty',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
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

  // Searchable Dropdown State
  isDoctorDropdownOpen = signal(false);
  doctorSearchText = signal('');

  // Computed: Filtered doctors for dropdown
  filteredDoctorOptions = computed(() => {
    const search = this.doctorSearchText().toLowerCase();
    return this.formattedDoctors().filter(d =>
      d.displayName.toLowerCase().includes(search)
    );
  });

  // Dropdown Handling
  toggleDoctorDropdown() {
    this.isDoctorDropdownOpen.update(v => !v);
    if (this.isDoctorDropdownOpen()) {
      // Focus input logic could go here if using ViewChild
    }
  }

  selectDoctor(doctor: any) {
    // We need the DOCTOR PROFILE ID, not the User ID, strictly for this association endpoint
    // If doctorId is missing, it means the user has the role but no profile entry in catalog/doctors
    this.selectedDoctorId = doctor.doctorId;

    if (!doctor.doctorId) {
      console.error('Doctor selected has no Doctor Profile ID:', doctor);
      alert('Este usuario tiene rol de doctor pero no tiene perfil médico creado. No se puede asignar especialidad.');
      return;
    }

    this.doctorSearchText.set(doctor.displayName);
    this.isDoctorDropdownOpen.set(false);
  }

  onDoctorSearchChange(text: string) {
    this.doctorSearchText.set(text);
    this.isDoctorDropdownOpen.set(true);
    // If text is empty, clear selection? Or keep ID?
    // If user types something that doesn't match, we should probably clear ID
    if (!text) this.selectedDoctorId = '';
  }

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

  getDoctorName(id: string) {
    // The id passed here is likely the Doctor Profile ID (from association.doctorId)
    // But our doctors() list is indexed by User ID (d.id)
    // So we must find the doctor where d.doctorId matches the input id
    const doctor = this.doctors().find(d => d.doctorId === id || d.id === id);

    if (!doctor) {
      console.warn('Doctor not found for ID:', id, 'Available doctors:', this.doctors());
      return 'Desconocido';
    }
    return doctor.dni ? `${doctor.dni} - ${doctor.fullName}` : doctor.fullName;
  }

  getSpecialtyName(id: string) {
    return this.specialties().find(s => s.specialtyId === id)?.name || 'Desconocida';
  }

  openAddModal() {
    this.isEditMode.set(false);
    this.resetForm();
    this.doctorSearchText.set(''); // Clear search
    this.isModalOpen.set(true);
  }

  openEditModal(item: DoctorSpecialty) {
    this.isEditMode.set(true);
    this.selectedDoctorId = item.doctorId;
    this.selectedSpecialtyId = item.specialtyId;
    this.cost = item.cost;
    this.duration = item.durationMinutes;
    this.originalAssociation = { ...item };

    // Set initial text for dropdown
    const doctorName = this.getDoctorName(item.doctorId);
    this.doctorSearchText.set(doctorName);

    this.isModalOpen.set(true);
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

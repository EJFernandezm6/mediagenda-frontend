import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DoctorSpecialtyService, DoctorSpecialty } from './doctor-specialty.service';
import { DoctorsService } from '../../../core/services/doctors';
import { SpecialtiesService } from '../../../core/services/specialties';
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

  // Computed Methods
  filteredAssociations = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const docFilter = this.filterDoctorId();
    const specFilter = this.filterSpecialtyId();

    return this.associations().filter(item => {
      const doctorName = this.getDoctorName(item.doctorId).toLowerCase();
      const specialtyName = this.getSpecialtyName(item.specialtyId).toLowerCase();

      const matchesSearch = doctorName.includes(term) || specialtyName.includes(term);
      const matchesDoctor = !docFilter || item.doctorId === docFilter;
      const matchesSpecialty = !specFilter || item.specialtyId === specFilter;

      return matchesSearch && matchesDoctor && matchesSpecialty;
    });
  });

  getDoctorName(id: string) {
    return this.doctors().find(d => d.id === id)?.fullName || 'Desconocido';
  }

  getSpecialtyName(id: string) {
    return this.specialties().find(s => s.specialtyId === id)?.name || 'Desconocida';
  }

  // Modal Actions
  openAddModal() {
    this.isEditMode.set(false);
    this.resetForm();
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
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.resetForm();
    this.originalAssociation = null;
  }

  save() {
    if (!this.selectedDoctorId || !this.selectedSpecialtyId) return;

    const association: DoctorSpecialty = {
      doctorId: this.selectedDoctorId,
      specialtyId: this.selectedSpecialtyId,
      cost: this.cost,
      durationMinutes: this.duration
    };

    if (this.isEditMode() && this.originalAssociation) {
      this.associationService.updateAssociation(this.originalAssociation, association);
    } else {
      // Check for duplicates before adding? The service handles array update, but we might want to prevent duplicates in UI or Service logic. 
      // For now, assuming service allows adds (or we should check here).
      // Simple check:
      const exists = this.associations().some(a => a.doctorId === association.doctorId && a.specialtyId === association.specialtyId);
      if (exists) {
        alert('Esta asignación ya existe.'); // Simple alert for now
        return;
      }
      this.associationService.addAssociation(association);
    }

    this.closeModal();
  }

  delete(item: DoctorSpecialty) {
    if (confirm(`¿Estás seguro de eliminar la asignación de ${this.getSpecialtyName(item.specialtyId)} a ${this.getDoctorName(item.doctorId)}?`)) {
      this.associationService.removeAssociation(item.doctorId, item.specialtyId);
    }
  }

  private resetForm() {
    this.selectedDoctorId = '';
    this.selectedSpecialtyId = '';
    this.cost = 0;
    this.duration = 30;
  }
}

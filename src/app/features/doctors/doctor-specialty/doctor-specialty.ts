import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DoctorSpecialtyService, DoctorSpecialty } from './doctor-specialty.service';
import { DoctorsService } from '../../../core/services/doctors';
import { SpecialtiesService } from '../../../core/services/specialties';
import { LucideAngularModule, Plus, Trash2, Save } from 'lucide-angular';

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

  readonly icons = { Plus, Trash2, Save };

  doctors = this.doctorService.doctors;
  specialties = this.specialtyService.specialties;
  associations = this.associationService.associations;

  selectedDoctorId = '';
  selectedSpecialtyId = '';
  cost: number = 0;
  duration: number = 30;

  get filteredAssociations() {
    if (!this.selectedDoctorId) return this.associations();
    return this.associations().filter(a => a.doctorId === this.selectedDoctorId);
  }

  getDoctorName(id: string) {
    return this.doctors().find(d => d.id === id)?.fullName || 'Desconocido';
  }

  getSpecialtyName(id: string) {
    return this.specialties().find(s => s.id === id)?.name || 'Desconocida';
  }

  add() {
    if (this.selectedDoctorId && this.selectedSpecialtyId) {
      this.associationService.addAssociation({
        doctorId: this.selectedDoctorId,
        specialtyId: this.selectedSpecialtyId,
        cost: this.cost,
        durationMinutes: this.duration
      });
      // Reset form but keep doctor selected for bulk add
      this.selectedSpecialtyId = '';
      this.cost = 0;
    }
  }

  remove(doctorId: string, specialtyId: string) {
    this.associationService.removeAssociation(doctorId, specialtyId);
  }
}

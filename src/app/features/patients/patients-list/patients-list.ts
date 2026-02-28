import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PatientsService, Patient, Consultation } from '../../../core/services/patients';
import { DoctorsService } from '../../../core/services/doctors';
import { SpecialtiesService } from '../../../core/services/specialties';
import { LucideAngularModule, Plus, Search, FileText, User, Pencil, ChevronDown, ChevronUp, Stethoscope, Activity, Calendar, ArrowRight, Eye, Columns } from 'lucide-angular';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';

@Component({
  selector: 'app-patients-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, PaginationComponent],
  templateUrl: './patients-list.html',
  styleUrl: './patients-list.css'
})
export class PatientsListComponent {
  private service = inject(PatientsService);
  private router = inject(Router);
  private doctorService = inject(DoctorsService);
  private specialtyService = inject(SpecialtiesService);


  readonly icons = { Plus, Search, FileText, User, Pencil, ChevronDown, ChevronUp, Stethoscope, Activity, Calendar, ArrowRight, Eye, Columns };


  patients = this.service.patients;
  searchTerm = '';

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;

  // Column Visibility State
  showColumnFilter = false;
  columns = {
    name: true,
    email: true,
    dni: true,
    phone: true,
    age: true,
    gender: true,
    lastVisit: true,
    actions: true
  };

  toggleColumn(col: keyof typeof this.columns) {
    this.columns[col] = !this.columns[col];
  }

  // Expanded Row State
  expandedPatientId: string | null = null;
  patientHistory: Consultation[] = [];
  isLoadingHistory = false;


  // Modal
  isModalOpen = false;
  form: any = { fullName: '', dni: '', email: '', phone: '', age: 18, gender: 'M' };

  get patientsList() {
    return this.patients();
  }

  get totalItems() {
    return this.service.totalElements();
  }

  onPageChange(page: number) {
    this.currentPage = page;
    this.loadPatients();
  }

  onSearchChange() {
    // Sanitize: allow only letters, numbers, and spaces
    const clean = this.searchTerm.replace(/[^a-zA-Z0-9\s]/g, '');
    if (clean !== this.searchTerm) {
      this.searchTerm = clean;
    }
    this.currentPage = 1;
    this.loadPatients();
  }

  private loadPatients() {
    this.service.refreshPatients(this.currentPage - 1, this.itemsPerPage, this.searchTerm);
  }

  toggleHistory(id: string) {
    if (this.expandedPatientId === id) {
      this.expandedPatientId = null;
      this.patientHistory = [];
    } else {
      this.expandedPatientId = id;
      this.isLoadingHistory = true;
      this.service.getPatientHistory(id).subscribe({
        next: (data) => {
          this.patientHistory = data;
          this.isLoadingHistory = false;
        },
        error: () => this.isLoadingHistory = false
      });
    }
  }

  getDoctorName(id: string) {
    return this.doctorService.doctors().find(d => d.id === id)?.fullName || 'Desconocido';
  }

  getSpecialtyName(id: string) {
    return this.specialtyService.specialties().find(s => s.specialtyId === id)?.name || 'General';
  }

  editPatient(patient: Patient) {
    this.form = { ...patient };
    this.isModalOpen = true;
  }


  openModal() {
    this.form = { fullName: '', dni: '', email: '', phone: '', age: 18, gender: 'M' };
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  save() {
    const request = this.form.patientId
      ? this.service.updatePatient(this.form.patientId, this.form)
      : this.service.addPatient(this.form);

    request.subscribe({
      next: () => {
        this.closeModal();
      },
      error: (err) => {
        console.error('Error saving patient', err);
        let msg = err.error?.message || 'Ocurrió un error al guardar el paciente';

        // Handle Validation Errors
        if (err.error?.validationErrors && Array.isArray(err.error.validationErrors)) {
          const detailedErrors = err.error.validationErrors
            .map((e: any) => `${e.field}: ${e.message}`)
            .join('\n');
          msg += `\n\nDetalles:\n${detailedErrors}`;
        }

        alert(msg);
      }
    });

    /*
    if (this.form.patientId) {
      this.service.updatePatient(this.form.patientId, this.form).subscribe(() => {
        this.closeModal();
      });
    } else {
      this.service.addPatient(this.form).subscribe(() => {
        this.closeModal();
      });
    }
    */
  }

}

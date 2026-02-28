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
  isSaving = false;
  form: any = { fullName: '', dni: '', email: '', phone: '', age: 18, gender: 'M' };

  emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

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
    this.currentPage = 1;
    this.loadPatients();
  }

  onSearchInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const cleanValue = input.value.replace(/[^a-zA-Z0-9 áéíóúÁÉÍÓÚñÑ]/g, '');
    if (input.value !== cleanValue) {
      input.value = cleanValue;
    }
    this.searchTerm = cleanValue;
    this.onSearchChange();
  }

  onDniInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let val = input.value.replace(/\D/g, ''); // Solo números
    if (val.length > 8) val = val.substring(0, 8); // Máximo 8 dígitos
    if (input.value !== val) input.value = val;
    this.form.dni = val;
  }

  onPhoneInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let val = input.value.replace(/\D/g, ''); // Solo números
    if (val.length > 9) val = val.substring(0, 9); // Máximo 9 dígitos
    if (input.value !== val) input.value = val;
    this.form.phone = val;
  }

  get isFormValid() {
    return this.form.fullName?.trim() &&
      this.form.phone?.trim()?.length >= 7 &&
      this.form.dni?.trim()?.length === 8 &&
      this.form.age > 0 &&
      this.form.gender &&
      (!this.form.email || this.emailRegex.test(this.form.email));
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
    this.isSaving = true;

    // Check duplicates directly on frontend list before sending to backend to avoid generic 400s
    // Fallback logic in case backend error parsing is clunky
    const isDuplicate = this.patientsList.some(p => p.dni === this.form.dni && p.patientId !== this.form.patientId);

    if (isDuplicate) {
      alert('Ya existe un paciente registrado con este DNI.');
      this.isSaving = false;
      return;
    }

    const request = this.form.patientId
      ? this.service.updatePatient(this.form.patientId, this.form)
      : this.service.addPatient(this.form);

    request.subscribe({
      next: () => {
        this.isSaving = false;
        this.closeModal();
      },
      error: (err) => {
        this.isSaving = false;
        console.error('Error saving patient', err);
        let msg = err.error?.message || 'Ocurrió un error al guardar el paciente. Verifique los datos obligatorios y la longitud de campos requeridos (ej. DNI debe ser de 8 dígitos).';

        // Custom duplicate parsing (just in case)
        if (msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('already exists')) {
          msg = 'Información duplicada. Verifique que el DNI o correo no existan ya en otro registro.';
        }

        // Handle Validation Errors
        if (err.error?.validationErrors && Array.isArray(err.error.validationErrors)) {
          const detailedErrors = err.error.validationErrors
            .map((e: any) => `- ${e.field}: ${e.message}`)
            .join('\n');
          msg += `\n\nDetalles:\n${detailedErrors}`;
        }

        alert(msg);
      }
    });
  }

}

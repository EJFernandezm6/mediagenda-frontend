import { Component, inject, computed, signal, OnInit, OnDestroy, HostListener, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { PatientsService, Patient, Consultation } from '../../../core/services/patients';
import { DoctorsService } from '../../../core/services/doctors';
import { SpecialtiesService } from '../../../core/services/specialties';
import { LucideAngularModule, Plus, Search, FileText, User, Pencil, ChevronDown, ChevronUp, Stethoscope, Activity, Calendar, ArrowRight, Eye, Columns, X, SquarePen } from 'lucide-angular';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { ButtonComponent } from '../../../shared/components/ui/button/button.component';
import { CardComponent } from '../../../shared/components/ui/card/card.component';
import { PageHeaderComponent } from '../../../shared/components/ui/page-header/page-header.component';
import { SearchInputComponent } from '../../../shared/components/ui/search-input/search-input.component';

@Component({
  selector: 'app-patients-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, PaginationComponent, ButtonComponent, CardComponent, PageHeaderComponent, SearchInputComponent],
  templateUrl: './patients-list.html',
  styleUrl: './patients-list.css'
})
export class PatientsListComponent implements OnInit {
  private service = inject(PatientsService);
  private router = inject(Router);
  private doctorService = inject(DoctorsService);
  private specialtyService = inject(SpecialtiesService);
  @ViewChild('filterContainer') filterContainer!: ElementRef;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.showColumnFilter() && this.filterContainer && !this.filterContainer.nativeElement.contains(event.target)) {
      this.showColumnFilter.set(false);
    }
  }

  toggleColumnFilter(event: Event) {
    this.showColumnFilter.set(!this.showColumnFilter());
  }


  readonly icons = { Plus, Search, FileText, User, Pencil, ChevronDown, ChevronUp, Stethoscope, Activity, Calendar, ArrowRight, Eye, Columns, X, SquarePen };


  patients = this.service.patients;

  // Local Pagination & Search State
  searchTerm = signal('');
  currentPage = signal(1);
  itemsPerPage = 6;

  ngOnInit() {
    // Relying on service entirely for first load via effect
  }

  // Column Visibility State
  showColumnFilter = signal(false);
  columns = {
    name: true,
    dni: true,
    phone: true,
    age: true,
    gender: true,
    actions: true
  };

  toggleColumn(col: keyof typeof this.columns) {
    this.columns[col] = !this.columns[col];
  }

  // Expanded Row State (Now Modal)
  isHistoryModalOpen = false;
  selectedHistoryPatient: Patient | null = null;
  patientHistory = signal<Consultation[]>([]);
  isHistoryLoading = signal(false);


  // Modal
  isModalOpen = false;
  isSaving = false;
  form: any = { 
    fullName: '', 
    docType: 'DNI',
    dni: '', 
    email: '', 
    countryCode: '51',
    phone: '', 
    age: 18, 
    gender: 'M' 
  };

  emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  showGenderDropdown = signal(false);
  showDocTypeDropdown = signal(false);

  toggleGenderDropdown() {
    this.showGenderDropdown.set(!this.showGenderDropdown());
  }

  toggleDocTypeDropdown() {
    this.showDocTypeDropdown.set(!this.showDocTypeDropdown());
  }

  selectDocType(type: 'DNI' | 'CE') {
    this.form.docType = type;
    this.form.dni = ''; // Clear ID when switching type
    this.showDocTypeDropdown.set(false);
  }

  selectGender(gender: 'M' | 'F') {
    this.form.gender = gender;
    this.showGenderDropdown.set(false);
  }

  // Computed state for local filtering and pagination
  filteredPatients = computed(() => {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.patients();
    return this.patients().filter(p =>
      p.fullName?.toLowerCase().includes(term) ||
      p.email?.toLowerCase().includes(term) ||
      p.dni?.toLowerCase().includes(term)
    );
  });

  get patientsList() {
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    return this.filteredPatients().slice(start, start + this.itemsPerPage);
  }

  get totalItems() {
    return this.filteredPatients().length;
  }

  onPageChange(page: number) {
    this.currentPage.set(page);
  }

  onSearchChange() {
    this.currentPage.set(1);
  }

  onNameInput(event: Event) {
    const input = event.target as HTMLInputElement;
    // Solo permitir letras y espacios
    const val = input.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
    if (input.value !== val) input.value = val;
    this.form.fullName = val;
  }

  onDniInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let val = input.value;
    
    if (this.form.docType === 'DNI') {
      val = val.replace(/\D/g, ''); // Solo números para DNI
      if (val.length > 8) val = val.substring(0, 8);
    } else {
      val = val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase(); // Alfanumérico para CE
      if (val.length > 12) val = val.substring(0, 12);
    }
    
    if (input.value !== val) input.value = val;
    this.form.dni = val;
  }

  onCountryCodeInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let val = input.value.replace(/\D/g, ''); // Solo números
    if (val.length > 4) val = val.substring(0, 4); // Max 4 dígitos (+51, +1234, etc)
    if (input.value !== val) input.value = val;
    this.form.countryCode = val;
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
      this.form.countryCode?.trim()?.length >= 1 &&
      (this.form.docType === 'DNI' ? this.form.dni?.trim()?.length === 8 : this.form.dni?.trim()?.length >= 4) &&
      this.form.age > 0 &&
      this.form.gender &&
      (!this.form.email || this.emailRegex.test(this.form.email));
  }

  private loadPatients() {
    this.service.refreshPatients();
  }

  openHistoryModal(patient: Patient) {
    this.selectedHistoryPatient = patient;
    this.isHistoryModalOpen = true;
    this.patientHistory.set([]);
    this.isHistoryLoading.set(true);
    
    console.log('Fetching history for patient:', patient.patientId);
    
    this.service.getPatientHistory(patient.patientId).subscribe({
      next: (data) => { 
        console.log('History received:', data);
        this.patientHistory.set(data || []); 
        this.isHistoryLoading.set(false);
      },
      error: (err) => { 
        console.error('Error loading history', err);
        alert('Error al cargar historial: ' + (err.error?.message || err.message));
        this.patientHistory.set([]); 
        this.isHistoryLoading.set(false);
      }
    });
  }

  closeHistoryModal() {
    this.isHistoryModalOpen = false;
    this.selectedHistoryPatient = null;
    this.patientHistory.set([]);
  }

  getDoctorName(id: string) {
    return this.doctorService.doctors().find(d => d.doctorId === id || d.id === id)?.fullName || 'Desconocido';
  }

  getSpecialtyName(id: string) {
    return this.specialtyService.specialties().find(s => s.specialtyId === id)?.name || 'General';
  }

  editPatient(patient: Patient) {
    this.form = { ...patient };
    this.showGenderDropdown.set(false);
    this.showDocTypeDropdown.set(false);
    this.isModalOpen = true;
  }


  openModal() {
    this.form = { 
      fullName: '', 
      docType: 'DNI',
      dni: '', 
      email: '', 
      countryCode: '51',
      phone: '', 
      age: 18, 
      gender: 'M' 
    };
    this.showGenderDropdown.set(false);
    this.showDocTypeDropdown.set(false);
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.showGenderDropdown.set(false);
    this.showDocTypeDropdown.set(false);
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

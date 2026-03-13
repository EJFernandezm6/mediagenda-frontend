import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DoctorsService, Doctor } from '../../../core/services/doctors';
import { ConfirmModalService } from '../../../core/services/confirm.service';
import { LucideAngularModule, Plus, Pencil, SquarePen, Trash2, Search, Star, MessageCircle, Mail, FileBadge, MapPin, AlertCircle, Power, X, ChevronDown, ChevronUp, Eye, Phone, Stethoscope, Edit3, Trash, ChevronRight } from 'lucide-angular';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { ButtonComponent } from '../../../shared/components/ui/button/button.component';
import { CardComponent } from '../../../shared/components/ui/card/card.component';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select';
import { SpecialtiesService } from '../../../core/services/specialties';
import { DoctorSpecialtyService } from '../doctor-specialty/doctor-specialty.service';
import { PageHeaderComponent } from '../../../shared/components/ui/page-header/page-header.component';
import { SearchInputComponent } from '../../../shared/components/ui/search-input/search-input.component';

@Component({
  selector: 'app-doctors-list',
  standalone: true,
  imports: [
    CommonModule, 
    LucideAngularModule, 
    FormsModule, 
    PaginationComponent, 
    ButtonComponent, 
    CardComponent, 
    SearchableSelectComponent,
    PageHeaderComponent,
    SearchInputComponent
  ],
  templateUrl: './doctors-list.html',
  styleUrl: './doctors-list.css'
})
export class DoctorsListComponent implements OnInit {
  private service = inject(DoctorsService);
  private confirmService = inject(ConfirmModalService);
  private specialtyService = inject(SpecialtiesService);
  private doctorSpecialtyService = inject(DoctorSpecialtyService);

  doctors = this.service.doctors;

  // Icons
  readonly icons = { Plus, Pencil, SquarePen, Trash2, Search, Star, MessageCircle, Mail, FileBadge, MapPin, AlertCircle, Power, X, ChevronDown, ChevronUp, Phone, Stethoscope, Edit3, Trash, ChevronRight, Eye };

  // Local Pagination & Search State
  searchTerm = signal('');
  statusFilter = signal('');
  currentPage = signal(1);
  itemsPerPage = 5;

  statusOptions = signal<SelectOption[]>([
    { id: 'ACTIVE', label: 'Solo Activos' },
    { id: 'INACTIVE', label: 'Solo Inactivos' }
  ]);

  ngOnInit() {
    // Logic handled by components and signals
  }

  ngOnDestroy() {
    // Subscriptions handled by components
  }

  // Modal State
  isModalOpen = false;
  isSaving = false;
  editingId: string | null = null;
  form: any = { 
    fullName: '', 
    docType: 'DNI', 
    dni: '', 
    cmp: '', 
    email: '', 
    countryCode: '51',
    phone: '', 
    active: true, 
    photoUrl: '' 
  };

  // Dropdown signals
  showDocTypeDropdown = signal(false);
  showStatusDropdown = signal(false);

  // Validation
  emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  toggleDocTypeDropdown() {
    this.showDocTypeDropdown.set(!this.showDocTypeDropdown());
  }

  toggleStatusDropdown() {
    this.showStatusDropdown.set(!this.showStatusDropdown());
  }

  selectDocType(type: 'DNI' | 'CE') {
    this.form.docType = type;
    this.form.dni = '';
    this.showDocTypeDropdown.set(false);
  }

  selectStatus(active: boolean) {
    this.form.active = active;
    this.showStatusDropdown.set(false);
  }

  // Computed state for local filtering and pagination
  filteredDoctors = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const status = this.statusFilter();
    let docs = this.doctors();

    // Filter by status
    if (status === 'ACTIVE') {
      docs = docs.filter(d => d.active !== false);
    } else if (status === 'INACTIVE') {
      docs = docs.filter(d => d.active === false);
    }

    if (!term) return docs;

    return docs.filter(d =>
      d.fullName?.toLowerCase().includes(term) ||
      d.email?.toLowerCase().includes(term) ||
      d.dni?.toLowerCase().includes(term) ||
      d.cmp?.toLowerCase().includes(term)
    );
  });

  get doctorsList() {
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    return this.filteredDoctors().slice(start, start + this.itemsPerPage);
  }

  get totalItems() {
    return this.filteredDoctors().length;
  }

  onPageChange(page: number) {
    this.currentPage.set(page);
  }

  onSearch(value: string) {
    this.searchTerm.set(value);
    this.currentPage.set(1);
  }

  onNameInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const val = input.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
    if (input.value !== val) input.value = val;
    this.form.fullName = val;
  }

  onDocumentInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let val = input.value;
    
    if (this.form.docType === 'DNI') {
      val = val.replace(/\D/g, ''); 
      if (val.length > 8) val = val.substring(0, 8);
    } else {
      val = val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      if (val.length > 12) val = val.substring(0, 12);
    }
    
    if (input.value !== val) input.value = val;
    this.form.dni = val;
  }

  onCountryCodeInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let val = input.value.replace(/\D/g, '');
    if (val.length > 4) val = val.substring(0, 4);
    if (input.value !== val) input.value = val;
    this.form.countryCode = val;
  }

  onPhoneInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let val = input.value.replace(/\D/g, '');
    if (val.length > 9) val = val.substring(0, 9);
    if (input.value !== val) input.value = val;
    this.form.phone = val;
  }

  onCmpInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let val = input.value.replace(/\D/g, '');
    if (val.length > 8) val = val.substring(0, 8);
    if (input.value !== val) input.value = val;
    this.form.cmp = val;
  }

  get isDuplicateDni() {
    if (!this.form.dni) return false;
    return this.doctors().some(d => 
      d.dni?.toLowerCase() === this.form.dni?.toLowerCase() && 
      d.id !== this.editingId
    );
  }

  get isDuplicateCmp() {
    if (!this.form.cmp) return false;
    return this.doctors().some(d => 
      d.cmp?.toLowerCase() === this.form.cmp?.toLowerCase() && 
      d.id !== this.editingId
    );
  }

  private loadDoctors() {
    this.service.refreshDoctors();
  }

  get isFormValid() {
    return this.form.fullName?.trim() &&
      this.form.phone?.trim()?.length >= 7 &&
      this.form.countryCode?.trim()?.length >= 1 &&
      (this.form.docType === 'DNI' ? this.form.dni?.trim()?.length === 8 : this.form.dni?.trim()?.length >= 4) &&
      (!this.form.email || this.emailRegex.test(this.form.email)) &&
      !this.isDuplicateDni &&
      !this.isDuplicateCmp;
  }

  isMissingData(doctor: Doctor) {
    return !doctor.fullName?.trim() || !doctor.phone?.trim() || !doctor.cmp?.trim() || !doctor.dni?.trim() || !doctor.email?.trim();
  }

  getMissingFields(doctor: Doctor): string[] {
    const fields = [];
    if (!doctor.fullName?.trim()) fields.push('Nombre');
    if (!doctor.phone?.trim()) fields.push('Teléfono');
    if (!doctor.dni?.trim()) fields.push('Doc. Identidad');
    if (!doctor.email?.trim()) fields.push('Email');
    if (doctor.email && !this.emailRegex.test(doctor.email)) fields.push('Email Inválido');
    return fields;
  }

  openModal(doctor?: Doctor) {
    if (doctor) {
      this.editingId = doctor.id;
      this.form = { 
        ...doctor, 
        docType: doctor.dni?.length === 8 && /^\d+$/.test(doctor.dni) ? 'DNI' : 'CE',
        countryCode: '51' // Default or extracted if saved
      };
    } else {
      this.editingId = null;
      this.form = { 
        fullName: '', 
        docType: 'DNI', 
        dni: '', 
        cmp: '', 
        email: '', 
        countryCode: '51',
        phone: '', 
        active: true, 
        photoUrl: 'https://ui-avatars.com/api/?background=random' 
      };
    }
    this.showDocTypeDropdown.set(false);
    this.showStatusDropdown.set(false);
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.showDocTypeDropdown.set(false);
    this.showStatusDropdown.set(false);
  }

  // Profile Slide-over State
  isProfileOpen = signal(false);
  selectedDoctorForProfile = signal<Doctor | null>(null);
  assignedSpecialties = computed(() => {
    const doctor = this.selectedDoctorForProfile();
    if (!doctor) return [];
    return this.doctorSpecialtyService.getSpecialtiesForDoctor(doctor.doctorId || doctor.id);
  });

  openProfilePanel(doctor: Doctor) {
    this.selectedDoctorForProfile.set(doctor);
    this.isProfileOpen.set(true);
  }

  closeProfilePanel() {
    this.isProfileOpen.set(false);
    setTimeout(() => this.selectedDoctorForProfile.set(null), 300);
  }

  // Assignment Modal/Form State
  isAssignmentModalOpen = signal(false);
  editingAssignmentId = signal<string | null>(null);
  assignmentForm = {
    specialtyId: '',
    cost: 0,
    durationMinutes: 15
  };

  availableSpecialties = computed(() => {
    const assignedIds = this.assignedSpecialties().map(a => a.specialtyId);
    return this.specialtyService.specialties().filter(s => !assignedIds.includes(s.specialtyId));
  });

  get availableSpecialtyOptions() {
    return this.availableSpecialties().map(s => ({
      id: s.specialtyId,
      label: s.name
    }));
  }

  openAssignmentModal(assoc?: any) {
    if (assoc) {
      this.editingAssignmentId.set(assoc.doctorSpecialtyId);
      this.assignmentForm = {
        specialtyId: assoc.specialtyId,
        cost: assoc.cost,
        durationMinutes: assoc.durationMinutes
      };
    } else {
      this.editingAssignmentId.set(null);
      this.assignmentForm = {
        specialtyId: '',
        cost: 0,
        durationMinutes: 15
      };
    }
    this.isAssignmentModalOpen.set(true);
  }

  closeAssignmentModal() {
    this.isAssignmentModalOpen.set(false);
  }

  saveAssignment() {
    const doctor = this.selectedDoctorForProfile();
    if (!doctor) return;

    if (this.editingAssignmentId()) {
      this.doctorSpecialtyService.updateAssociation(this.editingAssignmentId()!, this.assignmentForm).subscribe({
        next: () => this.closeAssignmentModal(),
        error: () => alert('Error al actualizar la asignación.')
      });
    } else {
      const payload = {
        ...this.assignmentForm,
        doctorId: doctor.doctorId || doctor.id
      };
      this.doctorSpecialtyService.addAssociation(doctor.doctorId || doctor.id, payload).subscribe({
        next: () => this.closeAssignmentModal(),
        error: () => alert('Error al crear la asignación.')
      });
    }
  }

  getSpecialtyName(id: string) {
    return this.specialtyService.specialties().find(s => s.specialtyId === id)?.name || 'Especialidad';
  }

  toggleActiveInProfile() {
    const doctor = this.selectedDoctorForProfile();
    if (doctor) {
      this.toggleActive(doctor);
      // Update local reference to reflect change in profile
      this.selectedDoctorForProfile.set({ ...doctor, active: !doctor.active });
    }
  }

  async desasignarSpecialty(assocId: string) {
    const confirmed = await this.confirmService.confirm({
      title: 'Desasignar Especialidad',
      message: '¿Estás seguro de que deseas desasignar esta especialidad del médico?',
      confirmText: 'Desasignar',
      cancelText: 'Cancelar'
    });

    if (confirmed) {
      this.doctorSpecialtyService.removeAssociation(assocId).subscribe();
    }
  }

  save() {
    this.isSaving = true;

    // Generate avatar if name changed AND no photo is set/uploaded (or if it's the default ui-avatar)
    if (!this.form.photoUrl || this.form.photoUrl.includes('ui-avatars')) {
      // Only update default avatar if user hasn't uploaded a custom one (custom ones are base664 data:image...)
      if (!this.form.photoUrl?.startsWith('data:image')) {
        this.form.photoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(this.form.fullName)}&background=random`;
      }
    }

    if (this.isDuplicateDni) {
      alert(`Ya existe un especialista registrado con el Documento: ${this.form.dni}`);
      this.isSaving = false;
      return;
    }

    if (this.isDuplicateCmp) {
      alert(`Ya existe un especialista registrado con la Colegiatura: ${this.form.cmp}`);
      this.isSaving = false;
      return;
    }

    const request$ = this.editingId
      ? this.service.updateDoctor(this.editingId, this.form)
      : this.service.addDoctor(this.form);

    request$.subscribe({
      next: () => {
        this.isSaving = false;
        this.closeModal();
      },
      error: (error: any) => {
        console.error('Error saving doctor:', error);
        this.isSaving = false;
        if (error.status === 409 || error.status === 400) {
          alert(error.error?.message || 'Ya existe un especialista registrado con este Documento, Colegiatura o Correo electrónico.');
        } else if (error.status === 500) {
          alert('Error del servidor: Es posible que los datos ya estén registrados en otro especialista (Ej: Colegiatura o Documento duplicado).');
        } else {
          alert('Ocurrió un error al guardar el médico. Por favor intente nuevamente.');
        }
      }
    });
  }

  toggleActive(doctor: Doctor) {
    this.service.updateDoctor(doctor.id, { active: !doctor.active }).subscribe();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Validate Match
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        alert('Formato no válido. Solo se permiten imágenes JPG, JPEG o PNG.');
        event.target.value = '';
        return;
      }

      // Max 2MB Size (2 * 1024 * 1024 bytes)
      if (file.size > 2097152) {
        alert('El archivo es muy pesado. El tamaño máximo permitido es 2MB.');
        event.target.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.form.photoUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  async deleteDoctor(id: string) {
    const confirmed = await this.confirmService.confirm({
      title: 'Eliminar Especialista',
      message: '¿Estás seguro de que deseas eliminar este especialista? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar'
    });

    if (confirmed) {
      this.service.deleteDoctor(id).subscribe({
        next: () => {
          // Success handled via tapping refreshDoctors in service
        },
        error: (err) => alert('No se pudo eliminar el especialista. Es posible que tenga citas asociadas.')
      });
    }
  }

  getSpecialtyCount(doctorId: string): number {
    return this.doctorSpecialtyService.associations().filter(a => a.doctorId === doctorId).length;
  }
}

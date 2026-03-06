import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DoctorsService, Doctor } from '../../../core/services/doctors';
import { ConfirmModalService } from '../../../core/services/confirm.service';
import { LucideAngularModule, Plus, Pencil, Trash2, Search, Star, MessageCircle, Mail, FileBadge, MapPin, AlertCircle, Power } from 'lucide-angular';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';

@Component({
  selector: 'app-doctors-list',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule, RouterLink, PaginationComponent],
  templateUrl: './doctors-list.html',
  styleUrl: './doctors-list.css'
})
export class DoctorsListComponent implements OnInit {
  private service = inject(DoctorsService);
  private confirmService = inject(ConfirmModalService);

  doctors = this.service.doctors;

  // Icons
  readonly icons = { Plus, Pencil, Trash2, Search, Star, MessageCircle, Mail, FileBadge, MapPin, AlertCircle, Power };

  // Local Pagination & Search State
  searchTerm = signal('');
  showInactive = signal(false);
  currentPage = signal(1);
  itemsPerPage = 9;

  ngOnInit() {
    // Relying on service entirely for first load via effect
  }

  // Modal State
  isModalOpen = false;
  isSaving = false;
  editingId: string | null = null;
  form: any = { fullName: '', documentType: 'DNI', dni: '', cmp: '', email: '', phone: '', active: true, photoUrl: '' };

  // Validation
  emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  // Computed state for local filtering and pagination
  filteredDoctors = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const showAll = this.showInactive();
    let docs = this.doctors();

    if (!showAll) {
      docs = docs.filter(d => d.active !== false); // Default active unless explicitly false
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

  onSearchChange() {
    this.currentPage.set(1);
  }

  onSearchInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
    this.onSearchChange();
  }

  onDocumentTypeChange() {
    let val = this.form.dni || '';
    if (this.form.documentType === 'DNI') {
      val = val.replace(/\D/g, '');
      if (val.length > 8) val = val.substring(0, 8);
    } else {
      val = val.replace(/[^a-zA-Z0-9]/g, '');
      if (val.length > 9) val = val.substring(0, 9);
    }
    this.form.dni = val;
  }

  onDocumentInput(event: Event) {
    const input = event.target as HTMLInputElement;
    // DNI only digits (8 max). CE digits+letters (9 max).
    if (this.form.documentType === 'DNI') {
      let val = input.value.replace(/\D/g, '');
      if (val.length > 8) val = val.substring(0, 8);
      if (input.value !== val) input.value = val;
      this.form.dni = val;
    } else {
      let val = input.value.replace(/[^a-zA-Z0-9]/g, '');
      if (val.length > 9) val = val.substring(0, 9);
      if (input.value !== val) input.value = val;
      this.form.dni = val; // Store CE in DNI field for DB simplicity
    }
  }

  onCmpInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let val = input.value.replace(/\D/g, '');
    if (val.length > 6) val = val.substring(0, 6);
    if (input.value !== val) input.value = val;
    this.form.cmp = val;
  }

  toggleInactiveFilter() {
    this.showInactive.set(!this.showInactive());
    this.currentPage.set(1);
  }

  private loadDoctors() {
    this.service.refreshDoctors();
  }

  get isFormValid() {
    const isDocValid = this.form.documentType === 'DNI' ? this.form.dni?.length === 8 : this.form.dni?.length > 4;
    return this.form.fullName?.trim() &&
      this.form.phone?.trim() &&
      this.form.cmp?.trim() &&
      this.form.dni?.trim() &&
      isDocValid &&
      this.emailRegex.test(this.form.email || '');
  }

  isMissingData(doctor: Doctor) {
    return !doctor.fullName?.trim() || !doctor.phone?.trim() || !doctor.cmp?.trim() || !doctor.dni?.trim() || !doctor.email?.trim();
  }

  getMissingFields(doctor: Doctor): string[] {
    const fields = [];
    if (!doctor.fullName?.trim()) fields.push('Nombre');
    if (!doctor.phone?.trim()) fields.push('Teléfono');
    if (!doctor.cmp?.trim()) fields.push('CMP');
    if (!doctor.dni?.trim()) fields.push('Doc. Identidad');
    if (!doctor.email?.trim()) fields.push('Email');
    if (doctor.email && !this.emailRegex.test(doctor.email)) fields.push('Email Inválido');
    return fields;
  }

  openModal(doctor?: Doctor) {
    if (doctor) {
      this.editingId = doctor.id;
      this.form = { ...doctor, documentType: doctor.dni?.length === 8 && /^\d+$/.test(doctor.dni) ? 'DNI' : 'CE' };
    } else {
      this.editingId = null;
      this.form = { fullName: '', documentType: 'DNI', dni: '', cmp: '', email: '', phone: '', active: true, photoUrl: 'https://ui-avatars.com/api/?background=random' };
    }
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
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
          alert(error.error?.message || 'Ya existe un especialista registrado con este Documento, CMP o Correo electrónico.');
        } else if (error.status === 500) {
          alert('Error del servidor: Es posible que los datos ya estén registrados en otro especialista (Ej: CMP o Documento duplicado).');
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

}

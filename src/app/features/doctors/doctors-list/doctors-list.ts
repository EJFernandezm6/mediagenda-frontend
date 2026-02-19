import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DoctorsService, Doctor } from '../../../core/services/doctors';
import { ConfirmModalService } from '../../../core/services/confirm.service';
import { LucideAngularModule, Plus, Pencil, Trash2, Search, Star, MessageCircle, Mail, FileBadge, MapPin, AlertCircle, Power } from 'lucide-angular';
import { FormsModule } from '@angular/forms';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';

@Component({
  selector: 'app-doctors-list',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule, RouterLink, PaginationComponent],
  templateUrl: './doctors-list.html',
  styleUrl: './doctors-list.css'
})
export class DoctorsListComponent {
  private service = inject(DoctorsService);
  private confirmService = inject(ConfirmModalService);

  // Icons
  readonly icons = { Plus, Pencil, Trash2, Search, Star, MessageCircle, Mail, FileBadge, MapPin, AlertCircle, Power };

  doctors = this.service.doctors;
  searchTerm = '';

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;

  // Modal State
  isModalOpen = false;
  isSaving = false;
  editingId: string | null = null;
  form: any = { fullName: '', dni: '', cmp: '', email: '', phone: '', active: true, photoUrl: '' };

  // Filter State
  showInactive = false;

  get filteredDoctors() {
    return this.doctors().filter(d => {
      const matchesSearch = d.fullName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (d.cmp && d.cmp.includes(this.searchTerm));

      const matchesActive = this.showInactive || d.active;

      return matchesSearch && matchesActive;
    });
  }

  get paginatedDoctors() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredDoctors.slice(startIndex, startIndex + this.itemsPerPage);
  }

  onPageChange(page: number) {
    this.currentPage = page;
  }

  // Reset page logic handled in search change if needed, but since it's a simple getter here we can just add a wrapper or modify search binding
  onSearchChange() {
    this.currentPage = 1;
  }

  get isFormValid() {
    return this.form.fullName?.trim() && this.form.phone?.trim() && this.form.cmp?.trim() && this.form.dni?.trim() && this.form.email?.trim();
  }

  isMissingData(doctor: Doctor) {
    return !doctor.fullName?.trim() || !doctor.phone?.trim() || !doctor.cmp?.trim() || !doctor.dni?.trim() || !doctor.email?.trim();
  }

  getMissingFields(doctor: Doctor): string[] {
    const fields = [];
    if (!doctor.fullName?.trim()) fields.push('Nombre');
    if (!doctor.phone?.trim()) fields.push('Teléfono');
    if (!doctor.cmp?.trim()) fields.push('CMP');
    if (!doctor.dni?.trim()) fields.push('DNI');
    if (!doctor.email?.trim()) fields.push('Email');
    return fields;
  }

  openModal(doctor?: Doctor) {
    if (doctor) {
      this.editingId = doctor.id;
      this.form = { ...doctor };
    } else {
      this.editingId = null;
      this.form = { fullName: '', dni: '', cmp: '', email: '', phone: '', active: true, photoUrl: 'https://ui-avatars.com/api/?background=random' };
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
      // Only update default avatar if user hasn't uploaded a custom one (custom ones are base64 data:image...)
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
      error: (error) => {
        console.error('Error saving doctor:', error);
        this.isSaving = false;
        if (error.status === 500) {
          alert('Error interno. Es posible que el correo ya esté registrado o haya datos inválidos.');
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
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.form.photoUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

}

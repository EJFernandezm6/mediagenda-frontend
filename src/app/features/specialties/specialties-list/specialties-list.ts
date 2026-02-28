import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpecialtiesService, Specialty } from '../../../core/services/specialties';
import { ConfirmModalService } from '../../../core/services/confirm.service';
import { LucideAngularModule, Plus, Pencil, Trash2, Search, Power } from 'lucide-angular';
import { FormsModule } from '@angular/forms';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';

@Component({
  selector: 'app-specialties-list',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule, PaginationComponent],
  templateUrl: './specialties-list.html',
  styleUrl: './specialties-list.css'
})
export class SpecialtiesListComponent {
  private service = inject(SpecialtiesService);
  private confirmService = inject(ConfirmModalService);

  // Icons
  readonly icons = { Plus, Pencil, Trash2, Search, Power };

  specialties = this.service.specialties;
  searchTerm = '';

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;

  // Simple Modal State
  isModalOpen = false;
  editingId: string | null = null;
  form = { name: '', description: '', active: true };

  get specialtiesList() {
    return this.specialties();
  }

  get totalItems() {
    return this.service.totalElements();
  }

  onPageChange(page: number) {
    this.currentPage = page;
    this.loadSpecialties();
  }

  onSearchChange() {
    this.currentPage = 1;
    this.loadSpecialties();
  }

  onSearchInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const cleanValue = input.value.replace(/[^a-zA-Z áéíóúÁÉÍÓÚñÑ]/g, '');
    if (input.value !== cleanValue) {
      input.value = cleanValue;
    }
    this.searchTerm = cleanValue;
    this.onSearchChange();
  }

  private loadSpecialties() {
    this.service.refreshSpecialties(this.currentPage - 1, this.itemsPerPage, this.searchTerm);
  }

  openModal(specialty?: Specialty) {
    if (specialty) {
      this.editingId = specialty.specialtyId;
      this.form = { ...specialty };
    } else {
      this.editingId = null;
      this.form = { name: '', description: '', active: true };
    }
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  save() {
    const isDuplicate = this.specialtiesList.some(s =>
      s.name.toLowerCase().trim() === this.form.name.toLowerCase().trim() &&
      s.specialtyId !== this.editingId
    );

    if (isDuplicate) {
      alert(`La especialidad "${this.form.name}" ya existe.`);
      return;
    }

    if (this.editingId) {
      this.service.updateSpecialty(this.editingId, this.form).subscribe({
        next: () => this.closeModal(),
        error: (err) => alert('Error al actualizar especialidad: ' + (err.error?.message || err.message))
      });
    } else {
      this.service.addSpecialty(this.form).subscribe({
        next: () => this.closeModal(),
        error: (err) => alert('Error al crear especialidad: ' + (err.error?.message || err.message))
      });
    }
  }

  toggleActive(specialty: Specialty) {
    this.service.updateStatus(specialty.specialtyId, !specialty.active).subscribe();
  }

  async delete(id: string) {
    const confirmed = await this.confirmService.confirm({
      title: 'Eliminar Especialidad',
      message: '¿Estás seguro de que deseas eliminar esta especialidad?',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar'
    });

    if (confirmed) {
      this.service.deleteSpecialty(id).subscribe({
        error: () => alert('No se pudo eliminar la especialidad. Es posible que esté asignada a uno o más médicos en este momento.')
      });
    }
  }
}
// Force rebuild Sat Feb  7 18:25:41 -05 2026

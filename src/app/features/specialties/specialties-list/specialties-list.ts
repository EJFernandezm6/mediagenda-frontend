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
    if (this.editingId) {
      this.service.updateSpecialty(this.editingId, this.form).subscribe(() => {
        this.closeModal();
      });
    } else {
      this.service.addSpecialty(this.form).subscribe(() => {
        this.closeModal();
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
      this.service.deleteSpecialty(id).subscribe();
    }
  }
}
// Force rebuild Sat Feb  7 18:25:41 -05 2026

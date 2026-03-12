import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpecialtiesService, Specialty } from '../../../core/services/specialties';
import { ConfirmModalService } from '../../../core/services/confirm.service';
import { LucideAngularModule, Plus, Search, Pencil, SquarePen, Trash2, Activity, Power, X } from 'lucide-angular';
import { ButtonComponent } from '../../../shared/components/ui/button/button.component';
import { CardComponent } from '../../../shared/components/ui/card/card.component';
import { FormsModule } from '@angular/forms';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select';
import { PageHeaderComponent } from '../../../shared/components/ui/page-header/page-header.component';
import { SearchInputComponent } from '../../../shared/components/ui/search-input/search-input.component';

@Component({
  selector: 'app-specialties-list',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    LucideAngularModule, 
    PaginationComponent, 
    ButtonComponent, 
    CardComponent, 
    SearchableSelectComponent,
    PageHeaderComponent,
    SearchInputComponent
  ],
  templateUrl: './specialties-list.html',
  styleUrl: './specialties-list.css'
})
export class SpecialtiesListComponent implements OnInit {
  private service = inject(SpecialtiesService);
  private confirmService = inject(ConfirmModalService);

  // Icons
  readonly icons = { Plus, Search, Pencil, SquarePen, Trash2, Activity, Power, X };

  specialties = this.service.specialties;

  // Local Pagination & Search State
  searchTerm = signal('');
  statusFilter = signal('ALL');
  currentPage = signal(1);
  itemsPerPage = 6;

  statusOptions = signal<SelectOption[]>([
    { id: 'ALL', label: 'Todos los estados' },
    { id: 'ACTIVE', label: 'Solo Activas' },
    { id: 'INACTIVE', label: 'Solo Inactivas' }
  ]);

  // Simple Modal State
  isModalOpen = false;
  editingId: string | null = null;
  form = { name: '', description: '', active: true };

  // Computed state for local filtering and pagination
  filteredSpecialties = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const status = this.statusFilter();
    let specs = this.specialties();

    // Filter by status
    if (status === 'ACTIVE') {
      specs = specs.filter(s => s.active !== false);
    } else if (status === 'INACTIVE') {
      specs = specs.filter(s => s.active === false);
    }

    if (!term) return specs;

    return specs.filter(s =>
      s.name.toLowerCase().includes(term) ||
      (s.description && s.description.toLowerCase().includes(term))
    );
  });

  get specialtiesList() {
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    return this.filteredSpecialties().slice(start, start + this.itemsPerPage);
  }

  ngOnInit() {
    // Service auto-fetches on init
  }

  get totalItems() {
    return this.filteredSpecialties().length;
  }

  onPageChange(page: number) {
    this.currentPage.set(page);
  }

  onSearch(value: string) {
    this.searchTerm.set(value);
    this.currentPage.set(1);
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
    const isDuplicate = this.specialtiesList.some((s: Specialty) =>
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

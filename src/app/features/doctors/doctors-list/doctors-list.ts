import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DoctorsService, Doctor } from '../../../core/services/doctors';
import { LucideAngularModule, Plus, Pencil, Trash2, Search, Star, Phone, Mail, FileBadge } from 'lucide-angular';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-doctors-list',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule],
  templateUrl: './doctors-list.html',
  styleUrl: './doctors-list.css'
})
export class DoctorsListComponent {
  private service = inject(DoctorsService);

  // Icons
  readonly icons = { Plus, Pencil, Trash2, Search, Star, Phone, Mail, FileBadge };

  doctors = this.service.doctors;
  searchTerm = '';

  // Modal State
  isModalOpen = false;
  editingId: string | null = null;
  form: any = { fullName: '', cmp: '', email: '', phone: '', active: true, photoUrl: '' };

  get filteredDoctors() {
    return this.doctors().filter(d =>
      d.fullName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      d.cmp.includes(this.searchTerm)
    );
  }

  openModal(doctor?: Doctor) {
    if (doctor) {
      this.editingId = doctor.id;
      this.form = { ...doctor };
    } else {
      this.editingId = null;
      this.form = { fullName: '', cmp: '', email: '', phone: '', active: true, photoUrl: 'https://ui-avatars.com/api/?background=random' };
    }
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  save() {
    // Generate avatar if name changed
    if (!this.form.photoUrl || this.form.photoUrl.includes('ui-avatars')) {
      this.form.photoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(this.form.fullName)}&background=random`;
    }

    if (this.editingId) {
      this.service.updateDoctor(this.editingId, this.form);
    } else {
      this.service.addDoctor(this.form);
    }
    this.closeModal();
  }

  delete(id: string) {
    if (confirm('¿Estás seguro de eliminar este médico?')) {
      this.service.deleteDoctor(id);
    }
  }
}

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PatientsService, Patient } from '../../../core/services/patients';
import { LucideAngularModule, Plus, Search, FileText, User } from 'lucide-angular';

@Component({
  selector: 'app-patients-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './patients-list.html',
  styleUrl: './patients-list.css'
})
export class PatientsListComponent {
  private service = inject(PatientsService);
  private router = inject(Router);

  readonly icons = { Plus, Search, FileText, User };

  patients = this.service.patients;
  searchTerm = '';

  // Modal
  isModalOpen = false;
  form: any = { fullName: '', dni: '', email: '', phone: '', age: 18, gender: 'M' };

  get filteredPatients() {
    return this.patients().filter(p =>
      p.fullName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      p.dni.includes(this.searchTerm)
    );
  }

  viewHistory(id: string) {
    this.router.navigate(['/app/patients', id]);
  }

  openModal() {
    this.form = { fullName: '', dni: '', email: '', phone: '', age: 18, gender: 'M' };
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  save() {
    this.service.addPatient(this.form).subscribe(() => {
      this.closeModal();
    });
  }
}

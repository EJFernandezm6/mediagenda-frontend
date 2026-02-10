import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PatientsService, Patient, Consultation } from '../../../core/services/patients';
import { DoctorsService } from '../../../core/services/doctors';
import { SpecialtiesService } from '../../../core/services/specialties';
import { LucideAngularModule, Plus, Search, FileText, User, Pencil, ChevronDown, ChevronUp, Stethoscope, Activity, Calendar, ArrowRight, Eye, Columns } from 'lucide-angular';



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
  private doctorService = inject(DoctorsService);
  private specialtyService = inject(SpecialtiesService);


  readonly icons = { Plus, Search, FileText, User, Pencil, ChevronDown, ChevronUp, Stethoscope, Activity, Calendar, ArrowRight, Eye, Columns };


  patients = this.service.patients;
  searchTerm = '';

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
  form: any = { fullName: '', dni: '', email: '', phone: '', age: 18, gender: 'M' };

  get filteredPatients() {
    return this.patients().filter(p =>
      p.fullName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      p.dni.includes(this.searchTerm)
    );
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
    if (this.form.patientId) {
      this.service.updatePatient(this.form.patientId, this.form).subscribe(() => {
        this.closeModal();
      });
    } else {
      this.service.addPatient(this.form).subscribe(() => {
        this.closeModal();
      });
    }
  }

}

import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppointmentsService, Appointment } from '../../../core/services/appointments';
import { DoctorsService } from '../../../core/services/doctors';
import { SpecialtiesService } from '../../../core/services/specialties';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Search, Filter, Calendar, User, FileText, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-angular';

function toISODate(d: Date): string {
  const pad = (n: number) => n < 10 ? '0' + n : n;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

@Component({
  selector: 'app-appointments-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './appointments-list.html',
  styleUrl: './appointments-list.css',
})
export class AppointmentsList implements OnInit {
  private appointmentsService = inject(AppointmentsService);
  private doctorsService = inject(DoctorsService);
  private specialtiesService = inject(SpecialtiesService);

  // Icons
  readonly icons = {
    Search, Filter, Calendar, User, FileText, CheckCircle, Clock, XCircle, AlertCircle
  };

  // Base Data
  allAppointments = this.appointmentsService.appointments;
  availableDoctors = this.doctorsService.doctors;
  availableSpecialties = this.specialtiesService.specialties;

  // Filters State
  dateFrom = signal<string>(toISODate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  dateTo = signal<string>(toISODate(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)));

  selectedStatus = signal<string[]>([]);
  selectedDoctorId = signal<string>('');
  selectedSpecialtyId = signal<string>('');
  searchPatient = signal<string>('');

  // Dropdown options
  readonly appointmentStatuses = [
    'PROGRAMADA', 'CONFIRMADA', 'EN ESPERA', 'EN ATENCION', 'ATENDIDA', 'PERDIDA', 'CANCELADA'
  ];

  // Initialization
  ngOnInit() {
    this.refreshData();
    // Load dropdown base data if needed
    if (this.availableDoctors().length === 0) {
      this.doctorsService.getDoctors();
      this.specialtiesService.refreshSpecialties();
    }
  }

  refreshData() {
    this.appointmentsService.refreshAppointmentsByRange(this.dateFrom(), this.dateTo());
  }

  // Computed Filtered Data
  filteredAppointments = computed(() => {
    let list = this.allAppointments();

    const statusFilter = this.selectedStatus();
    if (statusFilter.length > 0) {
      list = list.filter(a => statusFilter.includes(a.status || ''));
    }

    const docFilter = this.selectedDoctorId();
    if (docFilter) {
      list = list.filter(a => a.doctorId === docFilter);
    }

    const specFilter = this.selectedSpecialtyId();
    if (specFilter) {
      list = list.filter(a => a.specialtyId === specFilter);
    }

    const searchStr = this.searchPatient().toLowerCase();
    if (searchStr) {
      list = list.filter(a => {
        // We'll need to fetch the patient name or assume it comes mapped.
        // For now, if patientId contains the string, or we have patient name.
        return a.patientId.toLowerCase().includes(searchStr);
      });
    }

    return list.sort((a, b) => new Date(b.appointmentDate + 'T' + b.startTime).getTime() - new Date(a.appointmentDate + 'T' + a.startTime).getTime());
  });

  // KPIs
  totalAppointments = computed(() => this.filteredAppointments().length);
  totalAtendidas = computed(() => this.filteredAppointments().filter(a => a.status === 'ATENDIDA').length);
  totalProgramadas = computed(() => this.filteredAppointments().filter(a => ['PROGRAMADA', 'CONFIRMADA', 'EN ESPERA', 'EN ATENCION'].includes(a.status || '')).length);
  totalCanceladas = computed(() => this.filteredAppointments().filter(a => ['CANCELADA', 'PERDIDA'].includes(a.status || '')).length);

  getDoctorName(id: string) {
    return this.availableDoctors().find(d => d.id === id || d.doctorId === id || (d as any).userId === id)?.fullName || id;
  }

  getSpecialtyName(id: string) {
    return this.availableSpecialties().find(s => s.specialtyId === id)?.name || id;
  }

  getPatientName(id: string) {
    // If we have a way to fetch patient names here, we should. 
    // For now we use the ID or search if available.
    return id;
  }

  // Status mapping helper
  getStatusColorClass(status: string | undefined): string {
    switch (status) {
      case 'ATENDIDA': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'PROGRAMADA': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'CONFIRMADA': return 'bg-green-100 text-green-800 border-green-200';
      case 'EN ESPERA': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'EN ATENCION': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'PERDIDA': return 'bg-red-100 text-red-800 border-red-200';
      case 'CANCELADA': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  }
}

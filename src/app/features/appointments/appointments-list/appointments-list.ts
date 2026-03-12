import { Component, inject, OnInit, signal, computed, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppointmentsService, Appointment } from '../../../core/services/appointments';
import { DoctorsService } from '../../../core/services/doctors';
import { SpecialtiesService } from '../../../core/services/specialties';
import { PatientsService } from '../../../core/services/patients';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Search, Filter, Calendar, User, CheckCircle, Clock, AlertCircle, FileSpreadsheet, Plus, X, Columns, SquarePen, FileText } from 'lucide-angular';
import { DashboardAppService } from '../../dashboard/dashboard-app.service';
import { DatePickerComponent } from '../../../shared/components/datepicker/datepicker';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { PageHeaderComponent } from '../../../shared/components/ui/page-header/page-header.component';

function toISODate(d: Date): string {
  const pad = (n: number) => n < 10 ? '0' + n : n;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

@Component({
  selector: 'app-appointments-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, DatePickerComponent, SearchableSelectComponent, PaginationComponent, PageHeaderComponent],
  templateUrl: './appointments-list.html',
  styleUrl: './appointments-list.css',
})
export class AppointmentsList implements OnInit {
  private appointmentsService = inject(AppointmentsService);
  private doctorsService = inject(DoctorsService);
  private specialtiesService = inject(SpecialtiesService);
  private patientsService = inject(PatientsService);
  private dashboardService = inject(DashboardAppService);

  // Icons
  readonly icons = {
    Search, Filter, Calendar, User, CheckCircle, Clock, AlertCircle, FileSpreadsheet, Plus, X, Columns, SquarePen, FileText
  };


  // Base Data
  allAppointments = this.appointmentsService.appointments;
  availableDoctors = this.doctorsService.doctors;
  availableSpecialties = this.specialtiesService.specialties;
  patients = signal<any[]>([]);

  // Filters State
  dateFrom = signal<string>(toISODate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  dateTo = signal<string>(toISODate(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)));

  // Local Pagination & Search State
  currentPage = signal(1);
  itemsPerPage = 4;
  totalItems = 0;

  selectedStatus = signal<string[]>([]);
  selectedDoctorId = signal<string | number>('');
  selectedSpecialtyId = signal<string | number>('');
  searchPatient = signal<string | number>('');

  // Options for custom selects
  patientOptions = computed<SelectOption[]>(() => 
    this.patients().map(p => ({ id: p.patientId || p.id, label: p.fullName }))
  );

  doctorOptions = computed<SelectOption[]>(() => 
    this.availableDoctors().map(d => ({ id: d.id || d.doctorId || (d as any).userId, label: d.fullName }))
  );

  statusOptions = computed<SelectOption[]>(() => 
    this.appointmentStatuses.map(s => ({ id: s, label: s }))
  );

  // Dropdown options
  readonly appointmentStatuses = [
    'PROGRAMADA', 'CONFIRMADA', 'EN ESPERA', 'EN ATENCION', 'ATENDIDA', 'PERDIDA', 'CANCELADA'
  ];
  constructor() {
    effect(() => {
      // Trigger update when dates or the service's refreshTrigger change
      const from = this.dateFrom();
      const to = this.dateTo();
      const trigger = this.appointmentsService.refreshTrigger();
      
      untracked(() => {
        this.refreshData();
      });
    });
  }

  ngOnInit() {
    // Load dropdown base data if needed
    if (this.availableDoctors().length === 0) {
      this.doctorsService.getDoctors();
      this.specialtiesService.refreshSpecialties();
    }
    // Load patients for name mapping
    this.patientsService.getAllPatientsForSelect().subscribe(data => {
      this.patients.set(data.content);
    });
  }

  refreshData() {
    const from = this.dateFrom(), to = this.dateTo();
    this.appointmentsService.refreshAppointmentsByRange(from, to);
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

    const searchStr = this.searchPatient().toString().toLowerCase();
    if (searchStr) {
      list = list.filter(a => {
        const pName = this.getPatientName(a.patientId).toLowerCase();
        const pId = a.patientId.toString().toLowerCase();
        return pId.includes(searchStr) || pName.includes(searchStr);
      });
    }

    const sorted = list.sort((a, b) => new Date(b.appointmentDate + 'T' + b.startTime).getTime() - new Date(a.appointmentDate + 'T' + a.startTime).getTime());
    
    // Update total items for pagination
    this.totalItems = sorted.length;

    // Apply pagination
    const startIndex = (this.currentPage() - 1) * this.itemsPerPage;
    return sorted.slice(startIndex, startIndex + this.itemsPerPage);
  });

  onPageChange(page: number) {
    this.currentPage.set(page);
  }

  exportExcel() {
    console.log('Exportando a Excel...');
    // Lógica futura de exportación
  }


  getDoctorName(id: string) {
    return this.availableDoctors().find(d => d.id === id || d.doctorId === id || (d as any).userId === id)?.fullName || id;
  }

  getSpecialtyName(id: string) {
    return this.availableSpecialties().find(s => s.specialtyId === id)?.name || id;
  }

  getPatientName(id: string) {
    return this.patients().find(p => p.patientId === id || (p as any).id === id)?.fullName || id;
  }

  getPatientDni(id: string) {
    return this.patients().find(p => p.patientId === id || (p as any).id === id)?.dni || '---';
  }

  // Status mapping helper - Modernized for Flat Pills
  getStatusColorClass(status: string | undefined): string {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'ATENDIDA': return 'bg-success-soft text-success-hover border-transparent';
      case 'PROGRAMADA': return 'bg-blue-50 text-blue-700 border-transparent';
      case 'CONFIRMADA': return 'bg-emerald-50 text-emerald-700 border-transparent';
      case 'EN ESPERA': return 'bg-indigo-50 text-indigo-700 border-transparent';
      case 'EN ATENCION': return 'bg-purple-50 text-purple-700 border-transparent';
      case 'PERDIDA': return 'bg-danger-soft text-danger-hover border-transparent';
      case 'CANCELADA': return 'bg-muted text-text-muted border-transparent';
      default: return 'bg-muted text-text-light border-transparent';
    }
  }

  formatStatus(status: string | undefined): string {
    if (!status) return 'Agendada';
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  }
}

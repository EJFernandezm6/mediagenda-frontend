import { Component, inject, OnInit, signal, computed, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppointmentsService, Appointment } from '../../../core/services/appointments';
import { DoctorsService } from '../../../core/services/doctors';
import { SpecialtiesService } from '../../../core/services/specialties';
import { PatientsService } from '../../../core/services/patients';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Search, Filter, Calendar, User, CheckCircle, Clock, AlertCircle, FileSpreadsheet, Plus, X, Columns, SquarePen, FileText, Eye, Wallet, Check } from 'lucide-angular';
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
    Search, Filter, Calendar, User, CheckCircle, Clock, AlertCircle, FileSpreadsheet, Plus, X, Columns, SquarePen, FileText, Eye, Wallet, Check
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
  itemsPerPage = 10;

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
    'PROGRAMADA', 'CONFIRMADA', 'EN_ESPERA', 'EN_ATENCION', 'ATENDIDA', 'PERDIDA', 'CANCELADA'
  ];

  // UI helpers for status and payment mapping (aligned with Calendar)
  protected readonly APPOINTMENT_STATUS_UI: Record<string, { label: string, class: string }> = {
    'PROGRAMADA': { label: 'Programada', class: 'bg-blue-50 text-blue-700 border-blue-200' },
    'CONFIRMADA': { label: 'Confirmada', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    'EN_ESPERA': { label: 'En espera', class: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    'EN_ATENCION': { label: 'En atención', class: 'bg-purple-50 text-purple-700 border-purple-200' },
    'ATENDIDA': { label: 'Atendida', class: 'bg-success-soft text-success-hover border-transparent' },
    'PERDIDA': { label: 'No asistió', class: 'bg-danger-soft text-danger-hover border-transparent' },
    'CANCELADA': { label: 'Cancelada', class: 'bg-muted text-text-muted border-transparent' }
  };

  protected readonly PAYMENT_METHOD_UI: Record<string, { label: string, class: string }> = {
    'CASH': { label: 'Efectivo', class: 'bg-emerald-600 text-white border-transparent shadow-sm' },
    'YAPE': { label: 'Yape', class: 'bg-[#742880] text-white border-transparent shadow-sm' },
    'PLIN': { label: 'Plin', class: 'bg-[#00D9C5] text-gray-900 font-bold border-transparent' },
    'CARD': { label: 'Tarjeta', class: 'bg-slate-800 text-white border-transparent' }
  };

  // Detail Modal State
  isDetailsModalOpen = signal(false);
  selectedAppointment = signal<Appointment | null>(null);
  isConfirmingCancel = signal(false);
  saving = signal(false);

  protected readonly String = String;

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

  // Computed All Filtered Data (without slice)
  allFilteredAppointments = computed(() => {
    let list = this.allAppointments();

    const statusFilter = this.selectedStatus();
    if (statusFilter.length > 0) {
      list = list.filter(a => statusFilter.includes((a.status || '').toUpperCase()));
    }

    const docFilter = this.selectedDoctorId();
    if (docFilter) {
      list = list.filter(a => String(a.doctorId || '').trim() === String(docFilter).trim());
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

    return list.sort((a, b) => new Date(a.appointmentDate + 'T' + a.startTime).getTime() - new Date(b.appointmentDate + 'T' + b.startTime).getTime());
  });

  filteredAppointments = computed(() => {
    const list = this.allFilteredAppointments();
    const startIndex = (this.currentPage() - 1) * this.itemsPerPage;
    return list.slice(startIndex, startIndex + this.itemsPerPage);
  });

  get totalItems() {
    return this.allFilteredAppointments().length;
  }

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
    return this.patients().find(p => p.patientId === id || (p as any).id === id)?.documentNumber || '---';
  }

  // Status mapping helper - Modernized for Flat Pills
  getStatusColorClass(status: string | undefined): string {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'ATENDIDA': return 'bg-success-soft text-success-hover border-transparent';
      case 'PROGRAMADA': return 'bg-blue-50 text-blue-700 border-transparent';
      case 'CONFIRMADA': return 'bg-emerald-50 text-emerald-700 border-transparent';
      case 'EN_ESPERA': return 'bg-indigo-50 text-indigo-700 border-transparent';
      case 'EN_ATENCION': return 'bg-purple-50 text-purple-700 border-transparent';
      case 'PERDIDA': return 'bg-danger-soft text-danger-hover border-transparent';
      case 'CANCELADA': return 'bg-muted text-text-muted border-transparent';
      default: return 'bg-muted text-text-light border-transparent';
    }
  }

  formatStatus(status: string | undefined): string {
    if (!status) return 'Agendada';
    const clean = status.replace(/_/g, ' ').toLowerCase();
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }

  // --- Modal Logic ---

  openDetails(app: Appointment) {
    this.selectedAppointment.set(app);
    this.isDetailsModalOpen.set(true);
    this.isConfirmingCancel.set(false);
  }

  closeDetails() {
    this.isDetailsModalOpen.set(false);
    this.selectedAppointment.set(null);
  }

  updateAppointmentStatus(id: string, status: Appointment['status']) {
    this.saving.set(true);
    this.appointmentsService.updatestatus(id, status);
    // Local update to reflect changes in modal immediately
    const current = this.selectedAppointment();
    if (current && current.appointmentId === id) {
      this.selectedAppointment.set({ ...current, status });
    }
    this.saving.set(false);
  }

  validatePayment() {
    const app = this.selectedAppointment();
    if (!app || !app.appointmentId) return;

    this.saving.set(true);
    const method = app.paymentMethod || 'CASH';
    this.appointmentsService.updatePayment(app.appointmentId, method, 'PAID');
    this.selectedAppointment.set({ ...app, paymentStatus: 'PAID', paymentMethod: method as any });
    this.saving.set(false);
  }

  showCancelConfirmation() {
    this.isConfirmingCancel.set(true);
  }

  cancelCancelConfirmation() {
    this.isConfirmingCancel.set(false);
  }

  confirmCancel() {
    const app = this.selectedAppointment();
    if (!app || !app.appointmentId) return;

    this.saving.set(true);
    this.appointmentsService.cancelAppointment(app.appointmentId);
    this.closeDetails();
    this.saving.set(false);
  }

  // --- Formatting Helpers (Sync with Calendar) ---

  formatDate(isoDate: string): string {
    if (!isoDate) return '';
    const date = new Date(isoDate + 'T12:00:00'); // Use noon to avoid timezone shifts
    return date.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    });
  }

  formatTime12Hour(time: string): string {
    if (!time) return '';
    const [h, m] = time.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
  }

  getAppointmentStatusLabel(app: Appointment): string {
    const status = (app.status || '').toUpperCase();
    return this.APPOINTMENT_STATUS_UI[status]?.label || status;
  }

  getPaymentMethodLabel(method?: string): string {
    const m = (method || '').toUpperCase();
    return this.PAYMENT_METHOD_UI[m]?.label || m || 'Por cobrar';
  }
}

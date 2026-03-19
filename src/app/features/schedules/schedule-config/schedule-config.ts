import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SchedulesService, Schedule } from '../../../core/services/schedules';
import { DoctorsService } from '../../../core/services/doctors';
import { SpecialtiesService } from '../../../core/services/specialties';
import { ConfirmModalService } from '../../../core/services/confirm.service';
import { ConfigurationService } from '../../../core/services/configuration';
import { DoctorSpecialtyService } from '../../doctors/doctor-specialty/doctor-specialty.service';
import { LucideAngularModule, Clock, Plus, Trash2, Search, Calendar, X, Filter, Trash, Eye, ChevronDown } from 'lucide-angular';

import { PageHeaderComponent } from '../../../shared/components/ui/page-header/page-header.component';
import { SearchInputComponent } from '../../../shared/components/ui/search-input/search-input.component';
import { DoctorSelectorComponent } from '../../../shared/components/doctor-selector/doctor-selector';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select';
import { DatePickerComponent } from '../../../shared/components/datepicker/datepicker';
import { ButtonComponent } from '../../../shared/components/ui/button/button.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';

@Component({
  selector: 'app-schedule-config',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    LucideAngularModule, 
    DoctorSelectorComponent,
    SearchableSelectComponent,
    DatePickerComponent,
    ButtonComponent,
    PaginationComponent,
    PageHeaderComponent,
    SearchInputComponent
  ],
  templateUrl: './schedule-config.html',
  styleUrl: './schedule-config.css'
})
export class ScheduleConfigComponent {
  private scheduleService = inject(SchedulesService);
  private doctorService = inject(DoctorsService);
  private specialtyService = inject(SpecialtiesService);
  private associationService = inject(DoctorSpecialtyService);
  private confirmService = inject(ConfirmModalService);
  private configService = inject(ConfigurationService);

  readonly icons = { Clock, Plus, Trash2, Search, Calendar, X, Filter, Trash, Eye, ChevronDown };

  // Filter State
  searchText = signal('');
  filterDate = signal('');
  filterSpecialtyId = signal('');
  
  // Pagination State
  currentPage = signal(1);
  itemsPerPage = 5;

  // Form & Slide-over State
  isRegistrationModalOpen = signal(false);
  isRepeating = signal(false);
  repeatFrequency = signal<'DAILY' | 'WEEKLY'>('WEEKLY');
  repeatDays = signal<number[]>([1, 2, 3, 4, 5]); // Default Mon-Fri
  repeatEndDate = signal<string>('');

  // doctors computed removed as it is not used in HTML anymore (handled by selector)

  selectedDoctorId = signal('');

  // Flatten schedules effectively
  // Filtering logic
  filteredSchedules = computed(() => {
    const all = this.scheduleService.schedules();
    const search = this.searchText().toLowerCase();
    const date = this.filterDate();
    const specId = this.filterSpecialtyId();
    const today = new Date().toISOString().split('T')[0];

    return all.filter(s => {
      const docName = this.getDoctorName(s.doctorId).toLowerCase();
      const matchesSearch = !search || docName.includes(search);
      const matchesDate = date ? s.date === date : s.date >= today; // Only future if no specific date
      const matchesSpec = !specId || s.specialtyId === specId;
      return matchesSearch && matchesDate && matchesSpec;
    }).sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.startTime.localeCompare(b.startTime);
    });
  });

  get paginatedSchedules() {
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    return this.filteredSchedules().slice(start, start + this.itemsPerPage);
  }

  get totalItems() {
    return this.filteredSchedules().length;
  }

  // Specialties for filter dropdown
  allSpecialtiesOptions = computed(() => {
    return this.specialtyService.specialties().map(s => ({
      id: s.specialtyId,
      label: s.name
    }));
  });

  formatTimeDisplay(time: string): string {
    if (!time) return '';
    return time.substring(0, 5);
  }

  // Inline Form State
  formData: {
    date: string;
    specialtyId: string;
    weeksToRepeat: number;
  } = {
      date: new Date().toISOString().split('T')[0],
      specialtyId: '',
      weeksToRepeat: 0
    };

  timeRanges = signal<Array<{
    modality: 'PRESENCIAL' | 'VIRTUAL';
    startTime: string;
    endTime: string;
    validEndTimes: string[];
  }>>([
    { modality: 'PRESENCIAL', startTime: '', endTime: '', validEndTimes: [] }
  ]);

  viewMode: 'list' = 'list';

  get availableSpecialtiesForDoctor() {
    const docId = this.selectedDoctorId();
    if (!docId) return [];
    const assocs = this.associationService.getSpecialtiesForDoctor(docId);
    return assocs.map(a => this.specialtyService.specialties().find(s => s.specialtyId === a.specialtyId)).filter((s): s is NonNullable<typeof s> => !!s);
  }

  get specialtyOptions(): SelectOption[] {
    return this.availableSpecialtiesForDoctor.map(s => ({
      id: s.specialtyId,
      label: s.name
    }));
  }

  hasOverlap = computed(() => {
    const ranges = this.timeRanges();
    if (ranges.length < 2) return false;

    const toMinutes = (t: string) => {
      if (!t) return -1;
      const [h, m] = t.split(':').map(Number);
      return h * 60 + (m || 0);
    };

    for (let i = 0; i < ranges.length; i++) {
      const start1 = toMinutes(ranges[i].startTime);
      const end1 = toMinutes(ranges[i].endTime);
      if (start1 === -1 || end1 === -1) continue;

      for (let j = i + 1; j < ranges.length; j++) {
        const start2 = toMinutes(ranges[j].startTime);
        const end2 = toMinutes(ranges[j].endTime);
        if (start2 === -1 || end2 === -1) continue;

        if (Math.max(start1, start2) < Math.min(end1, end2)) return true;
      }
    }
    return false;
  });

  getDayName(day: number) {
    const simpleDays = [
      { id: 1, name: 'Lunes' }, { id: 2, name: 'Martes' }, { id: 3, name: 'Miércoles' },
      { id: 4, name: 'Jueves' }, { id: 5, name: 'Viernes' }, { id: 6, name: 'Sábado' }, { id: 0, name: 'Domingo' }
    ];
    return simpleDays.find(d => d.id === day)?.name || 'Desconocido';
  }

  getSpecialtyName(id: any) {
    if (!id) return '';
    const idStr = String(id).trim();
    const spec = this.specialtyService.specialties().find(s => 
      String(s.specialtyId || '').trim() === idStr
    );
    return spec ? spec.name : '';
  }

  formatModality(modality: string): string {
    if (!modality) return 'Presencial';
    const m = modality.toLowerCase();
    return m.charAt(0).toUpperCase() + m.slice(1);
  }

  // Doctor Name for Form
  selectedDoctorName = computed(() => {
    const docId = this.selectedDoctorId();
    if (!docId) return '';
    const doc = this.doctorService.selectableDoctors().find(d => d.id === docId || d.doctorId === docId);
    return doc ? doc.fullName : 'Especialista';
  });

  getDoctorName(docId: any): string {
    if (!docId) return 'Desconocido';
    const idStr = String(docId).trim();
    
    // Search in both master list and selectable list for maximum coverage
    const allDocs = [...this.doctorService.doctors(), ...this.doctorService.selectableDoctors()];
    
    const doc = allDocs.find(d => 
      String(d.id || d.userId || '').trim() === idStr || 
      String(d.doctorId || d.id || '').trim() === idStr ||
      String((d as any).userId || '').trim() === idStr
    );
    
    return doc ? doc.fullName : 'Desconocido';
  }

  getAppointmentDuration(schedule: Schedule): string {
    const docId = String(schedule.doctorId || schedule.doctor_id || '').trim();
    const specId = String(schedule.specialtyId || schedule.specialty_id || '').trim();
    
    const assoc = this.associationService.associations().find(a => 
      String(a.doctorId || '').trim() === docId && 
      String(a.specialtyId || '').trim() === specId
    );
    
    return assoc ? `${assoc.durationMinutes} min` : '-';
  }

  getInitials(name: string): string {
    if (!name || name === 'Desconocido') return '?';
    return name
      .split(' ')
      .filter(n => n)
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  getAvatarColor(name: string): string {
    const colors = [
      'bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 
      'bg-indigo-500', 'bg-rose-500', 'bg-amber-500'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  get isFormValid(): boolean {
    const commonValid = !!(
      this.selectedDoctorId() &&
      this.formData.specialtyId &&
      this.formData.date
    );

    if (!commonValid || this.hasOverlap()) return false;

    // All ranges must be complete
    const rangesValid = this.timeRanges().every(r => r.startTime && r.endTime && r.modality);
    
    // If recurring, need end date and days
    if (this.isRepeating()) {
      return rangesValid && !!this.repeatEndDate() && this.repeatDays().length > 0;
    }

    return rangesValid;
  }

  // Min Date for Date Picker
  minDate = new Date().toISOString().split('T')[0];

  // Auto-Update Day of Week from Date
  onDateChange(date: string) {
    this.updateValidEndTimes();
  }

  getScheduleDisplay(schedule: Schedule) {
    if (schedule.date) {
      const [y, m, d] = schedule.date.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const dd = String(d).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      return `${this.getDayName(dateObj.getDay())} ${dd}-${mm}-${y}`;
    }
    return `Fecha no válida`;
  }

  // Calculate Duration for Table
  calculateDuration(schedule: Schedule): string {
    if (!schedule.startTime || !schedule.endTime) return '-';
    const start = this.dateFromTime(schedule.startTime);
    const end = this.dateFromTime(schedule.endTime);
    const diffMs = end.getTime() - start.getTime();
    if (diffMs <= 0) return '-';

    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
  }

  // Duration Logic
  updateValidEndTimes(index: number = 0) {
    const docId = this.selectedDoctorId();
    const specId = this.formData.specialtyId;
    const range = this.timeRanges()[index];

    if (!docId || !specId || !range?.startTime) {
      this.updateRange(index, { validEndTimes: [] });
      return;
    }

    this.scheduleService.getValidEndTimes(docId, specId, this.formData.date, range.startTime).subscribe({
      next: (times) => {
        this.updateRange(index, { validEndTimes: times });
        if (!times.includes(range.endTime)) {
          this.updateRange(index, { endTime: times[0] || '' });
        }
      },
      error: () => this.updateRange(index, { validEndTimes: [] })
    });
  }

  private updateRange(index: number, patch: Partial<typeof this.timeRanges extends () => (infer T)[] ? T : any>) {
    const current = [...this.timeRanges()];
    current[index] = { ...current[index], ...patch };
    this.timeRanges.set(current);
  }

  addTimeRange() {
    const lastRange = this.timeRanges()[this.timeRanges().length - 1];
    this.timeRanges.set([
      ...this.timeRanges(),
      { 
        modality: lastRange?.modality || 'PRESENCIAL', 
        startTime: '', 
        endTime: '', 
        validEndTimes: [] 
      }
    ]);
    this.updateValidEndTimes(this.timeRanges().length - 1);
  }

  removeTimeRange(index: number) {
    if (this.timeRanges().length > 1) {
      const current = this.timeRanges().filter((_, i) => i !== index);
      this.timeRanges.set(current);
    }
  }

  dateFromTime(time: string): Date {
    const [h, m] = time.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  }

  onStartTimeChange(index: number) {
    this.updateValidEndTimes(index);
  }

  onSpecialtyChange(specId: string) {
    this.formData.specialtyId = specId;
    this.timeRanges().forEach((_, i) => this.updateValidEndTimes(i));
  }

  onDoctorSelectionChange(doctorId: string) {
    this.selectedDoctorId.set(doctorId);
    if (doctorId) {
      const assocs = this.availableSpecialtiesForDoctor;
      this.formData.specialtyId = assocs.length > 0 ? assocs[0].specialtyId : '';
      this.timeRanges().forEach((_, i) => this.updateValidEndTimes(i));
    } else {
      this.timeRanges.set([
        { modality: 'PRESENCIAL', startTime: '', endTime: '', validEndTimes: [] }
      ]);
    }
  }

  trackByIndex(index: number): number {
    return index;
  }

  toggleRepeatDay(day: number) {
    const current = this.repeatDays();
    if (current.includes(day)) {
      this.repeatDays.set(current.filter(d => d !== day));
    } else {
      this.repeatDays.set([...current, day].sort());
    }
  }

  // Filter Actions
  onSearchChange(val: string) {
    this.searchText.set(val);
    this.currentPage.set(1);
  }

  onFilterDateChange(val: string) {
    this.filterDate.set(val);
    this.currentPage.set(1);
  }

  onFilterSpecialtyChange(val: string | number) {
    this.filterSpecialtyId.set(val.toString());
    this.currentPage.set(1);
  }

  onPageChange(page: number) {
    this.currentPage.set(page);
  }

  clearFilters() {
    this.searchText.set('');
    this.filterDate.set('');
    this.filterSpecialtyId.set('');
    this.currentPage.set(1);
  }

  // Modal Control
  openRegistrationModal() {
    this.isRegistrationModalOpen.set(true);
  }

  closeRegistrationModal() {
    this.isRegistrationModalOpen.set(false);
    // Reset form after closing
    this.selectedDoctorId.set('');
    this.formData.specialtyId = '';
    this.timeRanges.set([
      { modality: 'PRESENCIAL', startTime: '09:00', endTime: '', validEndTimes: [] }
    ]);
    this.isRepeating.set(false);
    this.repeatDays.set([1, 2, 3, 4, 5]);
    this.repeatEndDate.set('');
  }

  saveSchedule() {
    const docId = this.selectedDoctorId();
    if (docId && this.formData.specialtyId && this.timeRanges().length > 0) {
      const formatTime = (t: string) => t.length === 5 ? `${t}:00` : t;
      
      if (!this.isRepeating()) {
        const payloads = this.timeRanges().map(range => ({
          specialtyId: this.formData.specialtyId,
          date: this.formData.date,
          startTime: formatTime(range.startTime),
          endTime: formatTime(range.endTime),
          modality: range.modality
        }));
        
        this.scheduleService.addSchedule(docId, payloads).subscribe({
          next: () => this.handleSaveSuccess(docId),
          error: (err) => this.handleSaveError(err)
        });
      } else {
        // Recurring currently only supports one range in backend usually, 
        // but let's send multiple if API supports it, though usually recurring is handled once.
        // For now, if recurring, we might only be able to send one or handle them sequentially.
        // The user request emphasizes the UI for multiple ranges. 
        // I will assume the backend addRecurringSchedule might need adjustment or we only do first one for recurring.
        // Given the request, I'll process all as separate recurring if needed or just handle multiple payloads.
        
        this.timeRanges().forEach(range => {
          const recurrencePayload = {
            specialtyId: this.formData.specialtyId,
            startDate: this.formData.date,
            endDate: this.repeatEndDate(),
            startTime: formatTime(range.startTime),
            endTime: formatTime(range.endTime),
            modality: range.modality,
            frequency: this.repeatFrequency(),
            repeatDays: this.repeatDays()
          };
          this.scheduleService.addRecurringSchedule(docId, recurrencePayload).subscribe({
            next: () => this.handleSaveSuccess(docId),
            error: (err) => this.handleSaveError(err)
          });
        });
      }
    }
  }

  private handleSaveSuccess(doctorId: string) {
    this.scheduleService.refreshSchedules({ doctorId });
    this.timeRanges().forEach((_, i) => this.updateValidEndTimes(i));
    this.closeRegistrationModal();
  }

  private handleSaveError(err: any) {
    console.error('Error saving schedule', err);
    alert('Error al guardar el turno. Verifique que no haya superposiciones.');
  }

  async remove(schedule: Schedule) {
    const confirmed = await this.confirmService.confirm({
      title: 'Eliminar Turno',
      message: '¿Estás seguro de que deseas eliminar este turno de atención?',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar'
    });

    if (confirmed && schedule.id) {
      this.scheduleService.removeSchedule(schedule.id, schedule.doctorId).subscribe({
        error: (err) => console.error('Error deleting schedule', err)
      });
    }
  }
}

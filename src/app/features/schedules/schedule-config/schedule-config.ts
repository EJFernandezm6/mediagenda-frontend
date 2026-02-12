import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SchedulesService, Schedule } from '../../../core/services/schedules';
import { DoctorsService } from '../../../core/services/doctors';
import { SpecialtiesService } from '../../../core/services/specialties';
import { ConfirmModalService } from '../../../core/services/confirm.service';
import { DoctorSpecialtyService } from '../../doctors/doctor-specialty/doctor-specialty.service';
import { LucideAngularModule, Clock, Plus, Trash2 } from 'lucide-angular';

import { DoctorSelectorComponent } from '../../../shared/components/doctor-selector/doctor-selector';

@Component({
  selector: 'app-schedule-config',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, DoctorSelectorComponent],
  templateUrl: './schedule-config.html',
  styleUrl: './schedule-config.css'
})
export class ScheduleConfigComponent {
  private scheduleService = inject(SchedulesService);
  private doctorService = inject(DoctorsService);
  private specialtyService = inject(SpecialtiesService);
  private associationService = inject(DoctorSpecialtyService);
  private confirmService = inject(ConfirmModalService);

  readonly icons = { Clock, Plus, Trash2 };

  doctors = computed(() => {
    const allDoctors = this.doctorService.doctors();
    const allAssociations = this.associationService.associations();
    return allDoctors.filter(d => allAssociations.some(a => a.doctorId === d.id));
  });

  selectedDoctorId = signal('');

  // Flatten schedules effectively
  currentSchedules = computed(() => {
    const docId = this.selectedDoctorId();
    if (!docId) return [];
    const all = this.scheduleService.schedules();
    return all.filter(s => s.doctorId === docId);
  });

  // Removed top-level selectedSpecialtyId

  // Real Dates Generation
  weekDays = computed(() => {
    const today = new Date();
    const currentDay = today.getDay(); // 0-6
    const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1); // Adjust to Monday
    const monday = new Date(today.setDate(diff));

    const days = [];
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    // 1=Mon to 6=Sat
    for (let i = 1; i <= 6; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + (i - 1));
      days.push({
        id: i,
        name: dayNames[i],
        dateLabel: d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
      });
    }
    // Add Sunday (0) at the end or handle it? Assuming Mon-Sat for clinics usually, but sticking to previous structure
    // Adding Sunday as 7th element (id 0)
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    days.push({
      id: 0,
      name: dayNames[0],
      dateLabel: sunday.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
    });

    return days;
  });

  // Modal State
  isModalOpen = false;
  modalData = {
    dayOfWeek: 1,
    date: '', // specific date
    startTime: '09:00',
    endTime: '',
    specialtyId: ''
  };

  viewMode: 'list' = 'list';

  get availableSpecialtiesForDoctor() {
    const docId = this.selectedDoctorId();
    if (!docId) return [];
    const assocs = this.associationService.getSpecialtiesForDoctor(docId);
    return assocs.map(a => this.specialtyService.specialties().find(s => s.specialtyId === a.specialtyId)).filter((s): s is NonNullable<typeof s> => !!s);
  }

  getDayName(day: number) {
    // Fallback for list view
    const simpleDays = [
      { id: 1, name: 'Lunes' }, { id: 2, name: 'Martes' }, { id: 3, name: 'Miércoles' },
      { id: 4, name: 'Jueves' }, { id: 5, name: 'Viernes' }, { id: 6, name: 'Sábado' }, { id: 0, name: 'Domingo' }
    ];
    return simpleDays.find(d => d.id === day)?.name || 'Desconocido';
  }

  getSpecialtyName(id: string) {
    return this.specialtyService.specialties().find(s => s.specialtyId === id)?.name || '';
  }

  // Auto-Update Day of Week from Date
  onDateChange(date: string) {
    if (date) {
      const d = new Date(date);
      // getUTCDay or getDay depending on timezone handling. Usually for simplistic "YYYY-MM-DD" local input:
      // We need to be careful with timezones. 
      // Let's create a date object treating input as local midnight.
      const [y, m, day] = date.split('-').map(Number);
      const localDate = new Date(y, m - 1, day);
      this.modalData.dayOfWeek = localDate.getDay();
    }
  }

  getScheduleDisplay(schedule: Schedule) {
    if (schedule.date) {
      // Format specific date
      const [y, m, d] = schedule.date.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      return `${this.getDayName(dateObj.getDay())} ${d}/${m}/${y}`;
    }
    return `Todos los ${this.getDayName(schedule.dayOfWeek)}s`; // Recurring
  }

  // Duration Logic
  validEndTimes = signal<string[]>([]);

  updateValidEndTimes() {
    const docId = this.selectedDoctorId();
    const specId = this.modalData.specialtyId;
    const startTime = this.modalData.startTime;

    if (!docId || !specId || !startTime) {
      this.validEndTimes.set([]);
      return;
    }

    // Find duration
    const assoc = this.associationService.associations().find(a => a.doctorId === docId && a.specialtyId === specId);
    const duration = assoc?.durationMinutes || 30; // Default 30 if not found

    const times: string[] = [];
    let current = this.dateFromTime(startTime);
    // Limit to next 12 hours or end of day (e.g. 23:59)
    const endLimit = new Date(current);
    endLimit.setHours(23, 59, 0, 0);

    // Generate at least one slot
    current.setMinutes(current.getMinutes() + duration);

    // Add next 8 hours of slots
    for (let i = 0; i < 16; i++) { // 16 * 30min = 8 hours approx, or calculate until end of day
      if (current > endLimit) break;
      times.push(this.timeFromDate(current));
      current.setMinutes(current.getMinutes() + duration);
    }

    this.validEndTimes.set(times);

    // Auto-select first valid end time if current is invalid
    if (!times.includes(this.modalData.endTime)) {
      this.modalData.endTime = times[0];
    }
  }

  dateFromTime(time: string): Date {
    const [h, m] = time.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  }

  timeFromDate(date: Date): string {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }

  // Auto-Update End Time
  onStartTimeChange() {
    this.updateValidEndTimes();
  }

  onSpecialtyChange(specId: string) {
    this.modalData.specialtyId = specId;
    this.updateValidEndTimes();
  }

  openAddModal() {
    if (!this.selectedDoctorId()) return;

    const specId = this.availableSpecialtiesForDoctor[0]?.specialtyId || '';
    const today = new Date().toISOString().split('T')[0];

    this.modalData = {
      dayOfWeek: new Date().getDay(),
      date: today,
      startTime: '09:00',
      endTime: '', // Will be set by updateValidEndTimes
      specialtyId: specId
    };

    this.updateValidEndTimes();
    this.isModalOpen = true;
  }

  saveSchedule() {
    const docId = this.selectedDoctorId();
    if (docId && this.modalData.specialtyId && this.modalData.endTime) {
      const payload = {
        doctorId: docId,
        specialtyId: this.modalData.specialtyId,
        dayOfWeek: this.modalData.dayOfWeek,
        date: this.modalData.date,
        startTime: this.modalData.startTime,
        endTime: this.modalData.endTime
      };

      this.scheduleService.addSchedule(docId, [payload]).subscribe({
        next: () => {
          this.closeModal();
        },
        error: (err) => {
          console.error('Error saving schedule', err);
          alert('Error al guardar el turno. Verifique los datos.');
        }
      });
    }
  }

  closeModal() {
    this.isModalOpen = false;
  }

  async remove(schedule: Schedule) {
    const confirmed = await this.confirmService.confirm({
      title: 'Eliminar Turno',
      message: '¿Estás seguro de que deseas eliminar este turno de atención?',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar'
    });

    if (confirmed) {
      this.scheduleService.removeSchedule(schedule);
    }
  }
}

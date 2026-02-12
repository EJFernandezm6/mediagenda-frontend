import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SchedulesService, Schedule } from '../../../core/services/schedules';
import { DoctorsService } from '../../../core/services/doctors';
import { SpecialtiesService } from '../../../core/services/specialties';
import { ConfirmModalService } from '../../../core/services/confirm.service';
import { ConfigurationService } from '../../../core/services/configuration';
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
  private configService = inject(ConfigurationService);

  readonly icons = { Clock, Plus, Trash2 };

  // doctors computed removed as it is not used in HTML anymore (handled by selector)

  selectedDoctorId = signal('');

  // Flatten schedules effectively
  currentSchedules = computed(() => {
    const docId = this.selectedDoctorId();
    if (!docId) return [];

    const all = this.scheduleService.schedules();
    const today = new Date().toISOString().split('T')[0];

    return all
      .filter(s => s.doctorId === docId)
      // Filter out past dates
      .filter(s => s.date >= today)
      // Sort by Date then Time
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.startTime.localeCompare(b.startTime);
      });
  });

  formatTimeDisplay(time: string): string {
    if (!time) return '';
    return time.substring(0, 5);
  }

  // Modal State
  isModalOpen = false;
  modalData = {
    date: '', // specific date
    startTime: '09:00',
    endTime: '',
    specialtyId: '',
    weeksToRepeat: 0
  };

  viewMode: 'list' = 'list';

  get availableSpecialtiesForDoctor() {
    const docId = this.selectedDoctorId();
    if (!docId) return [];
    const assocs = this.associationService.getSpecialtiesForDoctor(docId);
    return assocs.map(a => this.specialtyService.specialties().find(s => s.specialtyId === a.specialtyId)).filter((s): s is NonNullable<typeof s> => !!s);
  }

  getDayName(day: number) {
    const simpleDays = [
      { id: 1, name: 'Lunes' }, { id: 2, name: 'Martes' }, { id: 3, name: 'Miércoles' },
      { id: 4, name: 'Jueves' }, { id: 5, name: 'Viernes' }, { id: 6, name: 'Sábado' }, { id: 0, name: 'Domingo' }
    ];
    return simpleDays.find(d => d.id === day)?.name || 'Desconocido';
  }

  getSpecialtyName(id: string) {
    return this.specialtyService.specialties().find(s => s.specialtyId === id)?.name || '';
  }

  // Doctor Name for Modal
  selectedDoctorName = computed(() => {
    const docId = this.selectedDoctorId();
    if (!docId) return '';
    const doc = this.doctorService.doctors().find(d => d.id === docId || d.doctorId === docId);
    return doc ? doc.fullName : 'Especialista';
  });

  // Min Date for Date Picker
  minDate = new Date().toISOString().split('T')[0];

  // Auto-Update Day of Week from Date
  onDateChange(date: string) {
    // No specific logic needed for now, handled by ngModel
  }

  getScheduleDisplay(schedule: Schedule) {
    if (schedule.date) {
      const [y, m, d] = schedule.date.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      return `${this.getDayName(dateObj.getDay())} ${d}/${m}/${y}`;
    }
    return `Fecha no válida`;
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

    const assoc = this.associationService.associations().find(a => a.doctorId === docId && a.specialtyId === specId);
    const duration = assoc?.durationMinutes || 30;

    const times: string[] = [];
    let current = this.dateFromTime(startTime);

    // Use configured close time as limit
    const closeTimeStr = this.configService.settings().clinicCloseTime || '20:00';
    const closeDate = this.dateFromTime(closeTimeStr);

    // Ensure closeDate is set to the same day base as current for comparison
    // input of dateFromTime uses "new Date()" which is today.
    // So both are today.

    const endLimit = closeDate;

    current.setMinutes(current.getMinutes() + duration);

    // Generate times until closing time
    while (current <= endLimit) {
      times.push(this.timeFromDate(current));
      current.setMinutes(current.getMinutes() + duration);
    }

    this.validEndTimes.set(times);

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
      date: today,
      startTime: '09:00',
      endTime: '',
      specialtyId: specId,
      weeksToRepeat: 0
    };

    this.updateValidEndTimes();
    this.isModalOpen = true;
  }



  // ...

  saveSchedule() {
    const docId = this.selectedDoctorId();
    if (docId && this.modalData.specialtyId && this.modalData.endTime) {
      // Clean payload
      const formatTime = (t: string) => t.length === 5 ? `${t}:00` : t;
      const payloads: any[] = [];
      const [sy, sm, sd] = this.modalData.date.split('-').map(Number);
      // Create date at noon to avoid timezone rollover issues
      const startDate = new Date(sy, sm - 1, sd, 12, 0, 0);

      const totalOccurrences = 1 + this.modalData.weeksToRepeat;

      for (let i = 0; i < totalOccurrences; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + (i * 7));

        const isoDate = [
          currentDate.getFullYear(),
          (currentDate.getMonth() + 1).toString().padStart(2, '0'),
          currentDate.getDate().toString().padStart(2, '0')
        ].join('-');

        payloads.push({
          specialtyId: this.modalData.specialtyId,
          date: isoDate,
          startTime: formatTime(this.modalData.startTime),
          endTime: formatTime(this.modalData.endTime)
        });
      }

      this.scheduleService.addSchedule(docId, payloads).subscribe({
        next: () => {
          this.closeModal();
          this.scheduleService.refreshSchedules({ doctorId: docId }); // Ensure refresh
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

    if (confirmed && schedule.id) {
      this.scheduleService.removeSchedule(schedule.id, schedule.doctorId).subscribe({
        error: (err) => console.error('Error deleting schedule', err)
      });
    }
  }
}

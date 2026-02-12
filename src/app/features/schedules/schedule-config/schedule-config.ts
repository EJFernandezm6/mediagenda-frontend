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

  // doctors computed removed as it is not used in HTML anymore (handled by selector)

  selectedDoctorId = signal('');

  // Flatten schedules effectively
  currentSchedules = computed(() => {
    const docId = this.selectedDoctorId();
    if (!docId) return [];
    const all = this.scheduleService.schedules();
    return all.filter(s => s.doctorId === docId);
  });

  // Modal State
  isModalOpen = false;
  modalData = {
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
    const endLimit = new Date(current);
    endLimit.setHours(23, 59, 0, 0);

    current.setMinutes(current.getMinutes() + duration);

    for (let i = 0; i < 16; i++) {
      if (current > endLimit) break;
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
      specialtyId: specId
    };

    this.updateValidEndTimes();
    this.isModalOpen = true;
  }

  saveSchedule() {
    const docId = this.selectedDoctorId();
    if (docId && this.modalData.specialtyId && this.modalData.endTime) {
      // Clean payload
      const formatTime = (t: string) => t.length === 5 ? `${t}:00` : t;

      const payload = {
        specialtyId: this.modalData.specialtyId,
        date: this.modalData.date,
        startTime: formatTime(this.modalData.startTime),
        endTime: formatTime(this.modalData.endTime)
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

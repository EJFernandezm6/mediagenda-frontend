import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SchedulesService, Schedule } from '../../../core/services/schedules';
import { DoctorsService } from '../../../core/services/doctors';
import { SpecialtiesService } from '../../../core/services/specialties';
import { DoctorSpecialtyService } from '../../doctors/doctor-specialty/doctor-specialty.service';
import { LucideAngularModule, Clock, Plus, Trash2 } from 'lucide-angular';

@Component({
  selector: 'app-schedule-config',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './schedule-config.html',
  styleUrl: './schedule-config.css'
})
export class ScheduleConfigComponent {
  private scheduleService = inject(SchedulesService);
  private doctorService = inject(DoctorsService);
  private specialtyService = inject(SpecialtiesService);
  private associationService = inject(DoctorSpecialtyService);

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
    startTime: '09:00',
    endTime: '09:30',
    specialtyId: ''
  };

  viewMode: 'list' | 'calendar' = 'calendar'; // Default to calendar

  // Time Slots (30 min intervals)
  timeSlots = Array.from({ length: 26 }, (_, i) => {
    const totalMinutes = (7 * 60) + (i * 30); // Start at 07:00
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  });

  get availableSpecialtiesForDoctor() {
    const docId = this.selectedDoctorId();
    if (!docId) return [];
    const assocs = this.associationService.getSpecialtiesForDoctor(docId);
    return assocs.map(a => this.specialtyService.specialties().find(s => s.id === a.specialtyId)).filter((s): s is NonNullable<typeof s> => !!s);
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
    return this.specialtyService.specialties().find(s => s.id === id)?.name || '';
  }

  // Auto-Update End Time
  onStartTimeChange() {
    if (this.modalData.startTime) {
      this.modalData.endTime = this.addMinutes(this.modalData.startTime, 30);
    }
  }

  // Check if a slot is occupied
  getScheduleForSlot(dayId: number, time: string): Schedule | undefined {
    // We can rely on currentSchedules() which is computed and filtered
    return this.currentSchedules().find(s =>
      s.dayOfWeek === dayId &&
      time >= s.startTime &&
      time < s.endTime
    );
  }

  onSlotClick(dayId: number, time: string) {
    const docId = this.selectedDoctorId();
    if (!docId) return;

    // If slot is already taken, maybe edit? For now, just ignore or log
    const existing = this.getScheduleForSlot(dayId, time);
    if (existing) {
      // Optional: Edit flow
      return;
    }

    // Open Modal
    this.modalData = {
      dayOfWeek: dayId,
      startTime: time,
      endTime: this.addMinutes(time, 30), // Default +30 min
      specialtyId: this.availableSpecialtiesForDoctor[0]?.id || '' // Default to first specialty
    };
    this.isModalOpen = true;
  }

  saveSchedule() {
    const docId = this.selectedDoctorId();
    if (docId && this.modalData.specialtyId) {
      this.scheduleService.addSchedule({
        doctorId: docId,
        specialtyId: this.modalData.specialtyId,
        dayOfWeek: this.modalData.dayOfWeek,
        startTime: this.modalData.startTime,
        endTime: this.modalData.endTime
      });
      this.closeModal();
    }
  }

  closeModal() {
    this.isModalOpen = false;
  }

  remove(schedule: Schedule) {
    this.scheduleService.removeSchedule(schedule);
  }

  private addMinutes(time: string, minutes: number): string {
    const [h, m] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m + minutes);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }
}

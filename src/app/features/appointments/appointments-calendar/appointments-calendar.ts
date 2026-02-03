import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppointmentsService, Appointment } from '../../../core/services/appointments';
import { DoctorsService } from '../../../core/services/doctors';
import { SpecialtiesService } from '../../../core/services/specialties';
import { SchedulesService } from '../../../core/services/schedules';
import { PatientsService } from '../../../core/services/patients';
import { LucideAngularModule, ChevronLeft, ChevronRight, Calendar, User, Clock, Plus } from 'lucide-angular';

@Component({
  selector: 'app-appointments-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './appointments-calendar.html',
  styleUrl: './appointments-calendar.css'
})
export class AppointmentsCalendarComponent {
  private appointmentsService = inject(AppointmentsService);
  private doctorService = inject(DoctorsService);
  private specialtyService = inject(SpecialtiesService);
  private scheduleService = inject(SchedulesService);
  private patientsService = inject(PatientsService);

  readonly icons = { ChevronLeft, ChevronRight, Calendar, User, Clock, Plus };

  // Data Sources
  doctors = this.doctorService.doctors;
  specialties = this.specialtyService.specialties;
  patients = this.patientsService.patients;
  appointments = this.appointmentsService.appointments;

  // Filters
  selectedDoctorId = signal<string>('');
  selectedSpecialtyId = signal<string>('');

  // Calendar State
  currentDate = signal<Date>(new Date());

  // Modal State
  isModalOpen = false;
  selectedSlot: { date: string, time: string } | null = null;
  newApp = { patientId: '', notes: '', paymentMethod: 'CASH', transactionId: '' };

  weekDays = computed(() => {
    const start = this.getStartOfWeek(this.currentDate());
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push({
        date: d,
        iso: d.toISOString().split('T')[0],
        dayName: d.toLocaleDateString('es-ES', { weekday: 'short' }),
        dayNum: d.getDate()
      });
    }
    return days;
  });

  // Time Slots (08:00 to 20:00)
  timeSlots = Array.from({ length: 13 }, (_, i) => {
    const hour = i + 8;
    return `${hour.toString().padStart(2, '0')}:00`;
  });

  getStartOfWeek(date: Date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
  }

  changeWeek(offset: number) {
    const newDate = new Date(this.currentDate());
    newDate.setDate(newDate.getDate() + (offset * 7));
    this.currentDate.set(newDate);
  }

  // Helper to check availability
  getSlotStatus(dateIso: string, time: string, dayIndex: number): 'unavailable' | 'available' | 'booked' {
    if (!this.selectedDoctorId() || !this.selectedSpecialtyId()) return 'unavailable';

    // 1. Check Schedule (Work Hours)
    // JS getDay(): 0=Sun, 1=Mon. Our Schedule: 1=Mon...0=Sun
    let dayOfWeek = new Date(dateIso).getDay(); // 0-6 (Sun-Sat)

    const schedules = this.scheduleService.getSchedulesForDoctor(this.selectedDoctorId(), this.selectedSpecialtyId());
    const workingHour = schedules.find(s => s.dayOfWeek === dayOfWeek && time >= s.startTime && time < s.endTime);

    if (!workingHour) return 'unavailable';

    // 2. Check Existing Appointments
    const existing = this.appointments().find(a =>
      a.doctorId === this.selectedDoctorId() &&
      a.date === dateIso &&
      a.startTime === time &&
      a.status !== 'CANCELLED'
    );

    return existing ? 'booked' : 'available';
  }

  getAppointment(dateIso: string, time: string) {
    return this.appointments().find(a =>
      a.doctorId === this.selectedDoctorId() &&
      a.date === dateIso &&
      a.startTime === time &&
      a.status !== 'CANCELLED'
    );
  }

  openBookingModal(dateIso: string, time: string) {
    this.selectedSlot = { date: dateIso, time };
    this.newApp = { patientId: '', notes: '', paymentMethod: 'CASH', transactionId: '' };
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  saveAppointment() {
    if (this.selectedSlot && this.newApp.patientId) {
      const patient = this.patients().find(p => p.id === this.newApp.patientId);
      this.appointmentsService.addAppointment({
        doctorId: this.selectedDoctorId(),
        specialtyId: this.selectedSpecialtyId(),
        patientId: this.newApp.patientId,
        patientName: patient?.fullName || 'Desconocido',
        date: this.selectedSlot.date,
        startTime: this.selectedSlot.time,
        endTime: this.addMinutes(this.selectedSlot.time, 30), // Default 30 min
        notes: this.newApp.notes,
        paymentMethod: this.newApp.paymentMethod as any,
        paymentStatus: this.newApp.paymentMethod === 'CASH' ? 'PENDING' : 'PAID', // Auto-assume PAID for wallets for now
        transactionId: this.newApp.transactionId
      });
      this.closeModal();
    }
  }

  addMinutes(time: string, mins: number) {
    const [h, m] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m + mins);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }
}

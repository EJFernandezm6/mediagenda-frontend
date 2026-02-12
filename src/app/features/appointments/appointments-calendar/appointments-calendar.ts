import { Component, inject, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppointmentsService, Appointment } from '../../../core/services/appointments';
import { DoctorsService } from '../../../core/services/doctors';
import { SpecialtiesService } from '../../../core/services/specialties';
import { SchedulesService } from '../../../core/services/schedules';
import { PatientsService } from '../../../core/services/patients';
import { ConfigurationService } from '../../../core/services/configuration';
import { DoctorSpecialtyService } from '../../doctors/doctor-specialty/doctor-specialty.service';
import { LucideAngularModule, ChevronLeft, ChevronRight, Calendar, User, Clock, Plus, Search, AlertCircle, CheckCircle, HelpCircle } from 'lucide-angular';

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
  private doctorSpecialtyService = inject(DoctorSpecialtyService);
  private configService = inject(ConfigurationService);

  readonly icons = { ChevronLeft, ChevronRight, Calendar, User, Clock, Plus, Search, AlertCircle, CheckCircle, HelpCircle };

  config = this.configService.settings;

  // Helpers for Template
  isWorkingDay(weekDayIndex: number): boolean {
    // weekDayIndex is 0..6 (Monday..Sunday) because weekDays() generates Mon start.
    // settings.workingDays uses 1=Mon...6=Sat, 0=Sun.
    // Map weekDayIndex to JS Day (0=Sun, 1=Mon).
    // 0 (Mon) -> 1
    // 5 (Sat) -> 6
    // 6 (Sun) -> 0
    const jsDay = (weekDayIndex + 1) % 7;
    return this.config().workingDays.includes(jsDay);
  }

  isBreakTime(time: string): boolean {
    const start = this.config().breakStartTime; // e.g. "13:00"
    const end = this.config().breakEndTime; // e.g. "14:00"
    if (!start || !end) return false;
    // Assuming time slots align perfectly or simply Check if time >= start && time < end
    return time >= start && time < end;
  }

  // View State
  viewMode = signal<'day' | 'week'>('week'); // Default to week per requirements? Or Day? User didn't specify default, but asked for "version semanal Y version diaria".

  // Data Sources
  doctors = this.doctorService.doctors;
  specialties = this.specialtyService.specialties;
  patients = this.patientsService.patients;
  appointments = this.appointmentsService.appointments;

  // Filters
  selectedDoctorId = signal<string>('');
  selectedSpecialtyId = signal<string>('');

  constructor() {
    // Auto-select first specialty when available to ensure data visibility
    effect(() => {
      const specs = this.specialties();
      if (specs.length > 0 && !this.selectedSpecialtyId()) {
        this.selectedSpecialtyId.set(specs[0].specialtyId);
      }
    }, { allowSignalWrites: true });
  }

  // Calendar State
  currentDate = signal<Date>(new Date());
  currentDateStr = computed(() => {
    return this.currentDate().toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  });

  // Modal State
  isModalOpen = false;
  selectedSlot: { date: string, time: string } | null = null;

  // Reactive Modal State
  modalPatientId = signal('');
  modalSpecialtyId = signal('');
  modalDoctorId = signal('');
  modalDate = signal(new Date().toISOString().split('T')[0]);
  modalTime = signal('');
  modalNotes = signal('');
  modalPaymentMethod = signal('CASH');
  modalTransactionId = signal('');

  // Details Modal State
  isDetailsModalOpen = false;
  selectedAppointment: Appointment | null = null;
  isRescheduling = false;
  isConfirmingCancel = false;

  doctorsInCurrentSpecialty = computed(() => {
    const specialtyId = this.isRescheduling ? this.modalSpecialtyId() : this.selectedSpecialtyId();
    if (!specialtyId) return this.doctors();

    const associations = this.doctorSpecialtyService.associations();
    const doctorIds = associations
      .filter(a => a.specialtyId === specialtyId)
      .map(a => a.doctorId);

    return this.doctors().filter(d => doctorIds.includes(d.id));
  });

  // Appointments for All Doctors (Today) - Used for Daily View logic mostly
  globalAppointments = computed(() => {
    const today = this.currentDate().toISOString().split('T')[0];
    return this.appointments().filter(a => a.appointmentDate === today && a.status !== 'CANCELLED');
  });

  // Dynamic values for Modal
  filteredDoctorsForModal = computed(() => {
    const specialtyId = this.modalSpecialtyId();
    if (!specialtyId) return [];
    const associations = this.doctorSpecialtyService.associations();
    const doctorIds = associations
      .filter(a => a.specialtyId === specialtyId)
      .map(a => a.doctorId);
    return this.doctors().filter(d => doctorIds.includes(d.id));
  });

  availableSlotsForModal = computed(() => {
    const doctorId = this.modalDoctorId();
    const specialtyId = this.modalSpecialtyId();
    const date = this.modalDate();

    if (!doctorId || !specialtyId || !date) return [];

    const schedules = this.scheduleService.getSchedulesForDoctor(doctorId, specialtyId);

    // Safer Day Calculation
    const [y, m, d] = date.split('-').map(Number);
    return this.timeSlots.filter(time => {
      const isWorking = schedules.some(s => {
        return s.date === date && time >= s.startTime && time < s.endTime;
      });
      if (!isWorking) return false;

      const isBooked = this.appointments().some(a =>
        a.doctorId === doctorId &&
        a.appointmentDate === date &&
        a.startTime === time &&
        a.status !== 'CANCELLED'
      );
      return !isBooked;
    });
  });

  weekDays = computed(() => {
    const start = this.getStartOfWeek(this.currentDate());
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const iso = [
        d.getFullYear(),
        (d.getMonth() + 1).toString().padStart(2, '0'),
        d.getDate().toString().padStart(2, '0')
      ].join('-');

      days.push({
        date: d,
        iso: iso,
        dayName: d.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', ''), // Remove dot if present
        dayNum: d.getDate(),
        monthName: d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '')
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
    if (this.viewMode() === 'week') {
      newDate.setDate(newDate.getDate() + (offset * 7));
    } else {
      newDate.setDate(newDate.getDate() + offset);
    }
    this.currentDate.set(newDate);
  }

  toggleView(mode: 'day' | 'week') {
    this.viewMode.set(mode);
  }

  // Helper to check availability for Week View
  getSlotStatus(dateIso: string, time: string, dayOfWeekIndex: number): any[] {
    if (!this.selectedSpecialtyId()) return [];
    // dayOfWeekIndex from 0 (Monday in my loop) to 6 (Sunday)
    // Actually weekDays() logic: 0=Mon, 6=Sun.
    // My weekDays loop: d.getDay() is correct?
    // Wait, weekDays array is generated. data.dayNum.
    // Let's rely on dateIso to get the day of matching schedules.

    // Check availability for ANY doctor in the specialty if none selected, OR specific doctor
    const doctorsToCheck = this.selectedDoctorId() ? [this.selectedDoctorId()] : this.doctorsInCurrentSpecialty().map(d => d.id);

    const items: any[] = [];

    for (const docId of doctorsToCheck) {
      const docName = this.getDoctorName(docId);

      // 1. Check Appointment
      const matchingApp = this.appointments().find(a =>
        a.doctorId === docId &&
        a.specialtyId === this.selectedSpecialtyId() &&
        a.specialtyId === this.selectedSpecialtyId() &&
        a.appointmentDate === dateIso &&
        a.startTime === time &&
        a.status !== 'CANCELLED'
      );

      if (matchingApp) {
        items.push({ type: 'booked', appointment: matchingApp });
        continue;
      }

      // 2. Check Schedule (if no appointment)
      const schedules = this.scheduleService.getSchedulesForDoctor(docId, this.selectedSpecialtyId());
      // Calculate dayOfWeek from dateIso for recurring check
      const d = new Date(dateIso + 'T00:00:00'); // Local midnight approx
      // Careful with timezone again.
      // Using the passed dayOfWeekIndex might be safer if it aligns with the column index 0..6
      // weekDays()[0] is Monday? index 0.
      // weekDays() generation: "1=Mon to 6=Sat, 0=Sun".
      // dayOfWeekIndex 0 (Mon) -> 1.

      // Let's use the date from ISO string to be sure
      // We need to match the 'dayOfWeek' format in Mock Data (1=Mon, ..., 0=Sun?)
      // My previous fix used strict local date matching for Schedules.

      // Re-implement IsWorking Logic logic per doctor
      const isWorking = schedules.some(s => {
        return s.date === dateIso && time >= s.startTime && time < s.endTime;
      });

      if (isWorking) {
        items.push({ type: 'available', doctorId: docId, doctorName: docName, date: dateIso, time: time, specialtyId: this.selectedSpecialtyId() });
      }
    }

    return items;
  }

  // Renamed to getAppointmentsForSlot to reflect it returns an array now
  getAppointmentsForSlot(dateIso: string, time: string): Appointment[] {
    const res = this.getSlotStatus(dateIso, time, 0); // dayIndex irrelevant for this logic now
    return res.filter((item: any) => item.type === 'booked').map((item: any) => item.appointment);
  }

  openBookingModal(dateIso: string, time: string) {
    this.selectedSlot = { date: dateIso, time };
    this.modalPatientId.set('');
    this.modalSpecialtyId.set(this.selectedSpecialtyId() || '');
    this.modalDoctorId.set(this.selectedDoctorId() || '');
    this.modalDate.set(dateIso);
    this.modalTime.set(time);
    this.modalNotes.set('');
    this.modalPaymentMethod.set('CASH');
    this.modalTransactionId.set('');
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  saveAppointment() {
    const doctorId = this.modalDoctorId();
    const specialtyId = this.modalSpecialtyId();
    const date = this.modalDate();
    const time = this.modalTime();
    const patientId = this.modalPatientId();

    if (doctorId && specialtyId && date && time && patientId) {
      const patient = this.patients().find(p => p.patientId === patientId);
      this.appointmentsService.addAppointment({
        doctorId,
        specialtyId,
        patientId,
        patientName: patient?.fullName || 'Desconocido',
        appointmentDate: date,
        startTime: time,
        endTime: this.addMinutes(time, 30),
        notes: this.modalNotes(),
        paymentMethod: this.modalPaymentMethod() as any,
        paymentStatus: this.modalPaymentMethod() === 'CASH' ? 'PENDING' : 'PAID',
        transactionId: this.modalTransactionId()
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

  getDoctorName(id: string) {
    return this.doctors().find(d => d.id === id)?.fullName || 'Desconocido';
  }

  getSpecialtyName(id: string) {
    return this.specialties().find(s => s.specialtyId === id)?.name || 'Desconocido';
  }

  getAppointmentColorClass(app: Appointment): string {
    // Green: Confirmado / Pagado
    if (app.paymentStatus === 'PAID') {
      return 'bg-green-100 border-green-600 text-green-800';
    }
    // Yellow: Pendiente (Default for any booking not paid)
    return 'bg-yellow-100 border-yellow-500 text-yellow-800';
  }

  openGenericBooking() {
    // Find first available slot today or in the week
    const today = new Date().toISOString().split('T')[0];
    const firstAvailable = this.timeSlots.find(slot =>
      this.getSlotStatus(today, slot, 0).some((item: any) => item.type === 'available')
    );

    if (firstAvailable) {
      this.openBookingModal(today, firstAvailable);
    } else {
      // Just open with today and first slot if none found
      this.openBookingModal(today, this.timeSlots[0]);
    }
  }

  openAppointmentDetails(appointment: Appointment) {
    this.selectedAppointment = appointment;
    this.isDetailsModalOpen = true;
    this.isRescheduling = false;
  }

  closeDetailsModal() {
    this.isDetailsModalOpen = false;
    this.selectedAppointment = null;
    this.isRescheduling = false;
    this.isConfirmingCancel = false;
  }

  startRescheduling() {
    if (this.selectedAppointment) {
      this.isRescheduling = true;
      this.isConfirmingCancel = false;
      this.modalSpecialtyId.set(this.selectedAppointment.specialtyId);
      this.modalDoctorId.set(this.selectedAppointment.doctorId);
      this.modalDate.set(this.selectedAppointment.appointmentDate);
      this.modalTime.set(this.selectedAppointment.startTime);
      this.modalPatientId.set(this.selectedAppointment.patientId);
      this.modalNotes.set(this.selectedAppointment.notes || '');
      this.modalPaymentMethod.set(this.selectedAppointment.paymentMethod || 'CASH');
      this.modalTransactionId.set(this.selectedAppointment.transactionId || '');
    }
  }

  showCancelConfirmation() {
    this.isConfirmingCancel = true;
    this.isRescheduling = false;
  }

  cancelCancelConfirmation() {
    this.isConfirmingCancel = false;
  }

  confirmCancel() {
    if (this.selectedAppointment) {
      this.appointmentsService.updatestatus(this.selectedAppointment.appointmentId!, 'CANCELLED');
      this.closeDetailsModal();
      this.isConfirmingCancel = false;
    }
  }

  saveRescheduledAppointment() {
    if (this.selectedAppointment && this.modalTime() && this.modalDate()) {
      // Update the existing appointment
      const updatedAppointment: Appointment = {
        ...this.selectedAppointment,
        appointmentDate: this.modalDate(),
        startTime: this.modalTime(),
        endTime: this.addMinutes(this.modalTime(), 30),
        notes: this.modalNotes(),
        paymentMethod: this.modalPaymentMethod() as any,
        transactionId: this.modalTransactionId()
      };

      // Update in service (you'll need to add this method to the service)
      const appointments = this.appointments();
      const index = appointments.findIndex(a => a.appointmentId === this.selectedAppointment!.appointmentId);
      if (index !== -1) {
        appointments[index] = updatedAppointment;
        this.appointmentsService.appointments.set([...appointments]);
      }

      this.closeDetailsModal();
    }
  }

  cancelAppointment() {
    if (this.selectedAppointment) {
      this.appointmentsService.updatestatus(this.selectedAppointment.appointmentId!, 'CANCELLED');
      this.closeDetailsModal();
    }
  }

  getAppointmentStatusLabel(app: Appointment): string {
    if (app.paymentStatus === 'PAID') {
      return 'Pagada';
    }
    if (app.status === 'CONFIRMED' && app.paymentStatus === 'PENDING') {
      return 'Reservada'; // Yellow
    }
    // Fallback logic
    return 'Reservada';
  }
}

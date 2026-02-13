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
  protected appointmentsService = inject(AppointmentsService);
  protected doctorService = inject(DoctorsService);
  protected specialtyService = inject(SpecialtiesService);
  protected scheduleService = inject(SchedulesService);
  protected patientsService = inject(PatientsService);
  protected doctorSpecialtyService = inject(DoctorSpecialtyService);
  protected configService = inject(ConfigurationService);

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
    this.scheduleService.refreshSchedules();

    effect(() => {
      const current = this.currentDate();
      const mode = this.viewMode();
      let from: string, to: string;

      if (mode === 'week') {
        const start = this.getStartOfWeek(current);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        from = start.toISOString().split('T')[0];
        to = end.toISOString().split('T')[0];
      } else {
        from = to = current.toISOString().split('T')[0];
      }

      this.appointmentsService.refreshAppointmentsByRange(from, to);
    });
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
  saving = signal(false);
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

    return this.doctors().filter(d => d.doctorId != null && doctorIds.includes(d.doctorId));
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
    return this.doctors().filter(d => d.doctorId != null && doctorIds.includes(d.doctorId));
  });

  availableSlotsForModal = computed(() => {
    const doctorId = this.modalDoctorId();
    const specialtyId = this.modalSpecialtyId();
    const date = this.modalDate();

    if (!doctorId || !specialtyId || !date) return [];

    // 1. Obtener duración de la asociación médico-especialidad
    const duration = this.getDuration(doctorId, specialtyId);

    // 2. Obtener horarios del médico para esa especialidad en esa fecha
    const normalize = (t: string) => t.length > 5 ? t.substring(0, 5) : t;
    const schedules = this.scheduleService.getSchedulesForDoctor(doctorId, specialtyId)
      .filter(s => s.date === date);

    if (schedules.length === 0) return [];

    // 3. Generar slots desde cada bloque de horario
    const slots: string[] = [];
    for (const s of schedules) {
      const start = this.getMinutes(normalize(s.startTime));
      const end = this.getMinutes(normalize(s.endTime));
      let current = start;
      while (current + duration <= end) {
        slots.push(this.formatMinutes(current));
        current += duration;
      }
    }

    // 4. Filtrar slots ya ocupados
    return slots.filter(time => {
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

  // Helper to convert "HH:mm" to minutes since midnight
  private getMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  // Helper to convert minutes to "HH:mm"
  private formatMinutes(mins: number): string {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  // Dynamic Time Slots
  timeSlots = computed(() => {
    // 1. Determine Duration
    let duration = 30; // Default
    const docId = this.selectedDoctorId();
    const specId = this.selectedSpecialtyId();

    if (docId && specId) {
      const assoc = this.doctorSpecialtyService.associations()
        .find(a => a.doctorId === docId && a.specialtyId === specId);
      if (assoc && assoc.durationMinutes > 0) {
        duration = assoc.durationMinutes;
      }
    }

    // 2. Determine Range (Start/End) based on Schedules
    // If no doctor selected, default 08:00 - 20:00
    // If doctor selected, find their earliest start and latest end in the current view?
    // User requirement: "If turn ends at 5, last visible should be 4:30"

    let minStart = 8 * 60; // 08:00
    let maxEnd = 20 * 60;  // 20:00

    // Optimality: If we want to be strict, we scan schedules. 
    // For now, let's keep a reasonable default range but expanded if schedules exist outside.
    if (docId) {
      // Get all schedules for this doctor (optionally filtered by specialty if selected?)
      // We want to show ALL slots where they might work 
      let schedules = this.scheduleService.schedules().filter(s => s.doctorId === docId);

      if (specId) {
        schedules = schedules.filter(s => s.specialtyId === specId);
      }

      if (schedules.length > 0) {
        // Find min start and max end
        const starts = schedules.map(s => this.getMinutes(s.startTime));
        const ends = schedules.map(s => this.getMinutes(s.endTime));

        const earliest = Math.min(...starts);
        const latest = Math.max(...ends);

        // Use these bounds, maybe with a little buffer or strictly?
        // User example implies strictness relative to shifts.
        // Let's use the found bounds.
        minStart = earliest;
        maxEnd = latest;
      }
    }

    // 3. Generate Slots
    const slots: string[] = [];
    let current = minStart;

    // We generate slots such that (current + duration) <= maxEnd
    while (current + duration <= maxEnd) {
      slots.push(this.formatMinutes(current));
      current += duration;
    }

    return slots;
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

  // ...

  isPastDate(dateStr: string): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(dateStr + 'T00:00:00');
    return date < today;
  }

  isPastTime(dateStr: string, timeStr: string): boolean {
    if (this.isPastDate(dateStr)) return true;

    // If today, check time
    const todayStr = new Date().toISOString().split('T')[0];
    if (dateStr === todayStr) {
      const now = new Date();
      const [h, m] = timeStr.split(':').map(Number);
      const slotTime = new Date();
      slotTime.setHours(h, m, 0, 0);
      return slotTime < now;
    }

    return false;
  }

  // Helper to check availability for Week View
  getSlotStatus(dateIso: string, time: string, dayOfWeekIndex: number): any[] {
    const items: any[] = [];
    const isPast = this.isPastTime(dateIso, time);

    // doctors to check (Use doctorId as that is what schedules use)
    const doctorsToCheck = this.selectedDoctorId()
      ? [this.selectedDoctorId()]
      : this.doctorsInCurrentSpecialty().map(d => d.doctorId || d.id);

    for (const docId of doctorsToCheck) {
      const docName = this.getDoctorName(docId);

      // Check Appointments
      const matchingApp = this.appointments().find(a =>
        a.doctorId === docId &&
        a.appointmentDate === dateIso &&
        a.startTime === time &&
        a.status !== 'CANCELLED'
      );

      if (matchingApp) {
        items.push({ type: 'booked', appointment: matchingApp });
        continue;
      }

      // Check Schedule availability
      let isWorking = false;
      let workingSpecialtyId = '';

      // Helper to normalize time to HH:mm for comparison (backend might send HH:mm:ss)
      const normalize = (t: string) => t.length > 5 ? t.substring(0, 5) : t;

      if (this.selectedSpecialtyId()) {
        const schedules = this.scheduleService.getSchedulesForDoctor(docId, this.selectedSpecialtyId());

        isWorking = schedules.some(s =>
          s.date === dateIso &&
          time >= normalize(s.startTime) &&
          time < normalize(s.endTime)
        );
        workingSpecialtyId = this.selectedSpecialtyId();
      } else {
        // View All: Check any specialty
        const allSchedules = this.scheduleService.schedules().filter(s => s.doctorId === docId);

        const validSchedule = allSchedules.find(s =>
          s.date === dateIso &&
          time >= normalize(s.startTime) &&
          time < normalize(s.endTime)
        );

        if (validSchedule) {
          isWorking = true;
          workingSpecialtyId = validSchedule.specialtyId;
        }
      }

      if (isWorking) {
        items.push({
          type: 'available',
          doctorId: docId,
          doctorName: docName,
          date: dateIso,
          time: time,
          specialtyId: workingSpecialtyId,
          isPast: isPast
        });
      }
    }

    return items;
  }

  // Renamed to getAppointmentsForSlot to reflect it returns an array now
  getAppointmentsForSlot(dateIso: string, time: string): Appointment[] {
    const res = this.getSlotStatus(dateIso, time, 0); // dayIndex irrelevant for this logic now
    return res.filter((item: any) => item.type === 'booked').map((item: any) => item.appointment);
  }

  openBookingModal(dateIso: string, time: string, doctorId?: string, specialtyId?: string) {
    this.selectedSlot = { date: dateIso, time };
    this.modalPatientId.set('');
    this.modalSpecialtyId.set(specialtyId || this.selectedSpecialtyId() || '');
    this.modalDoctorId.set(doctorId || this.selectedDoctorId() || '');
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

  getDuration(doctorId: string, specialtyId: string): number {
    const assoc = this.doctorSpecialtyService.associations()
      .find(a => a.doctorId === doctorId && a.specialtyId === specialtyId);
    return assoc && assoc.durationMinutes > 0 ? assoc.durationMinutes : 30; // Default 30
  }

  saveAppointment() {
    const doctorId = this.modalDoctorId();
    const specialtyId = this.modalSpecialtyId();
    const date = this.modalDate();
    const time = this.modalTime();
    const patientId = this.modalPatientId();

    if (doctorId && specialtyId && date && time && patientId) {
      const patient = this.patients().find(p => p.patientId === patientId);
      const duration = this.getDuration(doctorId, specialtyId);

      this.saving.set(true);
      this.appointmentsService.addAppointment({
        doctorId,
        specialtyId,
        patientId,
        patientName: patient?.fullName || 'Desconocido',
        appointmentDate: date,
        startTime: time,
        endTime: this.addMinutes(time, duration),
        notes: this.modalNotes(),
        paymentMethod: this.modalPaymentMethod() as any,
        paymentStatus: this.modalPaymentMethod() === 'CASH' ? 'PENDING' : 'PAID',
        transactionId: this.modalTransactionId()
      }).subscribe({
        next: () => {
          this.saving.set(false);
          this.closeModal();
        },
        error: () => this.saving.set(false)
      });
    }
  }

  addMinutes(time: string, mins: number) {
    const [h, m] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m + mins);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }

  getDoctorName(id: string) {
    return this.doctors().find(d => d.id === id || d.doctorId === id)?.fullName || 'Desconocido';
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
    const slots = this.timeSlots();
    const firstAvailable = slots.find(slot =>
      this.getSlotStatus(today, slot, 0).some((item: any) => item.type === 'available')
    );

    if (firstAvailable) {
      this.openBookingModal(today, firstAvailable);
    } else {
      // Just open with today and first slot if none found
      this.openBookingModal(today, slots[0] || '09:00');
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
      const doctorId = this.modalDoctorId() || this.selectedAppointment.doctorId;
      const specialtyId = this.modalSpecialtyId() || this.selectedAppointment.specialtyId;
      const duration = this.getDuration(doctorId, specialtyId);

      // Update the existing appointment
      const updatedAppointment: Appointment = {
        ...this.selectedAppointment,
        doctorId, // Ensure these are updated if changed (though UI restricts changing specialty/doctor in some flows, best to be safe)
        specialtyId,
        appointmentDate: this.modalDate(),
        startTime: this.modalTime(),
        endTime: this.addMinutes(this.modalTime(), duration),
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

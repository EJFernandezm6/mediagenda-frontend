import { Component, inject, computed, signal, effect } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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
  private route = inject(ActivatedRoute);

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
    // Disabled per user request (was showing 13:00-14:00 blocked)
    return false;
    /*
    const start = this.config().breakStartTime; // e.g. "13:00"
    const end = this.config().breakEndTime; // e.g. "14:00"
    if (!start || !end) return false;
    // Assuming time slots align perfectly or simply Check if time >= start && time < end
    return time >= start && time < end;
    */
  }

  // View State
  viewMode = signal<'day' | 'week'>('week'); // Default to week per requirements? Or Day? User didn't specify default, but asked for "version semanal Y version diaria".

  // Data Sources
  doctors = computed(() => this.doctorService.doctors().filter(d => d.active));
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

    // Handle Deep Linking (Notifications)
    this.route.queryParams.subscribe(params => {
      const appId = params['appointmentId'];
      if (appId) {
        this.appointmentsService.getAppointmentById(appId).subscribe({
          next: (app) => {
            if (app) {
              // 1. Move calendar to date
              const date = new Date(app.appointmentDate + 'T00:00:00');
              this.currentDate.set(date);

              // 2. Open Modal
              this.openAppointmentDetails(app);
            }
          }
        });
      }
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
  modalPaymentProof = signal('');

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

  // Dynamic values for Modal & View
  filteredDoctors = computed(() => {
    // If a specialty is selected, filter doctors by that specialty
    const specialtyId = this.selectedSpecialtyId();
    if (!specialtyId) return this.doctors();

    const associations = this.doctorSpecialtyService.associations();
    const doctorIds = associations
      .filter(a => a.specialtyId === specialtyId)
      .map(a => a.doctorId);

    return this.doctors().filter(d => d.doctorId != null && doctorIds.includes(d.doctorId));
  });

  filteredDoctorsForModal = computed(() => {
    // This logic is now redundant if we use filteredDoctors, but let's keep it specific for modal
    // if modal has its own specialty selection which might differ from view
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
    const schedules = this.scheduleService.getSchedulesForDoctor(doctorId, specialtyId)
      .filter(s => s.date === date);

    if (schedules.length === 0) return [];

    // 3. Generar slots desde cada bloque de horario
    const slots: string[] = [];
    for (const s of schedules) {
      const start = this.getMinutes(this.normalizeTime(s.startTime));
      const end = this.getMinutes(this.normalizeTime(s.endTime));
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
        this.normalizeTime(a.startTime) === time &&
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

  // Safely normalize any time format "HH:mm:ss" or "H:mm" to "HH:mm"
  private normalizeTime(time: string): string {
    if (!time) return '';
    const parts = time.split(':');
    if (parts.length >= 2) {
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    }
    return time;
  }

  // Dynamic Time Slots
  timeSlots = computed(() => {
    const docId = this.selectedDoctorId();
    const specId = this.selectedSpecialtyId();
    const mode = this.viewMode();
    const currentDate = this.currentDate();

    // Collect distinct time slots in a Set to ensure exact match and sorting
    const timeSet = new Set<string>();

    let doctorsToCheck = docId ? [docId] : this.doctorsInCurrentSpecialty().map(d => d.doctorId || d.id);
    let schedules = this.scheduleService.schedules();
    let appointments = this.appointments();

    // 1. Loop through all relevant schedules to build exact slots based on start time & duration
    for (const dId of doctorsToCheck) {
      let docSchedules = schedules.filter(s => s.doctorId === dId);
      if (specId) docSchedules = docSchedules.filter(s => s.specialtyId === specId);

      // Filter schedules to current view dates
      if (mode === 'day') {
        const todayStr = currentDate.toISOString().split('T')[0];
        docSchedules = docSchedules.filter(s => s.date === todayStr);
      } else {
        const startOfWeekStr = this.getStartOfWeek(currentDate).toISOString().split('T')[0];
        // Simplified check, could check bounds.
        docSchedules = docSchedules.filter(s => s.date >= startOfWeekStr);
      }

      for (const s of docSchedules) {
        const duration = this.getDuration(dId, s.specialtyId);
        const startMins = this.getMinutes(this.normalizeTime(s.startTime));
        const endMins = this.getMinutes(this.normalizeTime(s.endTime));

        let current = startMins;
        while (current < endMins) {
          timeSet.add(this.formatMinutes(current));
          current += duration;
        }
      }
    }

    // 2. Also ensure any existing appointments in view have their start time listed
    for (const a of appointments) {
      if (docId && a.doctorId !== docId) continue;
      if (specId && a.specialtyId !== specId) continue;
      if (a.status === 'CANCELLED') continue;

      // In day view, date must match
      if (mode === 'day' && a.appointmentDate !== currentDate.toISOString().split('T')[0]) continue;

      timeSet.add(this.normalizeTime(a.startTime));
    }

    // 3. Convert to array and sort chronologically
    let sortedSlots = Array.from(timeSet).sort((a, b) => this.getMinutes(a) - this.getMinutes(b));

    // Fallback if empty (e.g. no schedules or appointments found) to keep grid alive
    if (sortedSlots.length === 0) {
      let current = 8 * 60; // 08:00
      let maxEnd = 20 * 60; // 20:00
      while (current < maxEnd) {
        sortedSlots.push(this.formatMinutes(current));
        current += 30; // 30 min default
      }
    }

    return sortedSlots;
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

    // Restriction: Cannot go before current week/day
    const today = new Date();
    const startOfCurrentWeek = this.getStartOfWeek(today);
    // Reset time for comparison
    startOfCurrentWeek.setHours(0, 0, 0, 0);

    // We check if the new view's start date is before the current week's start
    // If viewMode is week, newDate is just a date within that week, so getStartOfWeek(newDate) should be >= startOfCurrentWeek
    // If viewMode is day, newDate should be today or future (or at least within current week? User said "semana actual y posteriores")

    const startOfNewView = this.viewMode() === 'week' ? this.getStartOfWeek(newDate) : newDate;
    startOfNewView.setHours(0, 0, 0, 0);

    if (startOfNewView < startOfCurrentWeek) {
      return; // Prevent navigation
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

    const timeMins = this.getMinutes(time);

    for (const docId of doctorsToCheck) {
      const docName = this.getDoctorName(docId);

      // Check Appointments
      const matchingApp = this.appointments().find(a =>
        a.doctorId === docId &&
        a.appointmentDate === dateIso &&
        this.normalizeTime(a.startTime) === time &&
        a.status !== 'CANCELLED'
      );

      if (matchingApp) {
        items.push({ type: 'booked', appointment: matchingApp });
        continue;
      }

      // If it's a past time/date, do NOT show available slots
      if (isPast) continue;

      // Check Schedule availability
      let isWorking = false;
      let workingSpecialtyId = '';

      // Helper logic
      const checkSchedule = (schedulesList: any[]) => {
        for (const s of schedulesList) {
          if (s.date === dateIso) {
            const startStr = this.normalizeTime(s.startTime);
            const endStr = this.normalizeTime(s.endTime);
            const startMins = this.getMinutes(startStr);
            const endMins = this.getMinutes(endStr);

            // Must be within range
            if (timeMins >= startMins && timeMins < endMins) {
              // Must align with duration blocks
              const duration = this.getDuration(docId, s.specialtyId);
              if ((timeMins - startMins) % duration === 0) {
                isWorking = true;
                workingSpecialtyId = s.specialtyId;
                return;
              }
            }
          }
        }
      };

      if (this.selectedSpecialtyId()) {
        const schedules = this.scheduleService.getSchedulesForDoctor(docId, this.selectedSpecialtyId());
        checkSchedule(schedules);
      } else {
        // View All: Check any specialty
        const allSchedules = this.scheduleService.schedules().filter(s => s.doctorId === docId);
        checkSchedule(allSchedules);
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

    // Snap time to valid slot if needed
    let alignedTime = time;
    if (doctorId && specialtyId) {
      const duration = this.getDuration(doctorId, specialtyId);
      // Find schedule to get start time
      const normalize = (t: string) => t.length > 5 ? t.substring(0, 5) : t;
      const schedule = this.scheduleService.getSchedulesForDoctor(doctorId, specialtyId)
        .find(s => s.date === dateIso);

      if (schedule) {
        const startMins = this.getMinutes(normalize(schedule.startTime));
        const clickMins = this.getMinutes(time);

        // Calculate aligned slot: start + floor((click - start) / duration) * duration
        const diff = clickMins - startMins;
        if (diff >= 0) {
          const slotIndex = Math.floor(diff / duration);
          const alignedMins = startMins + (slotIndex * duration);
          alignedTime = this.formatMinutes(alignedMins);
        }
      }
    }

    this.modalTime.set(alignedTime);
    this.modalNotes.set('');
    this.modalPaymentMethod.set('CASH');
    this.modalTransactionId.set('');
    this.modalPaymentProof.set('');
    this.isModalOpen = true;
  }

  // Check if form has data
  isBookingDirty(): boolean {
    return !!(this.modalDoctorId() || this.modalSpecialtyId() || this.modalPatientId() || this.modalTime());
  }

  tryCloseBookingModal() {
    if (this.isBookingDirty()) {
      if (confirm('¿Estás seguro de que deseas cerrar? Se perderán los datos ingresados.')) {
        this.closeModal();
      }
    } else {
      this.closeModal();
    }
  }

  tryCloseDetailsModal() {
    if (this.isRescheduling) {
      if (confirm('Estás reprogramando una cita. ¿Seguro que deseas cerrar sin guardar?')) {
        this.closeDetailsModal();
      }
    } else {
      this.closeDetailsModal();
    }
  }

  closeModal() {
    this.isModalOpen = false;
    // Reset state? maybe cleaner to do it on open
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    // Parse ISO YYYY-MM-DD
    // Note: Creating date from string in local time might be tricky if not careful with T00:00
    // But since we deal with YYYY-MM-DD visual strings, we can just split and format.
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d); // Local

    // "Día número de día mes y año" e.g. "Lunes 13 Febrero 2026"
    // Using simple Intl
    const dayName = date.toLocaleDateString('es-ES', { weekday: 'long' });
    const dayNum = date.getDate();
    const month = date.toLocaleDateString('es-ES', { month: 'long' });
    const year = date.getFullYear();

    return `${dayName} ${dayNum} ${month} ${year}`;
  }

  getDuration(doctorId: string, specialtyId: string): number {
    const assoc = this.doctorSpecialtyService.associations()
      .find(a => a.doctorId === doctorId && a.specialtyId === specialtyId);
    return assoc && assoc.durationMinutes > 0 ? assoc.durationMinutes : 30; // Default 30
  }

  formatTime12Hour(time: string): string {
    if (!time) return '';
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hours = h % 12 || 12;
    return `${hours}:${m.toString().padStart(2, '0')} ${period}`;
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
        transactionId: this.modalTransactionId(),
        paymentProofUrl: this.modalPaymentProof()
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

  getPatientName(id: string) {
    return this.patients().find(p => p.patientId === id)?.fullName || 'Paciente Desconocido';
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
    // Just open with empty values to force selection
    this.openBookingModal('', '');
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

  validatePayment() {
    if (this.selectedAppointment) {
      // Optimistic update
      const updated = { ...this.selectedAppointment, paymentStatus: 'PAID' as const, status: 'CONFIRMED' as const };

      // Update in list
      this.appointments.update(list =>
        list.map(a => a.appointmentId === updated.appointmentId ? updated : a)
      );

      // Update current selection so UI reflects changes immediately (header color, button disappearance)
      this.selectedAppointment = updated;

      // Call service to update payment and status
      this.appointmentsService.updatePayment(
        this.selectedAppointment.appointmentId!,
        this.selectedAppointment.paymentMethod || 'CASH',
        'PAID'
      );
      this.appointmentsService.updatestatus(this.selectedAppointment.appointmentId!, 'CONFIRMED');
      // ideally we should also update paymentStatus if backend supports it separately, but for now this is the best we can do with current service.
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

  getDetailsHeaderClass(): string {
    if (!this.selectedAppointment) return 'bg-blue-600';

    // "Confirmado" (Paid) -> Green
    if (this.selectedAppointment.paymentStatus === 'PAID') {
      return 'bg-green-600';
    }
    // "Reservado" (Pending) -> Yellow
    return 'bg-yellow-500';
  }
}

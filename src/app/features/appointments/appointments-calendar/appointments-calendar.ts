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
import { LucideAngularModule, ChevronLeft, ChevronRight, Calendar, User, Clock, Plus, Search, AlertCircle, CheckCircle, HelpCircle, Stethoscope, Briefcase, Wallet, Check, ChevronDown, XCircle, Users, Flag } from 'lucide-angular';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select';
import { DatePickerComponent } from '../../../shared/components/datepicker/datepicker';
import { ButtonComponent } from '../../../shared/components/ui/button/button.component';
import { BadgeComponent } from '../../../shared/components/ui/badge/badge.component';
import { CardComponent } from '../../../shared/components/ui/card/card.component';

@Component({
  selector: 'app-appointments-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, SearchableSelectComponent, DatePickerComponent, ButtonComponent, BadgeComponent, CardComponent],
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

  readonly icons = { ChevronLeft, ChevronRight, Calendar, User, Clock, Plus, Search, AlertCircle, CheckCircle, HelpCircle, Stethoscope, Briefcase, Wallet, Check, ChevronDown, XCircle, Users, Flag };

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
  doctors = computed(() => this.doctorService.selectableDoctors().filter(d => d.active !== false));
  specialties = this.specialtyService.specialties;
  allPatients = signal<any[]>([]);
  appointments = this.appointmentsService.appointments;

  // Filters
  selectedDoctorId = signal<string>('');
  selectedSpecialtyId = signal<string>('');
  modalityFilter = signal<'ALL' | 'PRESENCIAL' | 'VIRTUAL'>('ALL');

  constructor() {
    this.patientsService.getAllPatientsForSelect().subscribe(data => {
      this.allPatients.set(data.content);
    });

    effect(() => {
      const current = this.currentDate();
      const mode = this.viewMode();
      let from: string, to: string;

      if (mode === 'week') {
        const start = this.getStartOfWeek(current);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        from = this.toIsoDate(start);
        to = this.toIsoDate(end);
      } else {
        from = to = this.toIsoDate(current);
      }

      this.appointmentsService.refreshAppointmentsByRange(from, to);
    });

    effect(() => {
      console.log('--- CALENDAR DEBUG ---');
      console.log('Selectable Doctors:', this.doctors());
      console.log('Schedules:', this.scheduleService.schedules());
      console.log('Appointments:', this.appointments());
      console.log('Time Slots:', this.timeSlots());
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

    // Body Scroll Lock Effect
    effect(() => {
      if (this.isModalOpen() || this.isDetailsModalOpen()) {
        document.body.classList.add('overflow-hidden');
      } else {
        document.body.classList.remove('overflow-hidden');
      }
    });

    // Timer for Current Time Indicator
    this.timerInterval = setInterval(() => {
      this.currentTime.set(new Date());
    }, 60000); // Update every minute
  }

  ngOnDestroy() {
    document.body.classList.remove('overflow-hidden');
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  // Helper to get local date as YYYY-MM-DD
  toIsoDate(date: Date): string {
    if (!date) return '';
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // --- Current Time Indicator logic ---
  currentTime = signal<Date>(new Date());
  private timerInterval: any;

  isToday(dateIso: string): boolean {
    return dateIso === this.toIsoDate(this.currentTime());
  }

  isCurrentTimeSlot(slotTime: string): boolean {
    const now = this.currentTime();
    const [h, m] = slotTime.split(':').map(Number);
    const slotMins = h * 60 + m;
    const nowMins = now.getHours() * 60 + now.getMinutes();

    return nowMins >= slotMins && nowMins < slotMins + 30; // Assuming 30min slots
  }

  getCurrentTimeOffsetInSlot(slotTime: string): number {
    const now = this.currentTime();
    const [h, m] = slotTime.split(':').map(Number);
    const slotMins = h * 60 + m;
    const nowMins = now.getHours() * 60 + now.getMinutes();

    const diff = nowMins - slotMins;
    if (diff < 0 || diff >= 30) return 0;

    return (diff / 30) * 100;
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

  canGoBack = computed(() => {
    return true; // Unblocked per user request
  });

  // Modal State
  isModalOpen = signal(false);
  saving = signal(false);
  selectedSlot: { date: string, time: string } | null = null;

  // Reactive Modal State
  modalPatientId = signal('');
  modalSpecialtyId = signal('');
  modalDoctorId = signal('');
  modalDate = signal(this.toIsoDate(new Date()));
  modalTime = signal('');
  modalModality = signal<'PRESENCIAL' | 'VIRTUAL' | ''>('');
  modalNotes = signal('');
  modalPaymentMethod = signal('CASH');
  modalTransactionId = signal('');
  modalPaymentProof = signal('');

  // Details Modal State
  isDetailsModalOpen = signal(false);
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
    const today = this.toIsoDate(this.currentDate());
    return this.appointments().filter(a => a.appointmentDate === today && a.status !== 'CANCELADA');
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
    const specialtyId = this.modalSpecialtyId();
    let docs = this.doctors();

    if (specialtyId) {
      const associations = this.doctorSpecialtyService.associations();
      const doctorIds = associations
        .filter(a => a.specialtyId === specialtyId)
        .map(a => a.doctorId);
      docs = docs.filter(d => d.doctorId != null && doctorIds.includes(d.doctorId));
    }

    return docs;
  });

  // Searchable Select Mappings
  get specialtyOptions(): SelectOption[] {
    return this.specialties().map(s => ({ id: s.specialtyId, label: s.name }));
  }

  get doctorOptions(): SelectOption[] {
    return this.filteredDoctors().map(d => ({
      id: d.doctorId || d.id,
      label: d.documentNumber ? `${d.documentNumber} - ${d.fullName}` : d.fullName
    }));
  }

  modalSpecialtyOptions = computed<SelectOption[]>(() => {
    let specialtiesToOffer = this.specialties();
    const doctorId = this.modalDoctorId();

    if (doctorId) {
      const associations = this.doctorSpecialtyService.associations();
      const specIds = associations.filter(a => a.doctorId === doctorId).map(a => a.specialtyId);
      specialtiesToOffer = specialtiesToOffer.filter(s => specIds.includes(s.specialtyId));
    }

    return specialtiesToOffer.map(s => ({ id: s.specialtyId, label: s.name }));
  });

  modalDoctorOptions = computed<SelectOption[]>(() => {
    return this.filteredDoctorsForModal().map(d => ({
      id: d.doctorId || d.id,
      label: d.documentNumber ? `${d.documentNumber} - ${d.fullName}` : d.fullName
    }));
  });

  get modalPatientOptions(): SelectOption[] {
    return this.allPatients().map(p => ({
      id: p.patientId,
      label: p.documentNumber ? `${p.documentNumber} - ${p.fullName}` : p.fullName
    }));
  }

  validDatesForModal = computed(() => {
    const doctorId = this.modalDoctorId();
    const specialtyId = this.modalSpecialtyId();
    const modality = this.modalModality();

    if (!doctorId || !specialtyId || !modality) return []; // Require modality to pick a date

    const schedules = this.scheduleService.getSchedulesForDoctor(doctorId, specialtyId);

    // Extract unique dates from schedules that match the selected modality
    const dates = new Set<string>();
    schedules.forEach(s => {
      const sModality = (s.modality || s.schedule_type || 'PRESENCIAL').toUpperCase();
      const sDate = s.date ? String(s.date).trim() : '';
      if (sDate && !this.isPastDate(sDate) && sModality === modality) {
        dates.add(sDate);
      }
    });

    return Array.from(dates).sort();
  });

  availableSlotsForModal = computed(() => {
    const doctorId = this.modalDoctorId();
    const specialtyId = this.modalSpecialtyId();
    const modality = this.modalModality();
    const date = this.modalDate();

    if (!doctorId || !specialtyId || !modality || !date) return [];

    // 1. Obtener duración de la asociación médico-especialidad
    const duration = this.getDuration(doctorId, specialtyId);

    // 2. Obtener horarios del médico para esa especialidad en esa fecha y ATENDIENDO LA MODALIDAD CORRECTA
    const schedules = this.scheduleService.getSchedulesForDoctor(doctorId, specialtyId)
      .filter(s => {
        const sModality = (s.modality || s.schedule_type || 'PRESENCIAL').toUpperCase();
        return s.date === date && sModality === modality;
      });

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

    // 4. Filtrar slots ya ocupados y pasados
    return slots.filter(time => {
      // 1. Check if slot is already booked
      const isBooked = this.appointments().some(a =>
        a.doctorId === doctorId &&
        a.appointmentDate === date &&
        this.normalizeTime(a.startTime) === time &&
        a.status !== 'CANCELADA'
      );
      if (isBooked) return false;

      // 2. Check if slot is in the past (only relevant for today)
      if (this.isPastTime(date, time)) return false;

      return true;
    });
  });

  weekDays = computed(() => {
    const start = this.getStartOfWeek(this.currentDate());
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const iso = this.toIsoDate(d);

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
        const todayStr = this.toIsoDate(currentDate);
        docSchedules = docSchedules.filter(s => s.date === todayStr);
      } else {
        const startOfWeekStr = this.toIsoDate(this.getStartOfWeek(currentDate));
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
      if (a.status === 'CANCELADA') continue;

      // In day view, date must match
      if (mode === 'day' && a.appointmentDate !== this.toIsoDate(currentDate)) continue;

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
    // Create date at midnight local to avoid any hour-based shifting during setDate
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    const day = d.getDay(); // 0 = Sunday, 1 = Monday
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diff);
    return monday;
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
    const todayStr = this.toIsoDate(new Date());
    return dateStr < todayStr;
  }

  isPastTime(dateStr: string, timeStr: string): boolean {
    if (this.isPastDate(dateStr)) return true;

    // If today, check time against local time
    const todayStr = this.toIsoDate(new Date());

    if (dateStr === todayStr) {
      const now = new Date();
      const [h, m] = timeStr.split(':').map(Number);

      const currentH = now.getHours();
      const currentM = now.getMinutes();

      if (h < currentH) return true;
      if (h === currentH && m <= currentM) return true;
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

      // Modality Filter
      const modFilter = this.modalityFilter();

      // Check Appointments
      const matchingApp = this.appointments().find(a => {
        const aDocId = String(a.doctorId || '').trim();
        const aUserId = String((a as any).userId || '').trim();
        const targetId = String(docId || '').trim();

        const idMatch = aDocId === targetId || aUserId === targetId;
        const dateMatch = String(a.appointmentDate || '').includes(dateIso);
        const timeMatch = this.normalizeTime(a.startTime) === time;

        return idMatch && dateMatch && timeMatch && a.status !== 'CANCELADA';
      });

      // Check Schedule availability to get the modality of this block
      let isWorking = false;
      let workingSpecialtyId = '';
      let workingModality = '';

      // Helper logic
      const checkSchedule = (schedulesList: any[]) => {
        for (const s of schedulesList) {
          if (s.date === dateIso) {
            const startStr = this.normalizeTime(s.startTime);
            const endStr = this.normalizeTime(s.endTime);
            const startMins = this.getMinutes(startStr);
            const endMins = this.getMinutes(endStr);
            const duration = this.getDuration(docId, s.specialtyId);

            // Time slots were generated using `startMins + N * duration`.
            // Check if this time slot is within the schedule's active block.
            if (timeMins >= startMins && timeMins < endMins) {
              isWorking = true;
              workingSpecialtyId = s.specialtyId;
              workingModality = (s.modality || s.schedule_type || 'PRESENCIAL').toUpperCase();
              return;
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

      if (matchingApp) {
        const appModality = (matchingApp.modality || (matchingApp as any).appointment_type || workingModality || 'PRESENCIAL').toUpperCase();
        if (modFilter === 'ALL' || modFilter === appModality) {
          items.push({ type: 'booked', appointment: matchingApp });
        }
        continue;
      }

      // If it's a date before today, hide availability slots
      if (this.isPastDate(dateIso)) continue;

      if (isWorking) {
        if (modFilter === 'ALL' || modFilter === workingModality) {
          items.push({
            type: 'available',
            doctorId: docId,
            doctorName: docName,
            date: dateIso,
            time: time,
            specialtyId: workingSpecialtyId,
            modality: workingModality,
            isPast: isPast
          });
        }
      }
    }

    return items;
  }

  // Renamed to getAppointmentsForSlot to reflect it returns an array now
  getAppointmentsForSlot(dateIso: string, time: string): Appointment[] {
    const res = this.getSlotStatus(dateIso, time, 0); // dayIndex irrelevant for this logic now
    return res.filter((item: any) => item.type === 'booked').map((item: any) => item.appointment);
  }

  openBookingModal(dateIso: string, time: string, doctorId?: string, specialtyId?: string, modality?: string) {
    this.selectedSlot = { date: dateIso, time };
    this.modalPatientId.set('');
    this.modalSpecialtyId.set(specialtyId || this.selectedSpecialtyId() || '');
    this.modalDoctorId.set(doctorId || this.selectedDoctorId() || '');
    this.modalModality.set((modality as any) || '');
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

    this.selectTimeSlot(alignedTime);
    this.modalNotes.set('');
    this.modalPaymentMethod.set('CASH');
    this.modalTransactionId.set('');
    this.modalPaymentProof.set('');
    this.isModalOpen.set(true);
  }

  selectTimeSlot(time: string) {
    this.modalTime.set(time);
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
    this.isModalOpen.set(false);
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
      .find(a => (a.doctorId === doctorId || (a as any).id === doctorId || (a as any).userId === doctorId) && a.specialtyId === specialtyId);
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
      const patient = this.allPatients().find(p => p.patientId === patientId);
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
        paymentProofUrl: this.modalPaymentProof(),
        modality: this.modalModality()
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
    const doctor = this.doctors().find(d =>
      (d as any).id === id ||
      (d as any).doctorId === id ||
      (d as any).userId === id
    );
    return doctor?.fullName || 'Desconocido';
  }

  getSpecialtyName(id: string) {
    return this.specialties().find(s => s.specialtyId === id)?.name || 'Desconocido';
  }

  getPatientName(id: string) {
    return this.allPatients().find(p => p.patientId === id)?.fullName || 'Paciente Desconocido';
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
    this.isDetailsModalOpen.set(true);
    this.isRescheduling = false;
  }

  closeDetailsModal() {
    this.isDetailsModalOpen.set(false);
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
      this.modalModality.set((this.selectedAppointment.modality || 'PRESENCIAL') as any);
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
      this.changeAppointmentStatus('CANCELADA');
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
        modality: this.modalModality() as any
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

  changeAppointmentStatus(newStatus: Appointment['status']) {
    if (this.selectedAppointment && this.selectedAppointment.appointmentId) {
      // Optimistic update
      const updated = { ...this.selectedAppointment, status: newStatus };

      this.appointments.update(list =>
        list.map(a => a.appointmentId === updated.appointmentId ? updated : a)
      );
      this.selectedAppointment = updated;

      // Backend update
      this.appointmentsService.updatestatus(this.selectedAppointment.appointmentId!, newStatus);

      // Close modal on final state
      if (newStatus === 'ATENDIDA' || newStatus === 'PERDIDA' || newStatus === 'CANCELADA') {
        this.closeDetailsModal();
      }
    }
  }

  validatePayment() {
    if (this.selectedAppointment) {
      // Optimistic update
      const updated = { ...this.selectedAppointment, paymentStatus: 'PAID' as const, status: 'CONFIRMADA' as const };

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
      this.appointmentsService.updatestatus(this.selectedAppointment.appointmentId!, 'CONFIRMADA');
      // ideally we should also update paymentStatus if backend supports it separately, but for now this is the best we can do with current service.
    }
  }

  canValidatePayment(app: Appointment | null): boolean {
    if (!app) return false;
    return app.paymentStatus === 'PENDING';
  }

  getAppointmentStatusLabel(app: Appointment): string {
    if (!app.status) return 'Desconocido';
    const s = app.status;
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  }

  getAppointmentStatusVariant(app: Appointment | null): 'primary' | 'success' | 'warning' | 'danger' | 'neutral' {
    if (!app || !app.status) return 'neutral';
    const s = app.status;
    if (['CONFIRMADA', 'ATENDIDA'].includes(s)) return 'success';
    if (s === 'PROGRAMADA') return 'warning';
    if (['EN ESPERA', 'EN ATENCION'].includes(s)) return 'primary';
    if (['CANCELADA', 'PERDIDA'].includes(s)) return 'danger';
    return 'neutral';
  }

  getDetailsHeaderClass(): string {
    return 'bg-gray-50 border-b border-gray-100';
  }

  getPaymentMethodLabel(method: string | undefined): string {
    if (!method) return 'No especificado';
    const m = method.toUpperCase();
    if (m === 'CASH' || m === 'EFECTIVO') return 'Efectivo';
    if (m === 'YAPE') return 'Yape';
    if (m === 'PLIN') return 'Plin';
    if (m === 'TRANSFER' || m === 'TRANSFERENCIA') return 'Transferencia';
    if (m === 'CARD' || m === 'TARJETA') return 'Tarjeta';
    return method;
  }
}

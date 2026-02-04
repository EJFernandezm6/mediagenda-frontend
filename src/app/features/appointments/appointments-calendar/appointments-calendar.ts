import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppointmentsService, Appointment } from '../../../core/services/appointments';
import { DoctorsService } from '../../../core/services/doctors';
import { SpecialtiesService } from '../../../core/services/specialties';
import { SchedulesService } from '../../../core/services/schedules';
import { PatientsService } from '../../../core/services/patients';
import { DoctorSpecialtyService } from '../../doctors/doctor-specialty/doctor-specialty.service';
import { LucideAngularModule, ChevronLeft, ChevronRight, Calendar, User, Clock, Plus, Search, AlertCircle, CheckCircle } from 'lucide-angular';

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

  readonly icons = { ChevronLeft, ChevronRight, Calendar, User, Clock, Plus, Search, AlertCircle, CheckCircle };

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

  // Appointments for All Doctors (Today)
  globalAppointments = computed(() => {
    const today = this.currentDate().toISOString().split('T')[0];
    return this.appointments().filter(a => a.date === today && a.status !== 'CANCELLED');
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
    let dayOfWeek = new Date(date).getUTCDay();

    const daySchedules = schedules.filter(s => s.dayOfWeek === dayOfWeek);

    return this.timeSlots.filter(time => {
      const isWorking = daySchedules.some(s => time >= s.startTime && time < s.endTime);
      if (!isWorking) return false;

      const isBooked = this.appointments().some(a =>
        a.doctorId === doctorId &&
        a.date === date &&
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
      const patient = this.patients().find(p => p.id === patientId);
      this.appointmentsService.addAppointment({
        doctorId,
        specialtyId,
        patientId,
        patientName: patient?.fullName || 'Desconocido',
        date,
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
    return this.specialties().find(s => s.id === id)?.name || 'Desconocido';
  }

  openGenericBooking() {
    // Find first available slot today or in the week
    const today = new Date().toISOString().split('T')[0];
    const firstAvailable = this.timeSlots.find(slot => this.getSlotStatus(today, slot, 0) === 'available');

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
      this.modalDate.set(this.selectedAppointment.date);
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
      this.appointmentsService.updatestatus(this.selectedAppointment.id, 'CANCELLED');
      this.closeDetailsModal();
      this.isConfirmingCancel = false;
    }
  }

  saveRescheduledAppointment() {
    if (this.selectedAppointment && this.modalTime() && this.modalDate()) {
      // Update the existing appointment
      const updatedAppointment: Appointment = {
        ...this.selectedAppointment,
        date: this.modalDate(),
        startTime: this.modalTime(),
        endTime: this.addMinutes(this.modalTime(), 30),
        notes: this.modalNotes(),
        paymentMethod: this.modalPaymentMethod() as any,
        transactionId: this.modalTransactionId()
      };

      // Update in service (you'll need to add this method to the service)
      const appointments = this.appointments();
      const index = appointments.findIndex(a => a.id === this.selectedAppointment!.id);
      if (index !== -1) {
        appointments[index] = updatedAppointment;
        this.appointmentsService.appointments.set([...appointments]);
      }

      this.closeDetailsModal();
    }
  }

  cancelAppointment() {
    if (this.selectedAppointment) {
      this.appointmentsService.updatestatus(this.selectedAppointment.id, 'CANCELLED');
      this.closeDetailsModal();
    }
  }
}

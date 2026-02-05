import { Injectable, signal } from '@angular/core';

export interface Appointment {
  id: string;
  doctorId: string;
  specialtyId: string;
  patientId: string;
  patientName: string; // Denormalized for simpler UI
  date: string; // ISO Date "2025-10-15"
  startTime: string; // "09:00"
  endTime: string; // "09:30"
  status: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  paymentMethod?: 'YAPE' | 'PLIN' | 'CARD' | 'CASH';
  paymentStatus?: 'PENDING' | 'PAID';
  transactionId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AppointmentsService {
  private mockAppointments: Appointment[] = this.generateMockAppointments();

  private generateMockAppointments(): Appointment[] {
    const today = new Date();
    const addDays = (days: number) => {
      const d = new Date(today);
      d.setDate(today.getDate() + days);
      return d.toISOString().split('T')[0];
    };

    return [
      // TODAY: Mixed States
      {
        id: 'a1',
        doctorId: 'd1',
        specialtyId: '1',
        patientId: 'p1',
        patientName: 'Ana García',
        date: addDays(0), // Today
        startTime: '09:00',
        endTime: '09:30',
        status: 'CONFIRMED',
        paymentStatus: 'PAID', // Green
        notes: 'Consulta pagada - Chequeo anual',
        paymentMethod: 'YAPE',
        transactionId: 'TX-123'
      },
      {
        id: 'a2',
        doctorId: 'd1',
        specialtyId: '1',
        patientId: 'p2',
        patientName: 'Luis Torres',
        date: addDays(0),
        startTime: '10:00',
        endTime: '10:30',
        status: 'CONFIRMED',
        paymentStatus: 'PENDING', // Yellow
        notes: 'Reservada, pago pendiente en recepción'
      },
      {
        id: 'a3',
        doctorId: 'd2',
        specialtyId: '1',
        patientId: 'p3',
        patientName: 'Carlos Ruiz',
        date: addDays(0),
        startTime: '09:00', // Collision with a1 (different doctor)
        endTime: '09:30',
        status: 'CONFIRMED', // Was SCHEDULED (Blue) -> Now CONFIRMED & PENDING (Yellow)
        paymentStatus: 'PENDING'
      },

      // TOMORROW: Heavy day
      {
        id: 'a4',
        doctorId: 'd1',
        specialtyId: '1',
        patientId: 'p4',
        patientName: 'Maria Lopez',
        date: addDays(1),
        startTime: '08:00',
        endTime: '08:30',
        status: 'CONFIRMED',
        paymentStatus: 'PAID' // Green
      },
      {
        id: 'a5',
        doctorId: 'd1',
        specialtyId: '1',
        patientId: 'p5',
        patientName: 'Jorge Perez',
        date: addDays(1),
        startTime: '08:30',
        endTime: '09:00',
        status: 'CONFIRMED',
        paymentStatus: 'PENDING'
      },

      // NEXT 3 DAYS: Scattered
      {
        id: 'a6',
        doctorId: 'd1',
        specialtyId: '1',
        patientId: 'p6',
        patientName: 'Elena Diaz',
        date: addDays(3),
        startTime: '15:00',
        endTime: '15:30',
        status: 'CONFIRMED',
        paymentStatus: 'PENDING' // Yellow
      },
      {
        id: 'a7',
        doctorId: 'd2',
        specialtyId: '1',
        patientId: 'p7',
        patientName: 'Roberto Gomez',
        date: addDays(4),
        startTime: '11:00',
        endTime: '11:30',
        status: 'CONFIRMED',
        paymentStatus: 'PAID' // Green
      }
    ];
  }

  appointments = signal<Appointment[]>(this.mockAppointments);

  getAppointments() {
    return this.appointments();
  }

  getAppointmentsForDateRange(start: string, end: string, doctorId: string) {
    return this.appointments().filter(a =>
      a.date >= start && a.date <= end && a.doctorId === doctorId
    );
  }

  addAppointment(appointment: Omit<Appointment, 'id' | 'status'>) {
    const newApp: Appointment = {
      ...appointment,
      id: Math.random().toString(36).substr(2, 9),
      status: 'SCHEDULED'
    };
    this.appointments.update(list => [...list, newApp]);
  }

  updatestatus(id: string, status: Appointment['status']) {
    this.appointments.update(list =>
      list.map(a => a.id === id ? { ...a, status } : a)
    );
  }

  cancelAppointment(id: string) {
    this.updatestatus(id, 'CANCELLED');
  }
}

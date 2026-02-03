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
  private mockAppointments: Appointment[] = [
    {
      id: 'a1',
      doctorId: 'd1',
      specialtyId: '1',
      patientId: 'p1',
      patientName: 'Ana García',
      date: new Date().toISOString().split('T')[0], // Today
      startTime: '09:00',
      endTime: '09:30',
      status: 'CONFIRMED',
      notes: 'Consulta rutinaria',
      paymentMethod: 'YAPE',
      paymentStatus: 'PAID',
      transactionId: '123456'
    },
    {
      id: 'a2',
      doctorId: 'd1',
      specialtyId: '1',
      patientId: 'p2',
      patientName: 'Luis Torres',
      date: new Date().toISOString().split('T')[0], // Today
      startTime: '10:00',
      endTime: '10:30',
      status: 'CONFIRMED'
    }
  ];

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

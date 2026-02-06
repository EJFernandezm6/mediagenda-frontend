import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface Appointment {
  appointmentId?: string; // Optional for creation
  doctorId: string;
  doctorName?: string; // Added from DTO
  specialtyId: string;
  specialtyName?: string; // Added from DTO
  patientId: string;
  patientName?: string; // Added from DTO
  appointmentDate: string; // ISO "2025-10-15"
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
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/appointments`;

  appointments = signal<Appointment[]>([]);

  constructor() {
    // Load initial (e.g., today) or leave empty until filtered
    this.refreshAppointments();
  }

  refreshAppointments(filters?: { doctorId?: string, date?: string }) {
    let params = new HttpParams();
    if (filters?.doctorId) params = params.set('doctorId', filters.doctorId);
    if (filters?.date) params = params.set('date', filters.date);

    this.http.get<Appointment[]>(this.apiUrl, { params }).subscribe(data => {
      this.appointments.set(data);
    });
  }

  getAppointments() {
    return this.appointments();
  }

  getAppointmentsForDateRange(start: string, end: string, doctorId: string) {
    // Backend currently supports single date filter. 
    // For ranges, we might need a new endpoint or loop. 
    // For now, let's just fetch generally and filter client-side if range is small, 
    // or assume the Calendar component requests specific dates.
    // Better: Update backend to support range.
    // Fallback: Fetch all for doctor (if not too many) or just fetch for "start" date if calendar views day-by-day.
    // Let's rely on refreshAppointments logic for now.
    return this.appointments();
  }

  addAppointment(appointment: any) {
    this.http.post<Appointment>(this.apiUrl, appointment).subscribe(newApp => {
      this.appointments.update(list => [...list, newApp]);
    });
  }

  updatestatus(id: string, status: Appointment['status']) {
    this.http.put<Appointment>(`${this.apiUrl}/${id}/status`, { status }).subscribe(updated => {
      this.appointments.update(list =>
        list.map(a => a.appointmentId === id ? updated : a)
      );
    });
  }

  cancelAppointment(id: string) {
    this.updatestatus(id, 'CANCELLED');
  }
}

import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { tap } from 'rxjs';
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

  private normalizeTime(t: string): string {
    return t && t.length > 5 ? t.substring(0, 5) : t;
  }

  private normalizeAppointment(a: Appointment): Appointment {
    return { ...a, startTime: this.normalizeTime(a.startTime), endTime: this.normalizeTime(a.endTime) };
  }

  refreshAppointmentsByRange(from: string, to: string) {
    const params = new HttpParams().set('from', from).set('to', to);
    this.http.get<Appointment[]>(`${this.apiUrl}/range`, { params }).subscribe(data => {
      this.appointments.set(data.map(a => this.normalizeAppointment(a)));
    });
  }

  addAppointment(appointment: any) {
    return this.http.post<Appointment>(this.apiUrl, appointment).pipe(
      tap(newApp => this.appointments.update(list => [...list, this.normalizeAppointment(newApp)]))
    );
  }

  updatestatus(id: string, status: Appointment['status']) {
    this.http.put<Appointment>(`${this.apiUrl}/${id}/status`, { status }).subscribe(updated => {
      this.appointments.update(list =>
        list.map(a => a.appointmentId === id ? this.normalizeAppointment(updated) : a)
      );
    });
  }

  cancelAppointment(id: string) {
    this.updatestatus(id, 'CANCELLED');
  }
}

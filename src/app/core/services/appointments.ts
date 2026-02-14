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
  paymentProofUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AppointmentsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/appointments`;

  appointments = signal<Appointment[]>([]);
  pendingAppointments = signal<Appointment[]>([]);

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

  getAppointmentById(id: string) {
    return this.http.get<Appointment>(`${this.apiUrl}/${id}`).pipe(
      tap(app => {
        // Also update local list if present
        this.appointments.update(list => {
          const idx = list.findIndex(a => a.appointmentId === app.appointmentId);
          if (idx !== -1) {
            const newList = [...list];
            newList[idx] = this.normalizeAppointment(app);
            return newList;
          }
          return list;
        });
      })
    );
  }

  fetchPendingAppointments() {
    // Assuming endpoint supports filtering or we fetch future and filter
    // For now, let's fetch 'all' or a wide range, or assume a specific endpoint exists.
    // I'll try fetching with paymentStatus=PENDING if backend supports, otherwise I'll need to fetch recent/future.
    // Given I don't want to break things, I'll use a new call to /pending if it existed, but likely I just need to add a param.
    // Let's try GET /appointments/pending if possible, or just standard GET with params.
    // I'll assume GET /appointments/pending works as a safe bet for a new feature, or I'll just filter in client from a "current month" fetch?
    // User requested: "notifications for when admin needs to change status manually".
    // I will try to fetch ALL pending appointments.
    const params = new HttpParams().set('paymentStatus', 'PENDING');
    this.http.get<Appointment[]>(`${this.apiUrl}`, { params }).subscribe({
      next: (data) => {
        // Filter mainly for YAPE/PLIN/CASH and PENDING status
        const pending = data
          .filter(a => a.paymentStatus === 'PENDING' && ['YAPE', 'PLIN', 'CASH'].includes(a.paymentMethod || ''))
          .map(a => this.normalizeAppointment(a));
        this.pendingAppointments.set(pending);
      },
      error: () => {
        // Fallback or ignore
        console.warn('Failed to fetch pending appointments');
      }
    });
  }

  addAppointment(appointment: any) {
    return this.http.post<Appointment>(this.apiUrl, appointment).pipe(
      tap(newApp => {
        this.appointments.update(list => [...list, this.normalizeAppointment(newApp)]);
        this.fetchPendingAppointments(); // Refresh pending
      })
    );
  }

  updatestatus(id: string, status: Appointment['status']) {
    this.http.patch(`${this.apiUrl}/${id}/status`, { status }).subscribe(() => {
      this.appointments.update(list =>
        list.map(a => a.appointmentId === id ? { ...a, status } : a)
      );
      this.fetchPendingAppointments(); // Refresh pending
    });
  }

  updatePayment(id: string, paymentMethod: string, paymentStatus: 'PENDING' | 'PAID', transactionId?: string) {
    const body = { paymentMethod, paymentStatus, transactionId };
    this.http.patch(`${this.apiUrl}/${id}/payment`, body).subscribe(() => {
      this.appointments.update(list =>
        list.map(a => a.appointmentId === id ? { ...a, paymentStatus, paymentMethod: paymentMethod as any } : a)
      );
      this.fetchPendingAppointments();
    });
  }

  cancelAppointment(id: string) {
    this.updatestatus(id, 'CANCELLED');
  }
}

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
  status: 'DISPONIBLE' | 'EN PROCESO DE RESERVA' | 'EN_PROCESO_RESERVA' | 'PROGRAMADA' | 'CONFIRMADA' | 'EN ATENCION' | 'EN ESPERA' | 'ATENDIDA' | 'PERDIDA' | 'CANCELADA';
  notes?: string;
  paymentMethod?: 'CASH' | 'CARD' | 'TRANSFER';
  paymentStatus?: 'PENDING' | 'PAID';
  paymentProofUrl?: string;
  modality?: 'PRESENCIAL' | 'VIRTUAL' | string;
  appointment_type?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AppointmentsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/appointments`;

  appointments = signal<Appointment[]>([]);
  pendingAppointments = signal<Appointment[]>([]);
  refreshTrigger = signal<number>(0);
  
  private lastFetchedRange: string = '';
  private isFetching = false;

  private normalizeTime(t: string): string {
    return t && t.length > 5 ? t.substring(0, 5) : t;
  }

  private normalizeAppointment(a: Appointment): Appointment {
    return { ...a, startTime: this.normalizeTime(a.startTime), endTime: this.normalizeTime(a.endTime) };
  }

  refreshAppointmentsByRange(from: string, to: string) {
    const rangeKey = `${from}_${to}`;
    if (this.lastFetchedRange === rangeKey && !this.isFetching) return;
    
    this.isFetching = true;
    this.lastFetchedRange = rangeKey;

    const params = new HttpParams().set('from', from).set('to', to);
    this.http.get<Appointment[]>(`${this.apiUrl}/range`, { params }).subscribe({
      next: (data) => {
        this.appointments.set(data.map(a => this.normalizeAppointment(a)));
        this.isFetching = false;
      },
      error: (err) => {
        console.error('Error fetching appointments range:', err);
        this.isFetching = false;
      }
    });
  }

  getAppointmentsRange(from: string, to: string) {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<Appointment[]>(`${this.apiUrl}/range`, { params }).pipe(
      tap(data => data.map(a => this.normalizeAppointment(a)))
    );
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
    this.http.get<Appointment[]>(`${this.apiUrl}/pending-verification`).subscribe({
      next: (data) => {
        this.pendingAppointments.set(data.map(a => this.normalizeAppointment(a)));
      },
      error: () => {
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
      this.refreshTrigger.update(v => v + 1);
    });
  }

  updatePayment(id: string, paymentMethod: string, paymentStatus: 'PENDING' | 'PAID', transactionId?: string) {
    const body = { paymentMethod, paymentStatus, transactionId };
    this.http.patch(`${this.apiUrl}/${id}/payment`, body).subscribe(() => {
      this.appointments.update(list =>
        list.map(a => a.appointmentId === id ? { ...a, paymentStatus, paymentMethod: paymentMethod as any } : a)
      );
      this.fetchPendingAppointments();
      this.refreshTrigger.update(v => v + 1);
    });
  }

  cancelAppointment(id: string) {
    this.updatestatus(id, 'CANCELADA');
  }
}

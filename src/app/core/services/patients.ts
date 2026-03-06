import { Injectable, signal, inject, effect, untracked } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { tap } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';

export interface Patient {
  patientId: string; // Updated to match Backend Entity @Id
  clinicId?: string;
  fullName: string;
  dni: string;
  email: string;
  phone: string;
  age: number;
  gender: 'M' | 'F' | 'O';
  lastVisit?: string;
}

export interface Consultation {
  // This maps to Appointment for history
  appointmentId: string;
  appointmentDate: string;
  doctorId: string;
  specialtyId: string;
  notes: string;
  diagnosis?: string;
  treatment?: string;
  status: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

@Injectable({
  providedIn: 'root'
})
export class PatientsService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = `${environment.apiUrl}/patients`;

  patients = signal<Patient[]>([]);

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      untracked(() => {
        if (user) {
          this.refreshPatients();
        } else {
          this.patients.set([]);
        }
      });
    });
  }

  refreshPatients() {
    let params = new HttpParams().set('page', '0').set('size', '10000');

    this.http.get<PaginatedResponse<Patient>>(this.apiUrl, { params }).subscribe({
      next: (data) => {
        this.patients.set(data.content);
      },
      error: (err) => console.error('Error fetching patients', err)
    });
  }

  getPatients() {
    return this.patients();
  }

  getAllPatientsForSelect() {
    let params = new HttpParams().set('page', '0').set('size', '10000');
    return this.http.get<PaginatedResponse<Patient>>(this.apiUrl, { params }).pipe(
      tap(data => console.log('Loaded all patients for select:', data.content.length))
    );
  }

  getPatient(id: string) {
    return this.http.get<Patient>(`${this.apiUrl}/${id}`);
  }

  getPatientHistory(patientId: string) {
    return this.http.get<Consultation[]>(`${this.apiUrl}/${patientId}/history`);
  }

  addPatient(patient: Omit<Patient, 'patientId'>) {
    return this.http.post<Patient>(this.apiUrl, patient).pipe(
      tap(() => this.refreshPatients())
    );
  }

  updatePatient(id: string, updates: Partial<Patient>) {
    return this.http.put<Patient>(`${this.apiUrl}/${id}`, updates).pipe(
      tap(() => this.refreshPatients())
    );
  }
}

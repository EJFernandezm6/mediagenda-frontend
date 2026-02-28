import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { tap } from 'rxjs/operators';

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
  private apiUrl = `${environment.apiUrl}/patients`;

  patients = signal<Patient[]>([]);
  totalElements = signal<number>(0);

  constructor() {
    this.refreshPatients(0, 10, '');
  }

  refreshPatients(page: number = 0, size: number = 10, search: string = '') {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    if (search) params = params.set('search', search);

    this.http.get<PaginatedResponse<Patient>>(this.apiUrl, { params }).subscribe(data => {
      this.patients.set(data.content);
      this.totalElements.set(data.totalElements);
    });
  }

  getPatients() {
    return this.patients();
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

import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

@Injectable({
  providedIn: 'root'
})
export class PatientsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/patients`;


  patients = signal<Patient[]>([]);

  constructor() {
    this.refreshPatients();
  }

  refreshPatients() {
    this.http.get<Patient[]>(this.apiUrl).subscribe(data => this.patients.set(data));
  }

  getAllPatients() {
    return this.http.get<Patient[]>(this.apiUrl);
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

import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { User } from '../auth/auth.service';

export interface Doctor extends User {
  // Extends User from Auth Service which has basics
  // Specific doctor fields from Backend User entity:
  cmp?: string;
  rating?: number;
  reviewsCount?: number;
  active?: boolean; // mapped to isActive in backend
  // photoUrl is in User
}

@Injectable({
  providedIn: 'root'
})
export class DoctorsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/users`; // Uses Users API

  doctors = signal<Doctor[]>([]);

  constructor() {
    this.refreshDoctors();
  }

  refreshDoctors() {
    // Fetch users with ROLE=DOCTOR
    this.http.get<Doctor[]>(`${this.apiUrl}?role=DOCTOR`).subscribe(data => {
      this.doctors.set(data);
    });
  }

  getDoctors() {
    return this.doctors();
  }

  addDoctor(doctor: any) {
    const newDoc = { ...doctor, role: 'DOCTOR' };
    this.http.post<Doctor>(this.apiUrl, newDoc).subscribe(created => {
      this.doctors.update(list => [...list, created]);
    });
  }

  updateDoctor(id: string, updates: Partial<Doctor>) {
    this.http.put<Doctor>(`${this.apiUrl}/${id}`, updates).subscribe(updated => {
      this.doctors.update(list =>
        list.map(d => d.id === id ? updated : d)
      );
    });
  }

  deleteDoctor(id: string) {
    this.http.delete(`${this.apiUrl}/${id}`).subscribe(() => {
      this.doctors.update(list => list.filter(d => d.id !== id));
    });
  }
}

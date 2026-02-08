import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { User } from '../auth/auth.service';
import { tap } from 'rxjs/operators';

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
    // Ensure roles array is sent, and add a default password if missing (Backend likely requires it)
    const newDoc = {
      ...doctor,
      roles: ['DOCTOR'],
      password: doctor.password || '12345678' // Default password for doctors created here
    };
    return this.http.post<Doctor>(this.apiUrl, newDoc).pipe(
      tap(() => this.refreshDoctors())
    );
  }

  updateDoctor(id: string, updates: Partial<Doctor>) {
    return this.http.put<Doctor>(`${this.apiUrl}/${id}`, updates).pipe(
      tap(() => this.refreshDoctors())
    );
  }

  deleteDoctor(id: string) {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.refreshDoctors())
    );
  }
}

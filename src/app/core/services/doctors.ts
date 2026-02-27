import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { User } from '../auth/auth.service';
import { tap, switchMap } from 'rxjs/operators';
import { Observable, forkJoin } from 'rxjs';


export interface Doctor extends User {
  // Extends User from Auth Service which has basics
  // Specific doctor fields from Backend User entity:
  id: string; // Must match User interface (required) - THIS IS USER ID
  doctorId?: string; // Specific ID for Catalog/Doctor profile
  userId?: string; // Redundant but kept for clarity
  cmp?: string;
  // DNI: Mandatory for Specialists (Not yet implemented in DB/Backend)
  dni?: string;
  rating?: number;
  reviewsCount?: number;
  active?: boolean;
  // photoUrl is in User
}

@Injectable({
  providedIn: 'root'
})
export class DoctorsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/iam/users`; // Uses Users API (Doctors are Users with role)
  private rolesUrl = `${environment.apiUrl}/iam/roles`;
  private doctorsUrl = `${environment.apiUrl}/catalog/doctors`;



  doctors = signal<Doctor[]>([]);

  constructor() {
    this.refreshDoctors();
  }

  refreshDoctors() {
    this.http.get<any[]>(`${this.doctorsUrl}/with-users`).subscribe({
      next: (data) => this.doctors.set(data.map(d => ({
        ...d,
        id: d.userId,
        active: d.isActive
      } as Doctor))),
      error: (err) => console.error('Error fetching doctors:', err)
    });
  }

  getDoctors() {
    return this.doctors();
  }

  addDoctor(doctor: any) {
    // 1. Get DOCTOR role ID
    return this.http.get<any[]>(this.rolesUrl).pipe(
      map(roles => {
        const doctorRole = roles.find(r => r.roleKey === 'DOCTOR' || r.name.toUpperCase() === 'DOCTOR');
        if (!doctorRole) throw new Error('Role DOCTOR not found');
        return doctorRole.roleId;
      }),
      switchMap(roleId => {
        // 2. Create User with that Role
        const newUser = {
          fullName: doctor.fullName,
          email: doctor.email,
          phone: doctor.phone,
          dni: doctor.dni,
          password: doctor.password || '12345678', // Default password
          roleIds: [roleId],
          photoUrl: doctor.photoUrl
        };
        return this.http.post<any>(this.apiUrl, newUser);
      }),
      switchMap(createdUser => {
        // 3. Create Doctor Profile linked to User
        const newDoctorProfile = {
          userId: createdUser.userId || createdUser.id,
          cmp: doctor.cmp,
          dni: doctor.dni
        };
        return this.http.post<any>(this.doctorsUrl, newDoctorProfile);
      }),
      switchMap(createdDoctor => {
        // 4. Activate Doctor immediately
        // Backend returns DoctorResponse which has doctorId
        return this.http.patch(`${this.doctorsUrl}/${createdDoctor.doctorId}/status`, { isActive: true });
      }),
      tap(() => this.refreshDoctors())
    );
  }

  updateDoctor(id: string, updates: Partial<Doctor>) {
    // Split updates: User (Name, Phone, Email) vs Status vs Profile (CMP - not updatable via Users API)
    const userUpdates: any = { ...updates };

    // Remove fields that cannot be updated via /iam/users
    delete userUpdates.id;
    delete userUpdates.userId;
    delete userUpdates.cmp; // CMP is in Doctor Profile, not User
    delete userUpdates.rating;
    delete userUpdates.reviewsCount;
    delete userUpdates.active; // Status is updated via separate endpoint
    delete userUpdates.roles; // Roles are not updated here
    delete userUpdates.doctorId; // DoctorID is not in User entity

    // 1. Update User Basic Info
    // If userUpdates is empty (e.g. only active status changed), we must still send required fields like fullName
    // or the backend validation will fail.
    const currentDoctor = this.doctors().find(d => d.id === id);
    if (currentDoctor) {
      if (!userUpdates.fullName) userUpdates.fullName = currentDoctor.fullName;
      if (!userUpdates.email) userUpdates.email = currentDoctor.email;
      if (!userUpdates.phone) userUpdates.phone = currentDoctor.phone;
      // Ensure roleId is present for validation
      if (!userUpdates.roleIds) userUpdates.roleIds = currentDoctor.roleIds ?? [];
    }

    const userUpdate$ = this.http.put<any>(`${this.apiUrl}/${id}`, userUpdates);

    // 2. Update Status if changed (IAM User)
    let statusUpdate$ = new Observable(obs => { obs.next(null); obs.complete(); });
    if (updates.active !== undefined) {
      statusUpdate$ = this.http.patch(`${this.apiUrl}/${id}/status`, { isActive: updates.active });
    }

    // 3. Update Doctor Profile (CMP/Status) if changed
    let profileUpdate$ = new Observable(obs => { obs.next(null); obs.complete(); });
    const doctorId = updates.doctorId || this.doctors().find(d => d.id === id)?.doctorId;

    if (doctorId) {
      const tasks: Observable<any>[] = [];

      // Update CMP/DNI
      if (updates.cmp !== undefined || updates.dni !== undefined) {
        tasks.push(this.http.put(`${this.doctorsUrl}/${doctorId}`, {
          cmp: updates.cmp || this.doctors().find(d => d.id === id)?.cmp,
          dni: updates.dni || this.doctors().find(d => d.id === id)?.dni
        }));
      }

      // Update Doctor Profile Status
      if (updates.active !== undefined) {
        tasks.push(this.http.patch(`${this.doctorsUrl}/${doctorId}/status`, { isActive: updates.active }));
      }

      if (tasks.length > 0) {
        profileUpdate$ = forkJoin(tasks);
      }
    }

    return forkJoin([userUpdate$, statusUpdate$, profileUpdate$]).pipe(
      tap(() => this.refreshDoctors())
    );
  }

  deleteDoctor(id: string) {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.refreshDoctors())
    );
  }

  getDoctorReviews(doctorId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.doctorsUrl}/${doctorId}/reviews`);
  }

  calculateNPS(reviews: any[]): number {
    if (!reviews || reviews.length === 0) return 0;

    // Promoters: 9-10
    // Passives: 7-8
    // Detractors: 0-6
    const promoters = reviews.filter(r => r.score >= 9).length;
    const detractors = reviews.filter(r => r.score <= 6).length;

    const nps = ((promoters - detractors) / reviews.length) * 100;
    return Math.round(nps);
  }

  isProfileComplete(doctor: Doctor): boolean {
    // Required fields: Full Name, CMP, DNI, Phone, Email
    return !!(
      doctor.fullName &&
      doctor.cmp &&
      doctor.dni &&
      doctor.phone &&
      doctor.email
    );
  }
}

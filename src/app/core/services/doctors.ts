import { Injectable, signal, inject, effect, untracked } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService, User } from '../auth/auth.service';
import { tap, switchMap, map } from 'rxjs/operators';
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
  specialties?: any[]; // Array of specialties mapped from backend
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
  private authService = inject(AuthService);
  private apiUrl = `${environment.apiUrl}/iam/users`; // Uses Users API (Doctors are Users with role)
  private rolesUrl = `${environment.apiUrl}/iam/roles`;
  private doctorsUrl = `${environment.apiUrl}/catalog/doctors`;



  doctors = signal<Doctor[]>([]);
  selectableDoctors = signal<Doctor[]>([]);

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      untracked(() => {
        if (user) {
          this.refreshDoctors();
          this.refreshSelectableDoctors();
        } else {
          this.doctors.set([]);
          this.selectableDoctors.set([]);
        }
      });
    });
  }

  refreshDoctors() {
    let params = new HttpParams().set('page', '0').set('size', '1000');

    this.http.get<any>(`${this.doctorsUrl}/with-users`, { params }).subscribe({
      next: (data) => {
        let docs = data.content.map((d: any) => ({
          ...d,
          id: d.userId, // Map userId to id for general profile logic
          doctorId: d.doctorId, // Correctly map Doctor Profile ID from doctorId field
          specialties: d.specialties || [],
          active: d.isActive ?? d.active !== false
        }));

        this.doctors.set(docs);
      },
      error: (e) => console.error(e)
    });
  }

  getAllDoctorsForValidation(): Observable<Doctor[]> {
    // Fetch a large page size to validate against all doctors
    const params = new HttpParams().set('page', '0').set('size', '10000');
    return this.http.get<any>(`${this.doctorsUrl}/with-users`, { params }).pipe(
      map(data => data.content.map((d: any) => ({
        ...d,
        id: d.userId,
        doctorId: d.doctorId,
        active: d.isActive
      } as Doctor)))
    );
  }

  refreshSelectableDoctors() {
    this.http.get<any[]>(`${this.doctorsUrl}/selectable`).subscribe({
      next: (data) => {
        // Backend maps userId internally but sends it as part of doctor representation? Assuming yes.
        this.selectableDoctors.set(data.map(d => ({
          ...d,
          id: d.userId || d.id, // Ensure ID continuity
          active: d.isActive ?? d.active
        })));
      },
      error: (err) => console.error('Error fetching selectable doctors:', err)
    });
  }

  getDoctors() {
    return this.doctors();
  }

  addDoctor(doctor: any) {
    // 1. Get DOCTOR role ID
    return this.http.get<any[]>(this.rolesUrl).pipe(
      map(roles => {
        const doctorRole = roles.find(r => r.roleKey.toUpperCase() === 'DOCTOR');
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
          photoUrl: doctor.photoUrl,
          clinicId: this.authService.currentUser()?.clinicId
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
      tap(() => {
        this.refreshDoctors();
        this.refreshSelectableDoctors();
      })
    );
  }

  updateDoctor(id: string, updates: Partial<Doctor>) {
    const currentDoctor = this.doctors().find(d => d.id === id);
    if (!currentDoctor) {
      return new Observable(obs => { obs.error('Doctor no encontrado'); obs.complete(); });
    }

    const userUpdates: any = {};
    let hasUserFieldUpdates = false;

    // Only update IAM user fields if they actually changed
    if (updates.fullName && updates.fullName !== currentDoctor.fullName) { userUpdates.fullName = updates.fullName; hasUserFieldUpdates = true; }
    if (updates.email && updates.email !== currentDoctor.email) { userUpdates.email = updates.email; hasUserFieldUpdates = true; }
    if (updates.phone && updates.phone !== currentDoctor.phone) { userUpdates.phone = updates.phone; hasUserFieldUpdates = true; }
    if (updates.dni && updates.dni !== currentDoctor.dni) { userUpdates.dni = updates.dni; hasUserFieldUpdates = true; }
    if (updates.photoUrl && updates.photoUrl !== currentDoctor.photoUrl && updates.photoUrl.startsWith('data:image')) {
      userUpdates.photoUrl = updates.photoUrl;
      hasUserFieldUpdates = true;
    }

    let userUpdate$: Observable<any> = new Observable(obs => { obs.next(null); obs.complete(); });

    if (hasUserFieldUpdates) {
      userUpdates.fullName = userUpdates.fullName || currentDoctor.fullName;
      userUpdates.email = userUpdates.email || currentDoctor.email;
      userUpdates.phone = userUpdates.phone || currentDoctor.phone;
      userUpdates.dni = userUpdates.dni || currentDoctor.dni;

      // Extract roleIds from the roles object if present
      let existingRoles: string[] = [];
      if (currentDoctor.roles && Array.isArray(currentDoctor.roles)) {
        existingRoles = currentDoctor.roles.map((r: any) => r.roleId || r.id);
      } else if (currentDoctor.roleIds && Array.isArray(currentDoctor.roleIds)) {
        existingRoles = currentDoctor.roleIds;
      }

      if (existingRoles.length > 0) {
        userUpdates.roleIds = existingRoles;
      }

      // If we couldn't find a role, we must fetch the DOCTOR role from the server before PUT
      if (!userUpdates.roleIds || userUpdates.roleIds.length === 0) {
        userUpdate$ = this.http.get<any[]>(this.rolesUrl).pipe(
          switchMap(roles => {
            const doctorRole = roles.find(r => r.roleKey?.toUpperCase() === 'DOCTOR' || r.name?.toUpperCase() === 'DOCTOR');
            if (doctorRole) {
              userUpdates.roleIds = [doctorRole.roleId || doctorRole.id];
            } else {
              userUpdates.roleIds = [""]; // Fallback, though it shouldn't happen
            }
            return this.http.put<any>(`${this.apiUrl}/${id}`, userUpdates);
          })
        );
      } else {
        userUpdate$ = this.http.put<any>(`${this.apiUrl}/${id}`, userUpdates);
      }
    }

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
      tap(() => {
        this.refreshDoctors();
        this.refreshSelectableDoctors();
      })
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

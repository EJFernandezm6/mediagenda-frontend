import { Injectable, signal, inject, effect } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { tap, map } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';

export interface Specialty {
  specialtyId: string;
  name: string;
  description: string;
  active: boolean; // Changed from isActive to match User/Doctor convention
}

@Injectable({
  providedIn: 'root'
})
export class SpecialtiesService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = `${environment.apiUrl}/catalog/specialties`;


  specialties = signal<Specialty[]>([]); // To maintain backward compat for now, but will hold all specialties instead

  constructor() {
    effect(() => {
      if (this.authService.currentUser()) {
        this.refreshSpecialties();
      } else {
        this.specialties.set([]);
      }
    });
  }

  refreshSpecialties() {
    let params = new HttpParams().set('page', '0').set('size', '1000'); // Fetch all

    this.http.get<any>(this.apiUrl, { params }).pipe(
      map((data: any) => {
        let items: any[] = data.content || (Array.isArray(data) ? data : []);

        return items.map(s => ({
          ...s,
          active: s.isActive ?? s.active ?? false
        }) as Specialty);
      })
    ).subscribe((data: Specialty[]) => {
      this.specialties.set(data);
    });
  }

  getSpecialties() {
    return this.specialties();
  }

  addSpecialty(specialty: Omit<Specialty, 'specialtyId'>) {
    const payload = { ...specialty, isActive: specialty.active };
    return this.http.post<Specialty>(this.apiUrl, payload).pipe(
      tap(() => this.refreshSpecialties())
    );
  }

  updateSpecialty(id: string, updates: Partial<Specialty>) {
    const payload = { ...updates };
    if (updates.active !== undefined) {
      (payload as any).isActive = updates.active;
    }
    return this.http.put<Specialty>(`${this.apiUrl}/${id}`, payload).pipe(
      tap(() => this.refreshSpecialties())
    );
  }

  updateStatus(id: string, active: boolean) {
    return this.http.patch<void>(`${this.apiUrl}/${id}/status`, { isActive: active }).pipe(
      tap(() => this.refreshSpecialties())
    );
  }

  deleteSpecialty(id: string) {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.refreshSpecialties())
    );
  }
}

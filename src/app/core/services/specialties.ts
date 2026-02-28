import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { tap, map } from 'rxjs/operators';

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
  private apiUrl = `${environment.apiUrl}/catalog/specialties`;


  specialties = signal<Specialty[]>([]);
  totalElements = signal<number>(0);

  constructor() {
    this.refreshSpecialties(0, 10, '');
  }

  refreshSpecialties(page: number = 0, size: number = 10, search: string = '') {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    if (search) params = params.set('search', search);

    this.http.get<any>(this.apiUrl, { params }).pipe(
      map((data: any) => {
        return {
          ...data,
          content: data.content.map((s: any) => ({
            ...s,
            active: s.isActive ?? s.active ?? false
          }) as Specialty)
        };
      })
    ).subscribe((data: any) => {
      this.specialties.set(data.content);
      this.totalElements.set(data.totalElements);
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

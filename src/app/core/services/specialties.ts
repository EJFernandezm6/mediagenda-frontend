import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { tap } from 'rxjs/operators';

export interface Specialty {
  specialtyId: string;
  name: string;
  description: string;
  active: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SpecialtiesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/specialties`;

  specialties = signal<Specialty[]>([]);

  constructor() {
    this.refreshSpecialties();
  }

  refreshSpecialties() {
    this.http.get<Specialty[]>(this.apiUrl).subscribe(data => {
      this.specialties.set(data);
    });
  }

  getSpecialties() {
    return this.specialties();
  }

  addSpecialty(specialty: Omit<Specialty, 'specialtyId'>) {
    return this.http.post<Specialty>(this.apiUrl, specialty).pipe(
      tap(() => this.refreshSpecialties())
    );
  }

  updateSpecialty(id: string, updates: Partial<Specialty>) {
    return this.http.put<Specialty>(`${this.apiUrl}/${id}`, updates).pipe(
      tap(() => this.refreshSpecialties())
    );
  }

  deleteSpecialty(id: string) {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.refreshSpecialties())
    );
  }
}

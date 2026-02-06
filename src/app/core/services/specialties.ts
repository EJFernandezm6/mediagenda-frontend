import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface Specialty {
  id: string;
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

  addSpecialty(specialty: Omit<Specialty, 'id'>) {
    this.http.post<Specialty>(this.apiUrl, specialty).subscribe(newSpec => {
      this.specialties.update(list => [...list, newSpec]);
    });
  }

  updateSpecialty(id: string, updates: Partial<Specialty>) {
    this.http.put<Specialty>(`${this.apiUrl}/${id}`, updates).subscribe(updated => {
      this.specialties.update(list =>
        list.map(s => s.id === id ? updated : s)
      );
    });
  }

  deleteSpecialty(id: string) {
    this.http.delete(`${this.apiUrl}/${id}`).subscribe(() => {
      this.specialties.update(list => list.filter(s => s.id !== id));
    });
  }
}

import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { tap } from 'rxjs';

export interface DoctorSpecialty {
    doctorSpecialtyId?: string;
    doctorId: string;
    specialtyId: string;
    cost: number;
    durationMinutes: number;
}

@Injectable({
    providedIn: 'root'
})
export class DoctorSpecialtyService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/catalog`;

    associations = signal<DoctorSpecialty[]>([]);

    constructor() {
        this.refreshAssociations();
    }

    refreshAssociations() {
        this.http.get<DoctorSpecialty[]>(`${this.apiUrl}/doctor-specialties`).subscribe(data => {
            this.associations.set(data);
        });
    }

    addAssociation(doctorId: string, association: any) {
        return this.http.post<DoctorSpecialty>(`${this.apiUrl}/doctors/${doctorId}/specialties`, association).pipe(
            tap(() => this.refreshAssociations())
        );
    }

    removeAssociation(id: string) {
        return this.http.delete(`${this.apiUrl}/doctor-specialties/${id}`).pipe(
            tap(() => this.refreshAssociations())
        );
    }

    updateAssociation(id: string, updated: any) {
        return this.http.put<DoctorSpecialty>(`${this.apiUrl}/doctor-specialties/${id}`, updated).pipe(
            tap(() => this.refreshAssociations())
        );
    }

    getSpecialtiesForDoctor(doctorId: string) {
        return this.associations().filter(a => a.doctorId === doctorId);
    }
}

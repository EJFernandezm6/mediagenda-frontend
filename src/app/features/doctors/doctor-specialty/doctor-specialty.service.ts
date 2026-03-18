import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { tap } from 'rxjs';

export interface DoctorSpecialty {
    doctorSpecialtyId?: string;
    doctorId: string;
    doctor_id?: string; // Support for snake_case from backend
    specialtyId: string;
    specialty_id?: string; // Support for snake_case from backend
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
        const params = { page: '0', size: '1000' };
        this.http.get<any[]>(`${this.apiUrl}/doctor-specialties`, { params }).subscribe(data => {
            const content = (data as any).content || (Array.isArray(data) ? data : []);
            const mapped = content.map((a: any) => ({
                ...a,
                doctorId: a.doctorId || a.doctor_id,
                specialtyId: a.specialtyId || a.specialty_id,
                doctorSpecialtyId: a.doctorSpecialtyId || a.id
            }));
            this.associations.set(mapped);
        });
    }

    getAllAssociations() {
        return this.http.get<DoctorSpecialty[]>(`${this.apiUrl}/doctor-specialties`);
    }

    addAssociation(doctorId: string, association: any) {
        // Clean payload: Remove doctorId as it sends in URL, keep relevant fields
        const payload = {
            specialtyId: association.specialtyId,
            cost: association.cost,
            durationMinutes: association.durationMinutes
        };
        return this.http.post<DoctorSpecialty>(`${this.apiUrl}/doctors/${doctorId}/specialties`, payload).pipe(
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

    getSpecialtiesForDoctor(doctorId: any) {
        if (!doctorId) return [];
        const idStr = String(doctorId).trim();
        return this.associations().filter(a => 
            String(a.doctorId || '').trim() === idStr || 
            String(a.doctor_id || '').trim() === idStr
        );
    }
}

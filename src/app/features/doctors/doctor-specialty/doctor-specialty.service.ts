import { Injectable, signal } from '@angular/core';

export interface DoctorSpecialty {
    doctorId: string;
    specialtyId: string;
    cost: number;
    durationMinutes: number;
}

@Injectable({
    providedIn: 'root'
})
export class DoctorSpecialtyService {
    // Mock Relationships
    private mockAssociations: DoctorSpecialty[] = [
        { doctorId: 'd1', specialtyId: '1', cost: 150, durationMinutes: 30 }, // Juan - Cardio
        { doctorId: 'd2', specialtyId: '1', cost: 150, durationMinutes: 30 }, // Maria - Cardio
        { doctorId: 'd3', specialtyId: '1', cost: 150, durationMinutes: 30 }, // Carlos - Cardio
        { doctorId: 'd2', specialtyId: '2', cost: 120, durationMinutes: 20 }, // Maria - Pedia
    ];

    associations = signal<DoctorSpecialty[]>(this.mockAssociations);

    getAssociations() {
        return this.associations();
    }

    addAssociation(association: DoctorSpecialty) {
        this.associations.update(list => [...list, association]);
    }

    removeAssociation(doctorId: string, specialtyId: string) {
        this.associations.update(list =>
            list.filter(a => !(a.doctorId === doctorId && a.specialtyId === specialtyId))
        );
    }

    updateAssociation(original: DoctorSpecialty, updated: DoctorSpecialty) {
        this.associations.update(list =>
            list.map(a =>
                (a.doctorId === original.doctorId && a.specialtyId === original.specialtyId)
                    ? updated
                    : a
            )
        );
    }

    getSpecialtiesForDoctor(doctorId: string) {
        return this.associations().filter(a => a.doctorId === doctorId);
    }
}

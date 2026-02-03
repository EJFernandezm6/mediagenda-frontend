import { Injectable, signal } from '@angular/core';

export interface Doctor {
  id: string;
  fullName: string;
  cmp: string; // Colegiatura
  email: string;
  phone: string;
  photoUrl: string;
  rating: number;
  reviewsCount: number;
  active: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class DoctorsService {
  private mockDoctors: Doctor[] = [
    {
      id: 'd1',
      fullName: 'Dr. Juan Pérez',
      cmp: '12345',
      email: 'juan@clinic.com',
      phone: '999888777',
      photoUrl: 'https://ui-avatars.com/api/?name=Juan+Perez&background=random',
      rating: 4.8,
      reviewsCount: 120,
      active: true
    },
    {
      id: 'd2',
      fullName: 'Dra. Maria López',
      cmp: '67890',
      email: 'maria@clinic.com',
      phone: '999111222',
      photoUrl: 'https://ui-avatars.com/api/?name=Maria+Lopez&background=random',
      rating: 4.9,
      reviewsCount: 85,
      active: true
    },
    {
      id: 'd3',
      fullName: 'Dr. Carlos Mendoza',
      cmp: '11223',
      email: 'carlos@clinic.com',
      phone: '999333444',
      photoUrl: 'https://ui-avatars.com/api/?name=Carlos+Mendoza&background=random',
      rating: 4.5,
      reviewsCount: 40,
      active: false
    }
  ];

  doctors = signal<Doctor[]>(this.mockDoctors);

  getDoctors() {
    return this.doctors();
  }

  addDoctor(doctor: Omit<Doctor, 'id' | 'rating' | 'reviewsCount'>) {
    const newDoc: Doctor = {
      ...doctor,
      id: Math.random().toString(36).substr(2, 9),
      rating: 0,
      reviewsCount: 0
    };
    this.doctors.update(list => [...list, newDoc]);
  }

  updateDoctor(id: string, updates: Partial<Doctor>) {
    this.doctors.update(list =>
      list.map(d => d.id === id ? { ...d, ...updates } : d)
    );
  }

  deleteDoctor(id: string) {
    this.doctors.update(list => list.filter(d => d.id !== id));
  }
}

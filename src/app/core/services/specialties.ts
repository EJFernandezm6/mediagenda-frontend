import { Injectable, signal } from '@angular/core';

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
  // Mock Data
  private mockSpecialties: Specialty[] = [
    { id: '1', name: 'Cardiología', description: 'Enfermedades del corazón', active: true },
    { id: '2', name: 'Pediatría', description: 'Atención a niños', active: true },
    { id: '3', name: 'Dermatología', description: 'Cuidado de la piel', active: true },
    { id: '4', name: 'Ginecología', description: 'Salud femenina', active: true },
    { id: '5', name: 'Medicina General', description: 'Atención primaria', active: true }
  ];

  specialties = signal<Specialty[]>(this.mockSpecialties);

  getSpecialties() {
    return this.specialties();
  }

  addSpecialty(specialty: Omit<Specialty, 'id'>) {
    const newSpec = { ...specialty, id: Math.random().toString(36).substr(2, 9) };
    this.specialties.update(list => [...list, newSpec]);
  }

  updateSpecialty(id: string, updates: Partial<Specialty>) {
    this.specialties.update(list =>
      list.map(s => s.id === id ? { ...s, ...updates } : s)
    );
  }

  deleteSpecialty(id: string) {
    this.specialties.update(list => list.filter(s => s.id !== id));
  }
}

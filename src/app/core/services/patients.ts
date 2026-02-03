import { Injectable, signal } from '@angular/core';

export interface Patient {
  id: string;
  fullName: string;
  dni: string;
  email: string;
  phone: string;
  age: number;
  gender: 'M' | 'F' | 'O';
  lastVisit?: string;
}

export interface Consultation {
  id: string;
  date: string;       // ISO Date
  doctorId: string;   // Reference to doctor
  specialtyId: string;
  diagnosis: string;
  treatment: string;
  notes: string;
  status: 'COMPLETED' | 'CANCELLED';
}

@Injectable({
  providedIn: 'root'
})
export class PatientsService {
  private mockPatients: Patient[] = [
    { id: 'p1', fullName: 'Ana García', dni: '12345678', email: 'ana@gmail.com', phone: '987654321', age: 28, gender: 'F', lastVisit: '2025-12-10' },
    { id: 'p2', fullName: 'Luis Torres', dni: '87654321', email: 'luis@gmail.com', phone: '912345678', age: 45, gender: 'M', lastVisit: '2026-01-15' },
    { id: 'p3', fullName: 'Carla Méndez', dni: '45612378', email: 'carla@hotmail.com', phone: '998877665', age: 34, gender: 'F', lastVisit: '2026-01-20' },
    { id: 'p4', fullName: 'Jorge Ruiz', dni: '11223344', email: 'jorge@yahoo.com', phone: '955666777', age: 60, gender: 'M', lastVisit: '2025-11-05' },
  ];

  // Mock History (Mapped by Patient ID)
  private mockHistory: Record<string, Consultation[]> = {
    'p1': [
      { id: 'c1', date: '2025-12-10', doctorId: 'd1', specialtyId: '1', diagnosis: 'Arritmia leve', treatment: 'Observación y dieta', notes: 'Paciente reporta palpitaciones.', status: 'COMPLETED' },
      { id: 'c2', date: '2025-06-15', doctorId: 'd5', specialtyId: '5', diagnosis: 'Resfriado común', treatment: 'Paracetamol 500mg', notes: 'Fiebre leve.', status: 'COMPLETED' }
    ],
    'p2': [
      { id: 'c3', date: '2026-01-15', doctorId: 'd3', specialtyId: '3', diagnosis: 'Dermatitis solar', treatment: 'Crema hidratante y bloqueador', notes: 'Exposición prolongada al sol.', status: 'COMPLETED' }
    ]
  };

  patients = signal<Patient[]>(this.mockPatients);

  getPatients() {
    return this.patients();
  }

  getPatient(id: string) {
    return this.patients().find(p => p.id === id);
  }

  getPatientHistory(patientId: string): Consultation[] {
    return this.mockHistory[patientId] || [];
  }

  addPatient(patient: Omit<Patient, 'id'>) {
    const newPatient = { ...patient, id: Math.random().toString(36).substr(2, 9) };
    this.patients.update(list => [...list, newPatient]);
  }

  updatePatient(id: string, updates: Partial<Patient>) {
    this.patients.update(list =>
      list.map(p => p.id === id ? { ...p, ...updates } : p)
    );
  }
}

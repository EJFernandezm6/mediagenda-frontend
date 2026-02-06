import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface SystemSettings {
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string;
  workingDays: number[];
  clinicOpenTime: string; // HH:mm
  clinicCloseTime: string; // HH:mm
  breakStartTime: string; // HH:mm
  breakEndTime: string; // HH:mm
  defaultAppointmentDuration: number;
  currency: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConfigurationService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/settings`;

  settings = signal<SystemSettings>({
    clinicName: 'MediAgenda Clinic',
    clinicAddress: 'Av. Larco 123, Miraflores',
    clinicPhone: '(01) 555-1234',
    workingDays: [1, 2, 3, 4, 5, 6], // Mon-Sat
    clinicOpenTime: '08:00',
    clinicCloseTime: '20:00',
    breakStartTime: '13:00',
    breakEndTime: '14:00',
    defaultAppointmentDuration: 30,
    currency: 'PEN'
  });

  constructor() {
    this.refreshSettings();
  }

  refreshSettings() {
    this.http.get<SystemSettings>(this.apiUrl).subscribe({
      next: (data) => {
        // Backend might ensure fields match.
        this.settings.set(data);
      },
      error: (err) => {
        console.error('Failed to load settings', err);
        // Keep defaults if failed
      }
    });
  }

  updateSettings(newSettings: SystemSettings) {
    // Optimistic update
    this.settings.set(newSettings);
    // Backend update?
  }

  // Helpers
  getWorkingHours() {
    const s = this.settings();
    return { start: s.clinicOpenTime, end: s.clinicCloseTime };
  }
}

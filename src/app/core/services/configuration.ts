import { Injectable, signal } from '@angular/core';

export interface GlobalSettings {
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string;
  emailNotifications: boolean;
  whatsappNotifications: boolean;
  stripePublicKey: string;
  currency: 'USD' | 'PEN';
  workingDays: number[]; // 0=Sun, 1=Mon...
  defaultAppointmentDuration: number; // Minutes
  clinicOpenTime: string; // "08:00"
  clinicCloseTime: string; // "20:00"
  breakStartTime: string; // "13:00"
  breakEndTime: string; // "14:00"
}

@Injectable({
  providedIn: 'root'
})
export class ConfigurationService {
  private defaultSettings: GlobalSettings = {
    clinicName: 'MediAgenda Clinic',
    clinicAddress: 'Av. Principal 123, Miraflores',
    clinicPhone: '+51 987 654 321',
    emailNotifications: true,
    whatsappNotifications: false,
    stripePublicKey: '',
    currency: 'PEN',
    workingDays: [1, 2, 3, 4, 5, 6], // Mon-Sat
    defaultAppointmentDuration: 30,
    clinicOpenTime: '08:00',
    clinicCloseTime: '20:00',
    breakStartTime: '13:00',
    breakEndTime: '14:00'
  };

  settings = signal<GlobalSettings>(this.defaultSettings);

  updateSettings(newSettings: Partial<GlobalSettings>) {
    this.settings.update(current => ({ ...current, ...newSettings }));
    console.log('Settings updated:', this.settings());
  }

  getSettings() {
    return this.settings();
  }
}

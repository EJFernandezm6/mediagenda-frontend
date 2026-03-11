import { Injectable, signal, inject, effect } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { tap } from 'rxjs';
import { AuthService } from '../auth/auth.service';

export interface Schedule {
  id?: string;
  doctorId: string;
  specialtyId: string;
  date: string; // specific date YYYY-MM-DD
  startTime: string; // "09:00"
  endTime: string; // "13:00"
  modality: 'PRESENCIAL' | 'VIRTUAL' | string;
  schedule_type?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SchedulesService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = `${environment.apiUrl}/scheduling`;


  schedules = signal<Schedule[]>([]);

  constructor() {
    effect(() => {
      if (this.authService.currentUser()) {
        this.refreshSchedules();
      } else {
        this.schedules.set([]);
      }
    });
  }

  refreshSchedules(filters?: { doctorId?: string, specialtyId?: string }) {
    let url = `${this.apiUrl}/schedules`;
    if (filters?.doctorId) {
      url = `${this.apiUrl}/doctors/${filters.doctorId}/schedules`;
    }

    this.http.get<Schedule[]>(url).pipe(
      tap(data => console.log('RAW SCHEDULES PAYLOAD FROM BACKEND:', data))
    ).subscribe(data => {
      if (filters?.doctorId) {
        // We only fetched for one doctor. Don't overwrite everyone else. 
        // Remove old schedules for this doctor, and append the new ones.
        const currentRest = this.schedules().filter(s => s.doctorId !== filters.doctorId);
        this.schedules.set([...currentRest, ...data]);
      } else {
        // Fetched for all doctors
        this.schedules.set(data);
      }
    });
  }

  getSchedules() {
    return this.schedules();
  }

  addSchedule(doctorId: string, schedules: any[]) {
    return this.http.post<Schedule[]>(`${this.apiUrl}/doctors/${doctorId}/schedules`, { items: schedules }).pipe(
      tap(() => this.refreshSchedules({ doctorId }))
    );
  }

  removeSchedule(scheduleId: string, doctorId: string) {
    return this.http.delete(`${this.apiUrl}/schedules/${scheduleId}`).pipe(
      tap(() => this.refreshSchedules({ doctorId }))
    );
  }

  getSchedulesForDoctor(doctorId: string, specialtyId: string) {
    // We can filter client side or trigger a refresh with params.
    // Client side filter is instant if we already have data.
    return this.schedules().filter(s => s.doctorId === doctorId && s.specialtyId === specialtyId);
  }
}

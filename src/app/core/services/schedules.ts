import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { tap } from 'rxjs';

export interface Schedule {
  id?: string;
  doctorId: string;
  specialtyId: string;
  dayOfWeek: number; // 0=Sunday, 1=Monday... (Keep for fallback/recurring if needed, or derived)
  date?: string; // specific date YYYY-MM-DD
  startTime: string; // "09:00"
  endTime: string; // "13:00"
}

@Injectable({
  providedIn: 'root'
})
export class SchedulesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/scheduling`;


  schedules = signal<Schedule[]>([]);

  constructor() {
    this.refreshSchedules();
  }

  refreshSchedules(filters?: { doctorId?: string, specialtyId?: string }) {
    if (!filters?.doctorId) {
      console.warn('Need a doctorId to fetch schedules');
      return;
    }

    this.http.get<Schedule[]>(`${this.apiUrl}/doctors/${filters.doctorId}/schedules`).subscribe(data => {
      this.schedules.set(data);
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

  removeSchedule(schedule: Schedule) {
    if (!schedule.id || !schedule.doctorId) return;

    this.http.delete(`${this.apiUrl}/schedules/${schedule.id}`).subscribe(() => {
      this.refreshSchedules({ doctorId: schedule.doctorId });
    });
  }

  getSchedulesForDoctor(doctorId: string, specialtyId: string) {
    // We can filter client side or trigger a refresh with params.
    // Client side filter is instant if we already have data.
    return this.schedules().filter(s => s.doctorId === doctorId && s.specialtyId === specialtyId);
  }
}

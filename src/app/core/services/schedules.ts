import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { tap } from 'rxjs';

export interface Schedule {
  id?: string;
  doctorId: string;
  specialtyId: string;
  date: string; // specific date YYYY-MM-DD
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
    let url = `${this.apiUrl}/schedules`;
    if (filters?.doctorId) {
      url = `${this.apiUrl}/doctors/${filters.doctorId}/schedules`;
    }

    this.http.get<Schedule[]>(url).subscribe(data => {
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

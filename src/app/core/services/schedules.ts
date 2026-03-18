import { Injectable, signal, inject, effect } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { tap } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';

export interface Schedule {
  id?: string;
  doctorId: string;
  doctor_id?: string; // Support for snake_case from backend
  specialtyId: string;
  specialty_id?: string; // Support for snake_case from backend
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

  addRecurringSchedule(doctorId: string, recurrence: any) {
    return this.http.post<Schedule[]>(`${this.apiUrl}/doctors/${doctorId}/schedules/recurring`, recurrence).pipe(
      tap(() => this.refreshSchedules({ doctorId }))
    );
  }

  removeSchedule(scheduleId: string, doctorId: string) {
    return this.http.delete(`${this.apiUrl}/schedules/${scheduleId}`).pipe(
      tap(() => this.refreshSchedules({ doctorId }))
    );
  }

  getValidEndTimes(doctorId: string, specialtyId: string, date: string, startTime: string) {
    return this.http.post<{ endTimes: string[] }>(`${this.apiUrl}/valid-end-times`, {
      doctorId,
      specialtyId,
      date,
      startTime
    }).pipe(
      map(res => res.endTimes)
    );
  }

  getSchedulesForDoctor(doctorId: any, specialtyId: any) {
    if (!doctorId || !specialtyId) return [];
    
    const dIdStr = String(doctorId).trim();
    const sIdStr = String(specialtyId).trim();

    return this.schedules().filter(s => {
      const sDocId = String(s.doctorId || s.doctor_id || '').trim();
      const sSpecId = String(s.specialtyId || s.specialty_id || '').trim();
      return sDocId === dIdStr && sSpecId === sIdStr;
    });
  }
}

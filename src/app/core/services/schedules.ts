import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

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
  private apiUrl = `${environment.apiUrl}/schedules`;

  schedules = signal<Schedule[]>([]);

  constructor() {
    this.refreshSchedules();
  }

  refreshSchedules(filters?: { doctorId?: string, specialtyId?: string }) {
    let params = new HttpParams();
    if (filters?.doctorId) params = params.set('doctorId', filters.doctorId);
    if (filters?.specialtyId) params = params.set('specialtyId', filters.specialtyId);

    this.http.get<Schedule[]>(this.apiUrl, { params }).subscribe(data => {
      this.schedules.set(data);
    });
  }

  getSchedules() {
    return this.schedules();
  }

  addSchedule(schedule: Schedule) {
    this.http.post<Schedule>(this.apiUrl, schedule).subscribe(newSchedule => {
      this.schedules.update(list => [...list, newSchedule]);
    });
  }

  removeSchedule(schedule: Schedule) {
    // If we have an ID, use it. Otherwise, we might need a specific endpoint or params.
    // Assuming backend might take query params for deletion or an ID is needed.
    // For now, let's try to delete by ID if present, otherwise log warning or try composite.
    if (schedule.id) {
      this.http.delete(`${this.apiUrl}/${schedule.id}`).subscribe(() => {
        this.schedules.update(list => list.filter(s => s.id !== schedule.id));
      });
    } else {
      console.warn('Cannot delete schedule without ID');
      // Fallback: maybe try to delete by matching fields via query params? 
      // leaving naive implementation for now or asking user might be better.
      // But to be "agentic", I will try to support passing params to delete.
      let params = new HttpParams()
        .set('doctorId', schedule.doctorId)
        .set('specialtyId', schedule.specialtyId)
        .set('dayOfWeek', schedule.dayOfWeek.toString())
        .set('startTime', schedule.startTime);

      this.http.delete(this.apiUrl, { params }).subscribe(() => {
        // Optimistically remove from list matching the fields
        this.schedules.update(list => list.filter(s =>
          !(s.doctorId === schedule.doctorId &&
            s.specialtyId === schedule.specialtyId &&
            s.dayOfWeek === schedule.dayOfWeek &&
            s.startTime === schedule.startTime)
        ));
      });
    }
  }

  getSchedulesForDoctor(doctorId: string, specialtyId: string) {
    // We can filter client side or trigger a refresh with params.
    // Client side filter is instant if we already have data.
    return this.schedules().filter(s => s.doctorId === doctorId && s.specialtyId === specialtyId);
  }
}

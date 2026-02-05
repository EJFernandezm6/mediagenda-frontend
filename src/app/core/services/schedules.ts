import { Injectable, signal } from '@angular/core';

export interface Schedule {
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
  private mockSchedules: Schedule[] = [
    // Existing d1 schedules
    { doctorId: 'd1', specialtyId: '1', dayOfWeek: 1, startTime: '09:00', endTime: '13:00' }, // Recurring Mon
    { doctorId: 'd1', specialtyId: '1', dayOfWeek: 3, startTime: '15:00', endTime: '19:00' }, // Recurring Wed

    // Demonstrate 3 Doctors at same time (Monday 10:00 - 12:00)
    // d1 is already working 9-13 (covers 10-12)
    { doctorId: 'd2', specialtyId: '1', dayOfWeek: 1, startTime: '10:00', endTime: '12:00' },
    { doctorId: 'd3', specialtyId: '1', dayOfWeek: 1, startTime: '10:00', endTime: '12:00' },

    // Example specific date
    { doctorId: 'd1', specialtyId: '1', dayOfWeek: 5, date: '2026-02-06', startTime: '08:00', endTime: '12:00' }
  ];

  schedules = signal<Schedule[]>(this.mockSchedules);

  getSchedules() {
    return this.schedules();
  }

  addSchedule(schedule: Schedule) {
    this.schedules.update(list => [...list, schedule]);
  }

  removeSchedule(schedule: Schedule) {
    this.schedules.update(list =>
      list.filter(s =>
        !(s.doctorId === schedule.doctorId &&
          s.specialtyId === schedule.specialtyId &&
          s.dayOfWeek === schedule.dayOfWeek &&
          s.startTime === schedule.startTime)
      )
    );
  }

  getSchedulesForDoctor(doctorId: string, specialtyId: string) {
    return this.schedules().filter(s => s.doctorId === doctorId && s.specialtyId === specialtyId);
  }
}

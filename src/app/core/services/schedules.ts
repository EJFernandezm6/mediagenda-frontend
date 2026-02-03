import { Injectable, signal } from '@angular/core';

export interface Schedule {
  doctorId: string;
  specialtyId: string;
  dayOfWeek: number; // 0=Sunday, 1=Monday...
  startTime: string; // "09:00"
  endTime: string; // "13:00"
}

@Injectable({
  providedIn: 'root'
})
export class SchedulesService {
  private mockSchedules: Schedule[] = [
    { doctorId: 'd1', specialtyId: '1', dayOfWeek: 1, startTime: '09:00', endTime: '13:00' }, // Mon
    { doctorId: 'd1', specialtyId: '1', dayOfWeek: 3, startTime: '15:00', endTime: '19:00' }, // Wed
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

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppointmentsCalendar } from './appointments-calendar';

describe('AppointmentsCalendar', () => {
  let component: AppointmentsCalendar;
  let fixture: ComponentFixture<AppointmentsCalendar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppointmentsCalendar]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppointmentsCalendar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScheduleConfig } from './schedule-config';

describe('ScheduleConfig', () => {
  let component: ScheduleConfig;
  let fixture: ComponentFixture<ScheduleConfig>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScheduleConfig]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ScheduleConfig);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

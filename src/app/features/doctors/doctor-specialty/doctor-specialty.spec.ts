import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DoctorSpecialty } from './doctor-specialty';

describe('DoctorSpecialty', () => {
  let component: DoctorSpecialty;
  let fixture: ComponentFixture<DoctorSpecialty>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DoctorSpecialty]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DoctorSpecialty);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

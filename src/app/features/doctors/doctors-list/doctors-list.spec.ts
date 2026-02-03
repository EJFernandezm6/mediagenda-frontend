import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DoctorsList } from './doctors-list';

describe('DoctorsList', () => {
  let component: DoctorsList;
  let fixture: ComponentFixture<DoctorsList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DoctorsList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DoctorsList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

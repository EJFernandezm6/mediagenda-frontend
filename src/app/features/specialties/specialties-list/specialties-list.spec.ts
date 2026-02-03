import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SpecialtiesList } from './specialties-list';

describe('SpecialtiesList', () => {
  let component: SpecialtiesList;
  let fixture: ComponentFixture<SpecialtiesList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpecialtiesList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SpecialtiesList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

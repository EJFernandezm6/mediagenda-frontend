import { TestBed } from '@angular/core/testing';

import { Schedules } from './schedules';

describe('Schedules', () => {
  let service: Schedules;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Schedules);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

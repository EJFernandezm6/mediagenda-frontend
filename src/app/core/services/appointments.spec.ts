import { TestBed } from '@angular/core/testing';

import { Appointments } from './appointments';

describe('Appointments', () => {
  let service: Appointments;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Appointments);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

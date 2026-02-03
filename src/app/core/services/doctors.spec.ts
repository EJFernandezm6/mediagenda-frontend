import { TestBed } from '@angular/core/testing';

import { Doctors } from './doctors';

describe('Doctors', () => {
  let service: Doctors;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Doctors);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

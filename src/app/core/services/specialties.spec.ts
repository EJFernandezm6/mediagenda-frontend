import { TestBed } from '@angular/core/testing';

import { Specialties } from './specialties';

describe('Specialties', () => {
  let service: Specialties;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Specialties);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

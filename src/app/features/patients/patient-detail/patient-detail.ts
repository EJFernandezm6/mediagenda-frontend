import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PatientsService, Patient, Consultation } from '../../../core/services/patients';
import { DoctorsService } from '../../../core/services/doctors'; // To show doctor name
import { SpecialtiesService } from '../../../core/services/specialties'; // To show specialty name
import { LucideAngularModule, User, Calendar, FileText, ArrowLeft, Stethoscope, Activity } from 'lucide-angular';

@Component({
  selector: 'app-patient-detail',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterLink],
  templateUrl: './patient-detail.html',
  styleUrl: './patient-detail.css'
})
export class PatientDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private service = inject(PatientsService);
  private doctorService = inject(DoctorsService);
  private specialtyService = inject(SpecialtiesService);

  readonly icons = { User, Calendar, FileText, ArrowLeft, Stethoscope, Activity };

  patient?: Patient;
  history: Consultation[] = [];

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.service.getPatient(id).subscribe(p => this.patient = p);
      this.service.getPatientHistory(id).subscribe(h => this.history = h);
    }
  }

  getDoctorName(id: string) {
    return this.doctorService.doctors().find(d => d.id === id)?.fullName || 'Desconocido';
  }

  getSpecialtyName(id: string) {
    return this.specialtyService.specialties().find(s => s.specialtyId === id)?.name || 'General';
  }
}

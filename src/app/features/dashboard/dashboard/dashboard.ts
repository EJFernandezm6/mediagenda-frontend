import { Component, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Users, CalendarCheck, FileX, DollarSign, Activity, TrendingUp, Clock, CreditCard } from 'lucide-angular';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { AppointmentsService, Appointment } from '../../../core/services/appointments';
import { DoctorSpecialtyService } from '../../doctors/doctor-specialty/doctor-specialty.service';
import { DoctorsService, Doctor } from '../../../core/services/doctors';
import { PatientsService, Patient } from '../../../core/services/patients';
import { ConfigurationService } from '../../../core/services/configuration';
import { forkJoin } from 'rxjs';

import { RecommendationsComponent } from '../recommendations/recommendations.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, NgxChartsModule, RecommendationsComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {
  private appointmentsService = inject(AppointmentsService);
  private doctorSpecialtyService = inject(DoctorSpecialtyService);
  private patientsService = inject(PatientsService);
  private doctorsService = inject(DoctorsService);
  private configService = inject(ConfigurationService);

  // Currency helper
  currencySymbol = computed(() => {
    return this.configService.settings().currency === 'USD' ? '$' : 'S/';
  });

  // Icons
  readonly icons = { Users, CalendarCheck, FileX, DollarSign, Activity, TrendingUp, Clock, CreditCard };

  // KPI Data
  kpis: any[] = [];

  // Chart Data
  patientsByStatus: any[] = [];
  visitsBySpecialty: any[] = [];
  genderDistribution: any[] = [];
  ageDistribution: any[] = [];
  paymentMethods: any[] = [];
  peakDays: any[] = [];
  peakHours: any[] = [];
  revenueBySpecialty: any[] = [];

  topPatients: any[] = [];
  topDoctors: any[] = [];

  // Chart Config
  view: [number, number] = [500, 300];
  gradient = false;
  showLegend = true;
  showLabels = true;
  isDoughnut = true;

  colorScheme: any = {
    domain: ['#10B981', '#F59E0B', '#3B82F6', '#6366F1', '#8B5CF6']
  };

  pieColorScheme: any = {
    domain: ['#10B981', '#F59E0B', '#EF4444']
  };

  ngOnInit() {
    // this.loadDashboardData();
    this.generateMockData();
  }

  generateMockData() {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    // 1. Mock Specialties & Costs
    const specialties = [
      { doctorId: 'd1', specialtyId: 's1', cost: 150, specialtyName: 'Cardiología' },
      { doctorId: 'd2', specialtyId: 's2', cost: 120, specialtyName: 'Pediatría' },
      { doctorId: 'd3', specialtyId: 's3', cost: 200, specialtyName: 'Neurología' },
      { doctorId: 'd4', specialtyId: 's4', cost: 90, specialtyName: 'Medicina General' },
      { doctorId: 'd5', specialtyId: 's5', cost: 180, specialtyName: 'Dermatología' }
    ];

    // 2. Mock Patients
    const patients: Patient[] = Array.from({ length: 50 }, (_, i) => ({
      patientId: `p${i}`,
      clinicId: 'c1',
      fullName: `Paciente ${i + 1}`,
      email: `paciente${i}@test.com`,
      phone: '999999999',
      dni: `100000${i}`,
      gender: i % 2 === 0 ? 'F' : 'M',
      age: 20 + (i % 40) // Ages 20-60
    }));

    // 3. Mock Appointments
    const appointments: Appointment[] = [];
    const statuses = ['CONFIRMED', 'PENDING', 'CANCELLED', 'COMPLETED'];
    const paymentMethods = ['YAPE', 'PLIN', 'CASH', 'CARD'];

    for (let i = 0; i < 200; i++) {
      const date = new Date(currentYear, currentMonth, (i % 28) + 1); // Spread across the month
      const spec = specialties[i % specialties.length];
      const isPaid = Math.random() > 0.3;

      appointments.push({
        id: `a${i}`,
        patientId: `p${i % 50}`,
        patientName: `Paciente ${i % 50 + 1}`,
        doctorId: spec.doctorId,
        doctorName: `Dr. ${spec.specialtyName}`, // Simplified name
        specialtyId: spec.specialtyId,
        specialtyName: spec.specialtyName,
        appointmentDate: date.toISOString().split('T')[0],
        startTime: `${8 + (i % 10)}:00`,
        status: statuses[i % statuses.length],
        paymentStatus: isPaid ? 'PAID' : 'PENDING',
        paymentMethod: isPaid ? paymentMethods[i % paymentMethods.length] : undefined,
        createdAt: date.toISOString()
      } as any);
    }

    // 4. Mock Doctors (for ratings)
    const doctors: any[] = [];

    this.processData(appointments, patients, specialties, doctors);
  }

  loadDashboardData() {
    const today = new Date();

    // To implement "TODOS", let's fetch current Year to have enough data points.
    const yearFrom = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
    const yearTo = new Date(today.getFullYear(), 11, 31).toISOString().split('T')[0];

    // Use specific observables methods
    const appointments$ = this.appointmentsService.getAppointmentsRange(yearFrom, yearTo);
    const patients$ = this.patientsService.getAllPatients();
    const specialties$ = this.doctorSpecialtyService.getAllAssociations();

    forkJoin({
      appointments: appointments$,
      patients: patients$,
      specialties: specialties$,
      doctors: this.doctorsService.getAllDoctorsRaw()
    }).subscribe({
      next: (data) => {
        // We need to match doctors to get ratings. The service refreshDoctors does complex logic. 
        // Let's assume we can get the processed list from service if we call refresh first? 
        // Or just fetch basic info. Actually, DoctorsService.getDoctors() returns signal value.
        // Let's stick to what we have or try to use the service's obs if available.
        // Simplified: Fetching doctors via the service method that returns observable would be best but it returns void (refresh).
        // Let's use the signal after a timeout or just fetch manually for now to avoid refactoring service.
        // Actually, we can reuse `refreshDoctors` logic or just rely on appointment data for volume and assume 0 rating if not found?
        // Better: Fetch doctors using the same logic as DoctorsService or just `this.doctorsService.doctors()` if it's already loaded?
        // It might not be loaded. Let's trigger a refresh and wait? No, let's just fetch profiles.
        // Re-implementing fetch here for safety/speed.
        this.processData(data.appointments, data.patients, data.specialties, []);
      },
      error: (err) => console.error('Error loading dashboard data', err)
    });
  }

  processData(appointments: Appointment[], patients: Patient[], specialties: any[], doctors: any[]) {
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. KPIs Calculations
    const todayAppointments = appointments.filter(a => a.appointmentDate === todayStr);
    const monthAppointments = appointments.filter(a => a.appointmentDate.substring(0, 7) === todayStr.substring(0, 7));

    const confirmedToday = todayAppointments.filter(a => a.status === 'CONFIRMED').length;

    // Financials
    // Provide a map of Cost per (Doctor+Specialty)
    const costMap = new Map<string, number>();
    specialties.forEach(s => costMap.set(`${s.doctorId}-${s.specialtyId}`, s.cost));

    const calculateIncome = (apps: Appointment[], status: 'PAID' | 'PENDING' | 'ALL') => {
      return apps.reduce((sum, app) => {
        if (status !== 'ALL' && app.paymentStatus !== status) return sum;
        // If paymentStatus is undefined, assume PENDING if not cancelled? Or ignore.
        // Let's be strict: if PAID, count it.
        const cost = costMap.get(`${app.doctorId}-${app.specialtyId}`) || 0;
        return sum + cost;
      }, 0);
    };

    const incomeReal = calculateIncome(monthAppointments, 'PAID');
    const incomePotential = calculateIncome(monthAppointments, 'ALL'); // Total value

    const cancellationRate = monthAppointments.length > 0
      ? (monthAppointments.filter(a => a.status === 'CANCELLED').length / monthAppointments.length * 100).toFixed(1)
      : '0';

    const confirmationRate = todayAppointments.length > 0
      ? (confirmedToday / todayAppointments.length * 100).toFixed(0)
      : '0';


    this.kpis = [
      { label: 'Citas de Hoy', value: todayAppointments.length.toString(), subtext: `${confirmedToday} confirmadas`, icon: CalendarCheck, color: 'text-blue-500', bg: 'bg-blue-50' },
      { label: 'Tasa Confirmación', value: `${confirmationRate}%`, subtext: 'Promedio hoy', icon: Activity, color: 'text-green-500', bg: 'bg-green-50' },
      { label: 'Cancelaciones', value: `${cancellationRate}%`, subtext: 'Este mes', icon: FileX, color: 'text-orange-500', bg: 'bg-orange-50' },
      { label: 'Ingresos (Mes)', value: `${this.currencySymbol()} ${incomeReal}`, subtext: `Proyectado: ${this.currencySymbol()} ${incomePotential}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' }
    ];

    // 2. Charts Logic

    // Status / Payment Status
    const statusCounts: any = { 'Pagado': 0, 'Pendiente': 0 };
    monthAppointments.forEach(a => {
      if (a.paymentStatus === 'PAID') statusCounts['Pagado']++;
      else if (a.status !== 'CANCELLED') statusCounts['Pendiente']++;
    });
    this.patientsByStatus = Object.keys(statusCounts).map(k => ({ name: k, value: statusCounts[k] }));

    // Specialties
    const specCounts: any = {};
    monthAppointments.forEach(a => {
      const name = a.specialtyName || 'General';
      specCounts[name] = (specCounts[name] || 0) + 1;
    });
    this.visitsBySpecialty = Object.keys(specCounts).map(k => ({ name: k, value: specCounts[k] }));

    // Gender 
    const genderCounts: any = { 'Femenino': 0, 'Masculino': 0 };
    patients.forEach(p => {
      if (p.gender === 'F') genderCounts['Femenino']++;
      else if (p.gender === 'M') genderCounts['Masculino']++;
    });
    this.genderDistribution = Object.keys(genderCounts).map(k => ({ name: k, value: genderCounts[k] }));


    // Age Distribution
    const ageRanges = { '0-12': 0, '13-18': 0, '19-30': 0, '31-50': 0, '50+': 0 };
    patients.forEach(p => {
      if (p.age <= 12) ageRanges['0-12']++;
      else if (p.age <= 18) ageRanges['13-18']++;
      else if (p.age <= 30) ageRanges['19-30']++;
      else if (p.age <= 50) ageRanges['31-50']++;
      else ageRanges['50+']++;
    });
    this.ageDistribution = Object.keys(ageRanges).map(k => ({ name: k, value: (ageRanges as any)[k] }));

    // Peak Days (Mon-Sun)
    const days = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
    const dayCounts = new Array(7).fill(0);
    appointments.forEach(a => {
      const date = new Date(a.appointmentDate + 'T12:00:00'); // Valid ISO date
      dayCounts[date.getDay()]++;
    });
    this.peakDays = days.map((d, i) => ({ name: d, value: dayCounts[i] }));

    // Peak Hours
    const hourCounts = new Array(24).fill(0);
    appointments.forEach(a => {
      const hour = parseInt(a.startTime.split(':')[0], 10);
      if (!isNaN(hour)) hourCounts[hour]++;
    });
    this.peakHours = hourCounts.map((count, i) => ({ name: `${i}:00`, value: count })).filter(h => h.value > 0);


    // Payment Methods
    const payCounts: any = {};
    appointments.forEach(a => {
      if (a.paymentMethod) {
        payCounts[a.paymentMethod] = (payCounts[a.paymentMethod] || 0) + 1;
      }
    });
    this.paymentMethods = Object.keys(payCounts).map(k => ({ name: k, value: payCounts[k] }));

    // Top Patients
    const patientVisits: any = {};
    appointments.forEach(a => {
      if (a.patientName) {
        patientVisits[a.patientName] = (patientVisits[a.patientName] || 0) + 1;
      }
    });
    this.topPatients = Object.entries(patientVisits)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
    // 3. New KPIs
    // Ticket Average
    const ticketAverage = monthAppointments.length > 0
      ? (incomeReal / monthAppointments.filter(a => a.paymentStatus === 'PAID').length).toFixed(2)
      : '0.00';

    this.kpis.push({ label: 'Ticket Promedio', value: `${this.currencySymbol()} ${ticketAverage}`, subtext: 'Por cita pagada', icon: CreditCard, color: 'text-purple-600', bg: 'bg-purple-50' });

    // Revenue by Specialty
    const revenueSpec: any = {};
    monthAppointments.forEach(a => {
      if (a.paymentStatus === 'PAID') {
        const cost = costMap.get(`${a.doctorId}-${a.specialtyId}`) || 0;
        const name = a.specialtyName || 'General';
        revenueSpec[name] = (revenueSpec[name] || 0) + cost;
      }
    });
    this.revenueBySpecialty = Object.keys(revenueSpec).map(k => ({ name: k, value: revenueSpec[k] }));

    // Top Doctors (Volume & Rating)
    // We need to merge appointment counts with ratings
    const doctorStats: any = {};
    appointments.forEach(a => {
      const docName = a.doctorName || 'Unknown';
      if (!doctorStats[docName]) {
        doctorStats[docName] = { count: 0, revenue: 0, id: a.doctorId };
      }
      doctorStats[docName].count++;
      if (a.paymentStatus === 'PAID') {
        doctorStats[docName].revenue += (costMap.get(`${a.doctorId}-${a.specialtyId}`) || 0);
      }
    });

    // Map to array and try to find rating if we had doctor profiles. 
    this.topDoctors = Object.keys(doctorStats).map(name => ({
      name,
      count: doctorStats[name].count,
      revenue: doctorStats[name].revenue,
      rating: 0 // Placeholder until we correctly fetch profiles
    })).sort((a, b) => b.count - a.count).slice(0, 5);
  }

  onSelect(event: any) {
    console.log(event);
  }
}

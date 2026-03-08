import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  TrendingUp, Activity, CreditCard, Users,
  CalendarCheck, Clock, DollarSign
} from 'lucide-angular';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import {
  DashboardAppService, FrequentPatientItem, TopDoctorItem, EvolutionItem, Granularity
} from '../dashboard-app.service';
import { ConfigurationService } from '../../../core/services/configuration';
import { DatePickerComponent } from '../../../shared/components/datepicker/datepicker';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, NgxChartsModule, DatePickerComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {
  private svc = inject(DashboardAppService);
  private configSvc = inject(ConfigurationService);

  currencySymbol = computed(() => this.configSvc.settings().currency === 'USD' ? '$' : 'S/');

  readonly icons = { TrendingUp, Activity, CreditCard, Users, CalendarCheck, Clock, DollarSign };

  // Date range filter
  fromDate = this.defaultFrom();
  toDate = this.today();

  // Granularity toggles for evolution charts
  patientGranularity: Granularity = 'MONTH';
  appointmentGranularity: Granularity = 'MONTH';

  // Perfil Etario: puntos de corte editables (ej: "17,30,45,60")
  cutoffsInput = '17,30,45,60';

  // Citas por Franja Horaria: ancho de cada franja en horas (1–12)
  rangeWidthHours = 1;

  // Color palettes
  readonly colorScheme: any = {
    domain: ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6']
  };
  readonly statusColors: any = { domain: ['#10B981', '#F59E0B', '#EF4444', '#6366F1'] };
  readonly genderColors: any = { domain: ['#6366F1', '#EC4899', '#10B981'] };

  // Appointment Status Colors map (Match with appointments-calendar/list view logic approximately)
  readonly appointmentStatusColors: any = {
    domain: [
      '#D1D5DB', // DEFAULT
      '#93C5FD', // PROGRAMADA -> blue-300
      '#86EFAC', // CONFIRMADA -> green-300
      '#A78BFA', // EN ATENCION -> purple-300
      '#FCA5A5', // PERDIDA -> red-300
      '#FDE047', // EN ESPERA -> yellow-300
      '#6EE7B7', // ATENDIDA -> emerald-300
      '#9CA3AF'  // CANCELADA -> gray-400
    ]
  };

  // Chart data (ngx-charts format: {name, value}[])
  paymentStatusData = signal<any[]>([]);
  specialtyDemandData = signal<any[]>([]);
  genderData = signal<any[]>([]);
  ageData = signal<any[]>([]);
  busiestDaysData = signal<any[]>([]);
  hourData = signal<any[]>([]);
  paymentMethodsData = signal<any[]>([]);
  revenueData = signal<any[]>([]);
  appointmentStatusesData = signal<any[]>([]);

  // Line chart data: [{name, series: [{name, value}]}]
  patientEvolutionData = signal<any[]>([]);
  appointmentEvolutionData = signal<any[]>([]);

  // Table data
  frequentPatientsData = signal<FrequentPatientItem[]>([]);
  topDoctorsData = signal<TopDoctorItem[]>([]);

  ngOnInit() { this.loadAll(); }

  private today(): string { return new Date().toISOString().split('T')[0]; }

  private defaultFrom(): string {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().split('T')[0];
  }

  // Muestra el valor numérico en los labels de gráficos circulares
  readonly pieValueFormat = (data: any): string => {
    const v = typeof data === 'object' && data !== null ? (data.value ?? data.name) : data;
    return String(v);
  };

  // Redondea al entero más cercano (para promedios con decimales)
  readonly roundFormat = (value: number): string => String(Math.round(value));

  private s(value: string | null | undefined, fallback = 'Sin especificar'): string {
    return value ?? fallback;
  }

  private toLabelChart(items: { label: string; count: number }[]): any[] {
    return items.map(i => ({ name: this.s(i.label), value: i.count }));
  }

  private toLine(items: EvolutionItem[], label: string): any[] {
    if (!items.length) return [];
    return [{ name: label, series: items.map(i => ({ name: this.s(i.period), value: i.count })) }];
  }

  loadAll() {
    const f = this.fromDate, t = this.toDate;
    this.svc.paymentStatus(f, t).subscribe(d => this.paymentStatusData.set(this.toLabelChart(d)));
    this.svc.specialtyDemand(f, t).subscribe(d => this.specialtyDemandData.set(d.map(i => ({ name: this.s(i.specialtyName), value: i.count }))));
    this.svc.patientsByGender(f, t).subscribe(d => this.genderData.set(this.toLabelChart(d)));
    this.loadAgeChart();
    this.svc.busiestDays(f, t).subscribe(d => this.busiestDaysData.set(this.toLabelChart(d)));
    this.loadHourChart();
    this.svc.paymentMethods(f, t).subscribe(d => this.paymentMethodsData.set(this.toLabelChart(d)));
    this.svc.frequentPatients(f, t).subscribe(d => this.frequentPatientsData.set(d));
    this.svc.revenueBySpecialty(f, t).subscribe(d => this.revenueData.set(d.map(i => ({ name: this.s(i.specialtyName), value: Number(i.revenue) }))));
    this.svc.topDoctors(f, t).subscribe(d => this.topDoctorsData.set(d));
    this.svc.appointmentStatuses(f, t).subscribe(d => this.appointmentStatusesData.set(this.toLabelChart(d)));
    this.loadPatientEvolution();
    this.loadAppointmentEvolution();
  }

  loadPatientEvolution() {
    this.svc.patientEvolution(this.fromDate, this.toDate, this.patientGranularity)
      .subscribe(d => this.patientEvolutionData.set(this.toLine(d, 'Pacientes')));
  }

  loadAppointmentEvolution() {
    this.svc.appointmentEvolution(this.fromDate, this.toDate, this.appointmentGranularity)
      .subscribe(d => this.appointmentEvolutionData.set(this.toLine(d, 'Citas')));
  }

  setPatientGranularity(g: Granularity) { this.patientGranularity = g; this.loadPatientEvolution(); }
  setAppointmentGranularity(g: Granularity) { this.appointmentGranularity = g; this.loadAppointmentEvolution(); }

  loadAgeChart() {
    const cutoffs = this.cutoffsInput
      .split(',')
      .map(v => parseInt(v.trim(), 10))
      .filter(n => !isNaN(n) && n >= 1 && n <= 149);
    if (!cutoffs.length) return;
    this.svc.patientsByAge(this.fromDate, this.toDate, cutoffs)
      .subscribe(d => this.ageData.set(d.map(i => ({ name: this.s(i.ageRange), value: i.count }))));
  }

  loadHourChart() {
    const rw = Math.min(12, Math.max(1, Math.floor(this.rangeWidthHours)));
    this.svc.appointmentsByHour(this.fromDate, this.toDate, rw)
      .subscribe(d => this.hourData.set(d.map(i => ({ name: this.s(i.hourRange), value: i.avgCount }))));
  }

  applyFilter() { this.loadAll(); }
}

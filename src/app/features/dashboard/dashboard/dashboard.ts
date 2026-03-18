import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  TrendingUp, Activity, CreditCard, Users,
  CalendarCheck, Clock, DollarSign,
  CheckCircle, XCircle, AlertCircle
} from 'lucide-angular';
import { NgxChartsModule, Color, ScaleType } from '@swimlane/ngx-charts';
import * as shape from 'd3-shape';
import {
  DashboardAppService, ChartItem, MultiChartItem, FrequentPatientItem, TopDoctorItem, Granularity, DashboardFilter, KpiSummary
} from '../dashboard-app.service';
import { ConfigurationService } from '../../../core/services/configuration';
import { DatePickerComponent } from '../../../shared/components/datepicker/datepicker';
import { BehaviorSubject, Observable, of, combineLatest } from 'rxjs';
import { switchMap, map, catchError, shareReplay, tap, finalize, startWith } from 'rxjs/operators';

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

  readonly icons = {
    TrendingUp, Activity, CreditCard, Users,
    CalendarCheck, Clock, DollarSign,
    CheckCircle, XCircle, AlertCircle
  };

  // Reactive State Management
  private filterSubject = new BehaviorSubject<DashboardFilter | null>(null);
  filter$ = this.filterSubject.asObservable();
  
  isLoading$ = new BehaviorSubject<boolean>(true);

  // Data Streams (Public Observables for Async Pipe)
  paymentStatusData$ = this.filter$.pipe(switchMap(f => f ? this.svc.paymentStatus(f) : of([])), shareReplay(1));
  specialtyDemandData$ = this.filter$.pipe(switchMap(f => f ? this.svc.specialtyDemand(f) : of([])), shareReplay(1));
  genderData$ = this.filter$.pipe(switchMap(f => f ? this.svc.patientsByGender(f) : of([])), shareReplay(1));
  busiestDaysData$ = this.filter$.pipe(switchMap(f => f ? this.svc.busiestDays(f) : of([])), shareReplay(1));
  paymentMethodsData$ = this.filter$.pipe(switchMap(f => f ? this.svc.paymentMethods(f) : of([])), shareReplay(1));
  frequentPatientsData$ = this.filter$.pipe(switchMap(f => f ? this.svc.frequentPatients(f) : of([])), shareReplay(1));
  revenueData$ = this.filter$.pipe(switchMap(f => f ? this.svc.revenueBySpecialty(f) : of([])), shareReplay(1));
  topDoctorsData$ = this.filter$.pipe(switchMap(f => f ? this.svc.topDoctors(f) : of([])), shareReplay(1));
  appointmentStatusesData$ = this.filter$.pipe(switchMap(f => f ? this.svc.appointmentStatuses(f) : of([])), shareReplay(1));
  
  // New Strategic Streams
  specialtyPerformanceData$ = this.filter$.pipe(switchMap(f => f ? this.svc.specialtyPerformance(f) : of([])), shareReplay(1));
  patientRetentionData$ = this.filter$.pipe(switchMap(f => f ? this.svc.patientRetention(f) : of([])), shareReplay(1));
  monthlyProjectionData$ = this.filter$.pipe(switchMap(f => f ? this.svc.monthlyProjection(f) : of([])), shareReplay(1));
  cancellationReasonsData$ = this.filter$.pipe(switchMap(f => f ? this.svc.cancellationReasons(f) : of([])), shareReplay(1));
  peakTimesData$ = this.filter$.pipe(switchMap(f => f ? this.svc.peakTimes(f) : of([])), shareReplay(1));
  doctorOccupationData$ = this.filter$.pipe(switchMap(f => f ? this.svc.doctorOccupation(f) : of([])), shareReplay(1));

  // KPI Summary Stream
  kpiSummary$ = this.filter$.pipe(
    tap(() => this.isLoading$.next(true)),
    switchMap(f => f ? this.svc.getKpis(f).pipe(
      finalize(() => this.isLoading$.next(false)),
      catchError(() => of({ total: 0, attendedCount: 0, attendedDetails: [], activeCount: 0, activeDetails: [], cancelledCount: 0, cancelledDetails: [] } as KpiSummary))
    ) : of(null)),
    shareReplay(1)
  );

  // Evolution Streams with Granularity Support
  patientGranularity$ = new BehaviorSubject<Granularity>('MONTH');
  appointmentGranularity$ = new BehaviorSubject<Granularity>('MONTH');

  patientEvolutionData$ = combineLatest([this.filter$, this.patientGranularity$]).pipe(
    switchMap(([f, g]) => f ? this.svc.patientEvolution(f, g) : of([])),
    shareReplay(1)
  );

  appointmentEvolutionData$ = combineLatest([this.filter$, this.appointmentGranularity$]).pipe(
    switchMap(([f, g]) => f ? this.svc.appointmentEvolution(f, g) : of([])),
    shareReplay(1)
  );

  // Configuration & Chart Constants
  curve = shape.curveMonotoneX;
  cutoffsInput = '17,30,45,60';
  rangeWidthHours = 1;

  // Semantic Color Palette
  semanticScheme: Color = {
    name: 'semantic',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6', '#ec4899']
  };

  volumeScheme: Color = {
    name: 'volume',
    selectable: true,
    group: ScaleType.Linear,
    domain: ['#e0e7ff', '#6366f1', '#4338ca']
  };

  customColors = (name: string) => {
    const map: Record<string, string> = {
      'ATENDIDA': '#10b981',
      'CONFIRMADA': '#6366f1',
      'CANCELADA': '#ef4444',
      'PENDIENTE': '#f59e0b',
      'PAGADO': '#10b981',
      'POR PAGAR': '#ef4444'
    };
    return map[name.toUpperCase()] || '#94a3b8';
  };

  // Local Filter State (for DatePicker binding)
  fromDate = '';
  toDate = '';

  ngOnInit() {
    this.fromDate = this.firstOfMonth();
    this.toDate = this.today();
    this.updateFilters();
    
    // Optional: Log when first date is fetched for background context, 
    // but we prioritize "First of current month" per user request
    this.svc.getFirstAppointmentDate().pipe(catchError(() => of(null))).subscribe();
  }

  updateFilters() {
    this.filterSubject.next({
      from: this.fromDate,
      to: this.toDate,
      doctorId: null, // Could be bound to a selector
      specialtyId: null // Could be bound to a selector
    });
  }

  private today(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private firstOfMonth(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
  }

  setPatientGranularity(g: Granularity) { this.patientGranularity$.next(g); }
  setAppointmentGranularity(g: Granularity) { this.appointmentGranularity$.next(g); }

  formatCurrency = (value: any): string => {
    return `${this.currencySymbol()} ${Number(value).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
}

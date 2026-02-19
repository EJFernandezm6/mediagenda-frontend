import { Component, inject, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Users, CalendarCheck, FileX, DollarSign, Activity, TrendingUp, Clock, CreditCard } from 'lucide-angular';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { DashboardAppService, DashboardChartsResponse, DashboardKpiResponse } from '../dashboard-app.service';
import { ConfigurationService } from '../../../core/services/configuration';



@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, NgxChartsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {
  private dashboardService = inject(DashboardAppService);
  private configService = inject(ConfigurationService);

  // Currency helper
  currencySymbol = computed(() => {
    return this.configService.settings().currency === 'USD' ? '$' : 'S/';
  });

  // Icons
  readonly icons = { Users, CalendarCheck, FileX, DollarSign, Activity, TrendingUp, Clock, CreditCard };

  // KPI Data
  kpis = signal<any[]>([]);

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
    this.loadDashboardData();
  }

  loadDashboardData() {
    const today = new Date().toISOString().split('T')[0];

    // 1. KPIs
    this.dashboardService.getKpis(today).subscribe({
      next: (data) => {
        this.kpis.set([
          { label: 'Citas de Hoy', value: data.appointmentsToday.value, subtext: data.appointmentsToday.subtext, icon: CalendarCheck, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Tasa Confirmación', value: data.confirmationRate.value, subtext: data.confirmationRate.subtext, icon: Activity, color: 'text-green-500', bg: 'bg-green-50' },
          { label: 'Cancelaciones', value: data.cancellationRate.value, subtext: data.cancellationRate.subtext, icon: FileX, color: 'text-orange-500', bg: 'bg-orange-50' },
          { label: 'Ingresos (Mes)', value: `${this.currencySymbol()} ${data.monthlyRevenue.value}`, subtext: data.monthlyRevenue.subtext, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' }
        ]);
        // Note: Ticket Average calculation removed or need to add effectively if wanted. 
        // For now, sticking to 4 main KPIs returned by backend response structure.
      },
      error: (err) => console.error('Error fetching KPIs', err)
    });

    // 2. Charts
    // Get current month range
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    this.dashboardService.getCharts(startOfMonth, endOfMonth).subscribe({
      next: (data) => {
        this.patientsByStatus = data.patientsByStatus;
        this.visitsBySpecialty = data.visitsBySpecialty;
        this.genderDistribution = data.genderDistribution;
        this.ageDistribution = data.ageDistribution;
        this.paymentMethods = data.paymentMethods;
        this.peakDays = data.peakDays;
        this.peakHours = data.peakHours;
        this.revenueBySpecialty = data.revenueBySpecialty;
        this.topDoctors = data.topDoctors;
        this.topPatients = data.topPatients;
      },
      error: (err) => console.error('Error fetching Charts', err)
    });
  }

  onSelect(event: any) {
    console.log(event);
  }
}

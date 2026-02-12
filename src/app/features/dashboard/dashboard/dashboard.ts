import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Users, CalendarCheck, FileX, DollarSign, Activity } from 'lucide-angular';
import { NgxChartsModule } from '@swimlane/ngx-charts';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, NgxChartsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent {
  // Icons
  readonly icons = { Users, CalendarCheck, FileX, DollarSign, Activity };

  // KPI Data
  kpis = [
    { label: 'Citas de hoy', value: '12', subtext: '4 pendientes', icon: CalendarCheck, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Confirmadas', value: '85%', subtext: 'De las citas de hoy', icon: Activity, color: 'text-green-500', bg: 'bg-green-50' },
    { label: 'No-show mensual', value: '5%', subtext: 'Tasa de inasistencia', icon: FileX, color: 'text-orange-500', bg: 'bg-orange-50' },
    { label: 'Ingresos del mes', value: 'S/ 12,450', subtext: 'En consultas realizadas', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' }
  ];

  // Chart Data
  patientsByStatus = [
    { name: 'Pagado', value: 450 },
    { name: 'Pendiente', value: 120 },
    { name: 'Separado', value: 80 }
  ];

  visitsBySpecialty = [
    { name: 'Cardiología', value: 40 },
    { name: 'Pediatría', value: 35 },
    { name: 'Dermatología', value: 25 },
    { name: 'Ginecología', value: 20 },
    { name: 'Medicina General', value: 55 }
  ];

  // Chart Config
  view: [number, number] = [500, 300]; // Default view dimensions
  showXAxis = true;
  showYAxis = true;
  gradient = false;
  showLegend = true;
  showXAxisLabel = true;
  xAxisLabel = 'Especialidad';
  showYAxisLabel = true;
  yAxisLabel = 'Visitas';

  colorScheme: any = {
    domain: ['#10B981', '#F59E0B', '#3B82F6', '#6366F1', '#8B5CF6']
  };

  pieColorScheme: any = {
    domain: ['#10B981', '#F59E0B', '#EF4444'] // Green, Orange, Red-ish for statuses
  };

  onSelect(event: any) {
    console.log(event);
  }
}

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule, LayoutDashboard, Calendar, Users, Stethoscope, Award, Clock, LogOut, Settings } from 'lucide-angular';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css',
})
export class MainLayoutComponent {
  readonly icons = {
    LayoutDashboard,
    Calendar,
    Users,
    Stethoscope,
    Award,
    Clock,
    LogOut,
    Settings
  };

  navItems = [
    { label: 'Dashboard', icon: this.icons.LayoutDashboard, route: '/app/dashboard' },
    { label: 'Agenda Citas', icon: this.icons.Calendar, route: '/app/appointments' },
    { label: 'Pacientes', icon: this.icons.Users, route: '/app/patients' },
    { label: 'Médicos', icon: this.icons.Stethoscope, route: '/app/doctors' },
    { label: 'Asignaciones', icon: this.icons.Users, route: '/app/doctor-specialty' },
    { label: 'Especialidades', icon: this.icons.Award, route: '/app/specialties' },
    { label: 'Turnos de Atención', icon: this.icons.Clock, route: '/app/schedule-config' },
    { label: 'Configuración', icon: this.icons.Settings, route: '/app/configuration' }
  ];
}

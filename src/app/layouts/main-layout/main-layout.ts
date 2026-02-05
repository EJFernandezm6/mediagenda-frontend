import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule, LayoutDashboard, Calendar, Users, Stethoscope, Award, Clock, LogOut, Settings, Shield, Menu, X } from 'lucide-angular';

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
    Settings,
    Shield,
    Menu,
    X
  };

  isMobileMenuOpen = false;

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  navItems = [
    { label: 'Dashboard', icon: this.icons.LayoutDashboard, route: '/app/dashboard' },
    { label: 'Agenda Citas', icon: this.icons.Calendar, route: '/app/appointments' },
    { label: 'Pacientes', icon: this.icons.Users, route: '/app/patients' },
    { label: 'Especialistas', icon: this.icons.Stethoscope, route: '/app/doctors' },
    { label: 'Asignaciones', icon: this.icons.Users, route: '/app/doctor-specialty' },
    { label: 'Especialidades', icon: this.icons.Award, route: '/app/specialties' },
    { label: 'Turnos de Atención', icon: this.icons.Clock, route: '/app/schedule-config' },
    { label: 'Roles y Permisos', icon: this.icons.Shield, route: '/app/roles' },
    { label: 'Configuración', icon: this.icons.Settings, route: '/app/configuration' }
  ];
}

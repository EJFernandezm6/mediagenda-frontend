import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { LucideAngularModule, LayoutDashboard, Calendar, Users, Stethoscope, Award, Clock, LogOut, Settings, Shield, Menu, X, UserCircle, Zap, Bell, CheckCircle, ChevronRight } from 'lucide-angular';
import { ConfirmModalComponent } from '../../shared/components/confirm-modal/confirm-modal';
import { AuthService } from '../../core/auth/auth.service';
import { AppointmentsService } from '../../core/services/appointments';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule, ConfirmModalComponent],
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
    X,
    UserCircle,
    Zap,
    Bell,
    CheckCircle,
    ChevronRight
  };

  private authService = inject(AuthService);
  private appointmentsService = inject(AppointmentsService);
  private router = inject(Router);

  currentUser = this.authService.currentUser;
  pendingAppointments = this.appointmentsService.pendingAppointments;
  isNotificationsOpen = false;

  constructor() {
    // Initial fetch
    this.appointmentsService.fetchPendingAppointments();
  }

  isMobileMenuOpen = false;
  isSidebarCollapsed = false;

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  toggleNotifications() {
    this.isNotificationsOpen = !this.isNotificationsOpen;
  }

  navigateToAppointment(id: string) {
    this.isNotificationsOpen = false;
    this.router.navigate(['/app/appointments'], { queryParams: { appointmentId: id } });
  }

  onLogout() {
    this.authService.logout();
  }

  navItems = [
    { label: 'Dashboard', icon: this.icons.LayoutDashboard, route: '/app/dashboard' },
    { label: 'Agenda Citas', icon: this.icons.Calendar, route: '/app/appointments' },
    { label: 'Pacientes', icon: this.icons.Users, route: '/app/patients' },
    { label: 'Especialistas', icon: this.icons.Stethoscope, route: '/app/doctors' },
    { label: 'Especialidades', icon: this.icons.Award, route: '/app/specialties' },
    { label: 'Asignaciones', icon: this.icons.Users, route: '/app/doctor-specialty' },
    { label: 'Turnos de Atención', icon: this.icons.Clock, route: '/app/schedule-config' },
    { label: 'Roles y Permisos', icon: this.icons.Shield, route: '/app/users' },
    { label: 'Suscripción', icon: this.icons.Zap, route: '/app/subscription' },
    { label: 'Configuración', icon: this.icons.Settings, route: '/app/configuration' }
  ];

}

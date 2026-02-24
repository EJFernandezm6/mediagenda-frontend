import { Component, inject, computed, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { LucideAngularModule, LucideIconData, LayoutDashboard, Calendar, Users, Stethoscope, Award, Clock, LogOut, Settings, Shield, Menu, X, UserCircle, Zap, Bell, CheckCircle, ChevronRight } from 'lucide-angular';
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

  private readonly featureIconMap: Record<string, LucideIconData> = {
    dashboard: this.icons.LayoutDashboard,
    appointments: this.icons.Calendar,
    patients: this.icons.Users,
    specialists: this.icons.Stethoscope,
    specialties: this.icons.Award,
    assignments: this.icons.Users,
    shifts: this.icons.Clock,
    roles_permissions: this.icons.Shield,
    subscription: this.icons.Zap,
    settings: this.icons.Settings
  };

  navItems = computed(() =>
    [...(this.currentUser()?.features ?? [])]
      .sort((a, b) => a.order - b.order)
      .map(f => ({
        label: f.name,
        icon: this.featureIconMap[f.featureKey] ?? this.icons.LayoutDashboard,
        route: f.path
      }))
  );

  constructor() {
    this.appointmentsService.fetchPendingAppointments();
  }

  isMobileMenuOpen = false;
  isSidebarCollapsed = false;

  @ViewChild('notificationsContainer') notificationsContainer!: ElementRef;

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  toggleNotifications() {
    this.isNotificationsOpen = !this.isNotificationsOpen;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.isNotificationsOpen && this.notificationsContainer && !this.notificationsContainer.nativeElement.contains(event.target)) {
      this.isNotificationsOpen = false;
    }
  }

  navigateToAppointment(id: string) {
    this.isNotificationsOpen = false;
    this.router.navigate(['/app/appointments'], { queryParams: { appointmentId: id } });
  }

  onLogout() {
    this.authService.logout();
  }

}

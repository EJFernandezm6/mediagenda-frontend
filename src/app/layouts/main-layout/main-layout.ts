import { Component, inject, computed, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { LucideAngularModule, LucideIconData, LayoutDashboard, Calendar, Users, Stethoscope, MessageCircle, Clock, LogOut, Settings, Shield, Menu, X, UserCircle, Zap, Bell, CheckCircle, ChevronRight, ClipboardList } from 'lucide-angular';
import { ConfirmModalComponent } from '../../shared/components/confirm-modal/confirm-modal';
import { ErrorModalComponent } from '../../shared/components/error-modal/error-modal.component';
import { AuthService } from '../../core/auth/auth.service';
import { AppointmentsService } from '../../core/services/appointments';
import { ConfigurationService } from '../../core/services/configuration';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule, ConfirmModalComponent, ErrorModalComponent],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css',
})
export class MainLayoutComponent {
  readonly icons = {
    LayoutDashboard,
    Calendar,
    Users,
    Stethoscope,
    MessageCircle,
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
    ChevronRight,
    ClipboardList
  };

  private authService = inject(AuthService);
  private appointmentsService = inject(AppointmentsService);
  private configService = inject(ConfigurationService);
  private router = inject(Router);

  currentUser = this.authService.currentUser;
  pendingAppointments = this.appointmentsService.pendingAppointments;
  isNotificationsOpen = false;
  clinicSettings = this.configService.settings;

  private readonly featureIconMap: Record<string, LucideIconData> = {
    dashboard: this.icons.LayoutDashboard,
    appointments: this.icons.Calendar,
    patients: this.icons.Users,
    specialists: this.icons.Stethoscope,
    specialties: this.icons.MessageCircle,
    assignments: this.icons.Users,
    shifts: this.icons.Clock,
    roles_permissions: this.icons.Shield,
    subscription: this.icons.Zap,
    settings: this.icons.Settings
  };

  private readonly labelOverride: Record<string, string> = {
    roles_permissions: 'Gestión de Usuarios',
    shifts: 'Turnos y Horarios',
    assignments: 'Asignación de Especialidades',
    subscription: 'Planes y Suscripción',
    settings: 'Configuración Global'
  };

  navItems = computed(() => {
    const items = [...(this.currentUser()?.features ?? [])]
      .sort((a, b) => a.order - b.order)
      .map(f => ({
        label: this.labelOverride[f.featureKey] ?? f.name,
        icon: this.featureIconMap[f.featureKey] ?? this.icons.LayoutDashboard,
        route: f.path
      }));

    // Inject Reporte de Citas right after schedule/appointments
    const appointmentsIndex = items.findIndex(i => i.route === '/app/appointments');
    if (appointmentsIndex !== -1) {
      items.splice(appointmentsIndex + 1, 0, {
        label: 'Reporte de Citas',
        icon: this.icons.ClipboardList,
        route: '/app/appointments-list'
      });
    } else {
      items.push({
        label: 'Reporte de Citas',
        icon: this.icons.ClipboardList,
        route: '/app/appointments-list'
      });
    }

    return items;
  });

  constructor() {
    this.appointmentsService.fetchPendingAppointments();
  }

  userRolesDisplay = computed(() => {
    const roles = this.currentUser()?.roles;
    if (!roles || roles.length === 0) return 'Invitado';

    return roles.map(r => {
      const upper = r.toUpperCase();
      if (upper === 'ADMIN') return 'Administrador';
      if (upper === 'DOCTOR') return 'Especialista';
      return r;
    }).join(', ');
  });

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

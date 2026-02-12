import { Routes } from '@angular/router';
import { AuthLayoutComponent } from './layouts/auth-layout/auth-layout';
import { MainLayoutComponent } from './layouts/main-layout/main-layout';
import { LoginComponent } from './features/auth/login/login';
import { DashboardComponent } from './features/dashboard/dashboard/dashboard';
import { LandingComponent } from './features/landing/landing';

export const routes: Routes = [
    { path: '', redirectTo: 'landing', pathMatch: 'full' },
    { path: 'landing', component: LandingComponent },
    {
        path: 'auth',
        component: AuthLayoutComponent,
        children: [
            { path: 'login', component: LoginComponent },
            {
                path: 'plans',
                loadComponent: () => import('./features/auth/plans/plans').then(m => m.PlansComponent)
            }
        ]
    },
    {
        path: 'app',
        component: MainLayoutComponent,
        children: [
            { path: 'dashboard', component: DashboardComponent },
            {
                path: 'specialties',
                loadComponent: () => import('./features/specialties/specialties-list/specialties-list').then(m => m.SpecialtiesListComponent)
            },
            {
                path: 'doctors',
                loadComponent: () => import('./features/doctors/doctors-list/doctors-list').then(m => m.DoctorsListComponent)
            },
            {
                path: 'doctors/:id',
                loadComponent: () => import('./features/doctors/doctor-detail/doctor-detail').then(m => m.DoctorDetailComponent)
            },
            {
                path: 'doctor-specialty',
                loadComponent: () => import('./features/doctors/doctor-specialty/doctor-specialty').then(m => m.DoctorSpecialtyComponent)
            },
            {
                path: 'schedule-config',
                loadComponent: () => import('./features/schedules/schedule-config/schedule-config').then(m => m.ScheduleConfigComponent)
            },
            {
                path: 'patients',
                loadComponent: () => import('./features/patients/patients-list/patients-list').then(m => m.PatientsListComponent)
            },
            {
                path: 'patients/:id',
                loadComponent: () => import('./features/patients/patient-detail/patient-detail').then(m => m.PatientDetailComponent)
            },
            {
                path: 'appointments',
                loadComponent: () => import('./features/appointments/appointments-calendar/appointments-calendar').then(m => m.AppointmentsCalendarComponent)
            },
            {
                path: 'users',
                loadComponent: () => import('./features/users/users-list/users-list').then(m => m.UsersListComponent)
            },
            {
                path: 'configuration',
                loadComponent: () => import('./features/configuration/configuration/configuration').then(m => m.ConfigurationComponent)
            },
            {
                path: 'subscription',
                loadComponent: () => import('./features/subscription/subscription').then(m => m.SubscriptionComponent)
            }
        ]
    },
    { path: '**', redirectTo: 'auth/login' } // Fallback
];

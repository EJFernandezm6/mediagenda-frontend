import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DoctorsService } from '../../../core/services/doctors';
import { LucideAngularModule, Shield, UserPlus, Trash2 } from 'lucide-angular';

@Component({
    selector: 'app-roles-manager',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideAngularModule],
    templateUrl: './roles-manager.html'
})
export class RolesManagerComponent {
    private doctorsService = inject(DoctorsService);

    readonly icons = { Shield, UserPlus, Trash2 };

    // Mock Admins (In a real app, this would come from AuthService)
    admins = signal([
        { id: 'admin1', fullName: 'Administrador Principal', email: 'admin@mediagenda.com', role: 'ADMIN' },
        { id: 'admin2', fullName: 'Gerente Clínica', email: 'gerente@mediagenda.com', role: 'ADMIN' }
    ]);

    // Combined Roles List
    usersWithRoles = computed(() => {
        const doctors = this.doctorsService.doctors(); // Access signal
        const admins = this.admins();

        // Map of email -> User object
        const userMap = new Map<string, any>();

        // Process Admins first
        admins.forEach(admin => {
            userMap.set(admin.email, {
                id: admin.id,
                fullName: admin.fullName,
                email: admin.email,
                roles: ['ADMIN'],
                isDoctor: false
            });
        });

        // Process Doctors
        doctors.forEach(doc => {
            if (userMap.has(doc.email)) {
                // User exists (is Admin), add Doctor role
                const existing = userMap.get(doc.email);
                existing.roles.push('ESPECIALISTA');
                existing.isDoctor = true; // Mark as also doctor
                existing.doctorId = doc.id;
            } else {
                // New user (Doctor only)
                userMap.set(doc.email, {
                    id: doc.id, // Use doc ID
                    fullName: doc.fullName,
                    email: doc.email,
                    roles: ['ESPECIALISTA'],
                    isDoctor: true,
                    doctorId: doc.id
                });
            }
        });

        return Array.from(userMap.values());
    });

    successMessage = '';
    newAdminEmail = '';

    addAdmin() {
        if (!this.newAdminEmail) return;

        // Check if already exists in admins
        if (this.admins().some(a => a.email === this.newAdminEmail)) {
            alert('Este usuario ya es administrador.');
            return;
        }

        // Check if exists as doctor (to get name)
        const doctor = this.doctorsService.doctors().find(d => d.email === this.newAdminEmail);

        this.admins.update(current => [
            ...current,
            {
                id: crypto.randomUUID(),
                fullName: doctor ? doctor.fullName : 'Nuevo Administrador',
                email: this.newAdminEmail,
                role: 'ADMIN'
            }
        ]);

        this.newAdminEmail = '';
        this.showSuccess('Administrador agregado correctamente.');
    }

    toggleAdminRole(user: any) {
        if (user.roles.includes('ADMIN')) {
            // Remove Admin Role
            this.admins.update(current => current.filter(a => a.email !== user.email));
            this.showSuccess('Rol de administrador revocado.');
        } else {
            // Add Admin Role
            this.admins.update(current => [
                ...current,
                {
                    id: crypto.randomUUID(),
                    fullName: user.fullName,
                    email: user.email,
                    role: 'ADMIN'
                }
            ]);
            this.showSuccess('Rol de administrador asignado.');
        }
    }

    removeUser(user: any) {
        if (confirm('¿Estás seguro de eliminar a este usuario?')) {
            // If doctor, tell them to go to doctors section
            if (user.isDoctor) {
                alert('Este usuario es un Especialista. Debes eliminarlo desde la sección de Especialistas.');
                return;
            }
            // If just Admin, apply toggle (remove)
            this.toggleAdminRole(user);
        }
    }

    showSuccess(msg: string) {
        this.successMessage = msg;
        setTimeout(() => this.successMessage = '', 3000);
    }
}

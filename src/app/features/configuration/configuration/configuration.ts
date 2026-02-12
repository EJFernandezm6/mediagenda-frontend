import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfigurationService } from '../../../core/services/configuration';
import { LucideAngularModule, Save, Settings, CreditCard, Bell, Building, Clock, Check, Zap, Star } from 'lucide-angular';

@Component({
  selector: 'app-configuration',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './configuration.html',
  styleUrl: './configuration.css'
})
export class ConfigurationComponent {
  private configService = inject(ConfigurationService);

  readonly icons = { Save, Settings, CreditCard, Bell, Building, Clock, Check, Zap, Star };

  // Clone settings for form to avoid direct mutation before save
  settings = { ...this.configService.settings() };

  successMessage = '';

  showSuccess(msg: string) {
    this.successMessage = msg;
    setTimeout(() => this.successMessage = '', 3000);
  }

  // Subscription Plans


  // Helper for UI
  availableDays = [
    { id: 1, name: 'Lunes' },
    { id: 2, name: 'Martes' },
    { id: 3, name: 'Miércoles' },
    { id: 4, name: 'Jueves' },
    { id: 5, name: 'Viernes' },
    { id: 6, name: 'Sábado' },
    { id: 0, name: 'Domingo' }
  ];

  toggleDay(dayId: number) {
    const currentDays = this.settings.workingDays || [];
    if (currentDays.includes(dayId)) {
      this.settings.workingDays = currentDays.filter(d => d !== dayId);
    } else {
      this.settings.workingDays = [...currentDays, dayId].sort((a, b) => {
        // Handle Sunday (0) being at the end for sorting if needed, but 0-6 sort is fine
        // If we want Mon(1)..Sun(0), we can just sort numerically for now.
        return a - b;
      });
    }
  }

  save() {
    this.configService.updateSettings(this.settings);
    this.successMessage = 'Configuración guardada correctamente.';
    setTimeout(() => this.successMessage = '', 3000);
  }
}

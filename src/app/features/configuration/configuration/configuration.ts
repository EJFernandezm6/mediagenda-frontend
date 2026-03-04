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




  save() {
    this.configService.updateSettings(this.settings);
    this.successMessage = 'Configuración guardada correctamente.';
    setTimeout(() => this.successMessage = '', 3000);
  }
}

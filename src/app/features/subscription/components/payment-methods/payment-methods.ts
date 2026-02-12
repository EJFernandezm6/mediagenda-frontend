import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, CreditCard, Trash2, Plus } from 'lucide-angular';
import { SubscriptionService } from '../../services/subscription.service';

@Component({
    selector: 'app-payment-methods',
    standalone: true,
    imports: [CommonModule, LucideAngularModule],
    template: `
    <div class="bg-white shadow rounded-lg overflow-hidden border border-gray-100">
      <div class="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <lucide-icon [img]="icons.CreditCard" class="w-5 h-5 text-gray-500"></lucide-icon>
          <h3 class="text-lg font-medium text-gray-900">Métodos de Pago</h3>
        </div>
        <button (click)="addMethod()" class="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
          <lucide-icon [img]="icons.Plus" class="w-4 h-4"></lucide-icon>
          Agregar tarjeta
        </button>
      </div>
      
      <div class="p-6">
        <div *ngIf="paymentMethods().length === 0" class="text-center py-8 text-gray-500">
          No hay métodos de pago registrados.
        </div>

        <ul class="divide-y divide-gray-100">
          <li *ngFor="let method of paymentMethods()" class="py-4 flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div class="h-10 w-16 bg-gray-100 rounded flex items-center justify-center text-gray-500 font-bold text-xs uppercase border border-gray-200">
                {{ method.provider }}
              </div>
              <div>
                <p class="text-sm font-medium text-gray-900">
                  •••• •••• •••• {{ method.last4 }}
                  <span *ngIf="method.is_default" class="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    Predeterminado
                  </span>
                </p>
                <p class="text-xs text-gray-500">Expira {{ method.expiry_month }}/{{ method.expiry_year }}</p>
              </div>
            </div>
            
            <button class="text-gray-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors">
              <lucide-icon [img]="icons.Trash2" class="w-4 h-4"></lucide-icon>
            </button>
          </li>
        </ul>
      </div>
    </div>
  `
})
export class PaymentMethodsComponent {
    private subService = inject(SubscriptionService);
    paymentMethods = this.subService.paymentMethods;

    icons = { CreditCard, Trash2, Plus };

    addMethod() {
        console.log('Add payment method clicked');
        // Logic to open modal for Stripe/Payment provider
    }
}

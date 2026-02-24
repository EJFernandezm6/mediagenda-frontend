import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, CreditCard, Trash2, Plus, X, Loader2 } from 'lucide-angular';
import { SubscriptionService } from '../../services/subscription.service';

@Component({
    selector: 'app-payment-methods',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideAngularModule],
    template: `
    <!-- Modal -->
    <div *ngIf="showModal()" class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">

        <div class="flex items-center justify-between mb-5">
          <h3 class="text-lg font-semibold text-gray-900">Agregar Método de Pago</h3>
          <button (click)="closeModal()" [disabled]="isSubmitting()"
            class="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 disabled:opacity-50">
            <lucide-icon [img]="icons.X" class="w-5 h-5"></lucide-icon>
          </button>
        </div>

        <div *ngIf="errorMessage()" class="mb-4 p-3 text-sm text-red-700 bg-red-100 rounded-lg">
          {{ errorMessage() }}
        </div>

        <div class="space-y-4">
          <!-- Tipo -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Tipo <span class="text-red-500">*</span></label>
            <select [(ngModel)]="form.type" name="type"
              class="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="CREDIT_CARD">Tarjeta de Crédito</option>
              <option value="DEBIT_CARD">Tarjeta de Débito</option>
            </select>
          </div>

          <!-- Proveedor -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
            <select [(ngModel)]="form.provider" name="provider"
              class="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">Seleccionar...</option>
              <option value="VISA">VISA</option>
              <option value="MASTERCARD">MASTERCARD</option>
              <option value="AMEX">AMEX</option>
            </select>
          </div>

          <!-- Número de tarjeta -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Número de tarjeta</label>
            <input type="text" [ngModel]="form.cardNumber" (ngModelChange)="formatCardNumber($event)" name="cardNumber" maxlength="19" placeholder="0000-0000-0000-0000"
              class="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 tracking-widest">
          </div>

          <!-- Vencimiento -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Mes exp.</label>
              <select [(ngModel)]="form.expiryMonth" name="expiryMonth"
                class="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option *ngFor="let m of months" [value]="m">{{ m.toString().padStart(2, '0') }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Año exp.</label>
              <input type="number" [(ngModel)]="form.expiryYear" name="expiryYear" [min]="currentYear"
                class="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
            </div>
          </div>

          <!-- Predeterminado -->
          <div class="flex items-center gap-2">
            <input type="checkbox" [(ngModel)]="form.isDefault" name="isDefault" id="isDefault"
              [disabled]="paymentMethods().length === 0"
              class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed">
            <label for="isDefault" class="text-sm text-gray-700"
              [class.text-gray-400]="paymentMethods().length === 0">
              Establecer como predeterminado
              <span *ngIf="paymentMethods().length === 0" class="text-xs text-gray-400">(obligatorio para el primer método)</span>
            </label>
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <button (click)="closeModal()" [disabled]="isSubmitting()"
            class="flex-1 py-2 px-4 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            Cancelar
          </button>
          <button (click)="submitForm()" [disabled]="isSubmitting()"
            class="flex-1 py-2 px-4 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            <lucide-icon *ngIf="isSubmitting()" [img]="icons.Loader" class="w-4 h-4 animate-spin"></lucide-icon>
            {{ isSubmitting() ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Tarjeta -->
    <div class="bg-white shadow rounded-lg overflow-hidden border border-gray-100">
      <div class="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <lucide-icon [img]="icons.CreditCard" class="w-5 h-5 text-gray-500"></lucide-icon>
          <h3 class="text-lg font-medium text-gray-900">Métodos de Pago</h3>
        </div>
        <button (click)="openModal()"
          class="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
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
              <div class="h-10 min-w-[5rem] px-2 bg-gray-100 rounded flex items-center justify-center text-gray-500 font-bold text-[10px] uppercase border border-gray-200">
                {{ method.provider || method.type }}
              </div>
              <div>
                <p class="text-sm font-medium text-gray-900">
                  •••• •••• •••• {{ method.last4 }}
                  <span *ngIf="method.isDefault"
                    class="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    Predeterminado
                  </span>
                </p>
                <p class="text-xs text-gray-500">Expira {{ method.expiryMonth }}/{{ method.expiryYear }}</p>
              </div>
            </div>
            <button (click)="deleteMethod(method.paymentMethodId)"
              class="text-gray-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors">
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
    icons = { CreditCard, Trash2, Plus, X, Loader: Loader2 };

    showModal = signal(false);
    isSubmitting = signal(false);
    errorMessage = signal('');

    currentYear = new Date().getFullYear();
    months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    form = this.emptyForm();

    private emptyForm() {
        return {
            type: 'CREDIT_CARD',
            provider: '',
            cardNumber: '',
            expiryMonth: 1,
            expiryYear: this.currentYear,
            isDefault: false
        };
    }

    deleteMethod(id: string) {
        if (!confirm('¿Estás seguro de eliminar este método de pago?')) return;
        this.subService.deletePaymentMethod(id).subscribe();
    }

    formatCardNumber(value: string) {
        const digits = value.replace(/\D/g, '').slice(0, 16);
        this.form.cardNumber = digits.replace(/(\d{4})(?=\d)/g, '$1-');
    }

    openModal() {
        this.form = this.emptyForm();
        if (this.paymentMethods().length === 0) {
            this.form.isDefault = true;
        }
        this.errorMessage.set('');
        this.showModal.set(true);
    }

    closeModal() {
        this.showModal.set(false);
    }

    submitForm() {
        this.errorMessage.set('');
        this.isSubmitting.set(true);

        const digits = this.form.cardNumber.replace(/\D/g, '');
        const last4 = digits.length >= 4 ? digits.slice(-4) : undefined;

        this.subService.createPaymentMethod({
            type: this.form.type,
            provider: this.form.provider || undefined,
            cardNumber: digits || undefined,
            last4,
            expiryMonth: this.form.expiryMonth,
            expiryYear: this.form.expiryYear,
            isDefault: this.form.isDefault
        }).subscribe({
            next: () => {
                this.isSubmitting.set(false);
                this.showModal.set(false);
            },
            error: () => {
                this.isSubmitting.set(false);
                this.errorMessage.set('Ocurrió un error al guardar el método de pago.');
            }
        });
    }
}

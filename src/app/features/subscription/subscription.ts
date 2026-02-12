import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Zap, CheckCircle2 } from 'lucide-angular';
import { SubscriptionService } from './services/subscription.service';
import { PlanCardComponent } from './components/plan-card/plan-card';
import { PaymentMethodsComponent } from './components/payment-methods/payment-methods';

@Component({
    selector: 'app-subscription',
    standalone: true,
    imports: [CommonModule, LucideAngularModule, PlanCardComponent, PaymentMethodsComponent],
    templateUrl: './subscription.html',
    styles: [`
    :host { display: block; }
  `]
})
export class SubscriptionComponent {
    subService = inject(SubscriptionService);

    plans = this.subService.plans;
    currentSubscriptionId = this.subService.currentSubscriptionId;
    currentCurrency = this.subService.currentCurrency;

    icons = { Zap, CheckCircle2 };

    ngOnInit() {
        // Simulate fetching current subscription
        this.subService.currentSubscriptionId.set(1); // Default to Basic
    }

    toggleCurrency(currency: 'USD' | 'PEN') {
        this.subService.setCurrency(currency);
    }

    selectPlan(planId: number) {
        if (confirm('¿Estás seguro de cambiar tu plan de suscripción?')) {
            this.subService.changePlan(planId).subscribe(() => {
                alert('Plan actualizado con éxito');
            });
        }
    }
}

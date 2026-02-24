import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Zap, CheckCircle2 } from 'lucide-angular';
import { SubscriptionService } from './services/subscription.service';
import { PlanCardComponent } from './components/plan-card/plan-card';
import { PaymentMethodsComponent } from './components/payment-methods/payment-methods';
import { AuthService } from '../../core/auth/auth.service';

@Component({
    selector: 'app-subscription',
    standalone: true,
    imports: [CommonModule, LucideAngularModule, PlanCardComponent, PaymentMethodsComponent],
    templateUrl: './subscription.html',
    styles: [`:host { display: block; }`]
})
export class SubscriptionComponent {
    private subService = inject(SubscriptionService);
    private authService = inject(AuthService);

    plans = this.subService.plans;
    currentSubscriptionId = this.subService.currentSubscriptionId;
    currentCurrency = this.subService.currentCurrency;

    currentPlan = computed(() =>
        this.plans().find(p => p.subscriptionId === this.currentSubscriptionId()) ?? null
    );

    currentPrice = computed(() => {
        const plan = this.currentPlan();
        if (!plan) return null;
        const currency = this.currentCurrency();
        return plan.prices.find(p => p.currency === currency) ?? null;
    });

    nextBillingDate = computed(() => {
        const plan = this.currentPlan();
        if (!plan) return null;
        const date = new Date();
        if (plan.periodUnit === 'MONTHLY') {
            date.setMonth(date.getMonth() + plan.paymentPeriod);
        } else if (plan.periodUnit === 'YEARLY') {
            date.setFullYear(date.getFullYear() + plan.paymentPeriod);
        }
        return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
    });

    icons = { Zap, CheckCircle2 };

    constructor() {
        const subscriptionId = this.authService.currentUser()?.subscriptionId ?? null;
        this.subService.currentSubscriptionId.set(subscriptionId);
        this.subService.loadPlans();
        this.subService.loadPaymentMethods();
    }

    toggleCurrency(currency: 'USD' | 'PEN') {
        this.subService.setCurrency(currency);
    }

    selectPlan(subscriptionId: string) {
        if (confirm('¿Estás seguro de cambiar tu plan de suscripción?')) {
            this.subService.changePlan(subscriptionId).subscribe(() => {
                alert('Plan actualizado con éxito');
            });
        }
    }
}

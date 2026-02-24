import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Zap, Loader2 } from 'lucide-angular';
import { forkJoin } from 'rxjs';
import { SubscriptionService, SubscriptionPlan } from './services/subscription.service';
import { PlanCardComponent } from './components/plan-card/plan-card';
import { PaymentMethodsComponent } from './components/payment-methods/payment-methods';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmModalService } from '../../core/services/confirm.service';

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
    private confirmService = inject(ConfirmModalService);

    plans = this.subService.plans;
    currentSubscriptionId = this.subService.currentSubscriptionId;
    currentCurrency = this.subService.currentCurrency;
    upcomingBilling = this.subService.upcomingBilling;
    isLoading = signal(false);

    currentPlan = computed(() =>
        this.plans().find(p => p.subscriptionId === this.currentSubscriptionId()) ?? null
    );

    billingPlanName = computed(() => {
        const billing = this.upcomingBilling();
        if (!billing) return null;
        return this.plans().find(p => p.subscriptionId === billing.subscriptionId)?.name ?? null;
    });

    icons = { Zap, Loader: Loader2 };

    constructor() {
        const subscriptionId = this.authService.currentUser()?.subscriptionId ?? null;
        this.subService.currentSubscriptionId.set(subscriptionId);

        this.isLoading.set(true);
        forkJoin([
            this.subService.loadPlans(),
            this.subService.loadPaymentMethods(),
            this.subService.loadUpcomingBilling()
        ]).subscribe({ next: () => this.isLoading.set(false), error: () => this.isLoading.set(false) });
    }

    toggleCurrency(currency: 'USD' | 'PEN') {
        this.subService.setCurrency(currency);
    }

    getUpgradeAmount(plan: SubscriptionPlan): number | null {
        const current = this.currentPlan();
        if (!current || plan.order <= current.order) return null;

        const currency = this.currentCurrency();
        const newPrice = plan.prices.find(p => p.currency === currency)?.price ?? 0;
        const oldPrice = current.prices.find(p => p.currency === currency)?.price ?? 0;

        const billing = this.subService.upcomingBilling();
        if (!billing) return newPrice;

        const today = new Date();
        const periodEnd = new Date(billing.billingPeriodEnd);
        const periodStart = new Date(billing.billingPeriodStart);
        const totalMs = periodEnd.getTime() - periodStart.getTime();
        const remainingMs = Math.max(0, periodEnd.getTime() - today.getTime());

        if (totalMs <= 0) return newPrice;

        const proportionalOldPrice = oldPrice * (remainingMs / totalMs);
        return Math.max(0, Math.round((newPrice - proportionalOldPrice) * 100) / 100);
    }

    statusClass(status: string): string {
        const map: Record<string, string> = {
            PENDING: 'bg-yellow-100 text-yellow-700',
            PAID:    'bg-green-100 text-green-700',
            OVERDUE: 'bg-red-100 text-red-700'
        };
        return map[status] ?? 'bg-gray-100 text-gray-600';
    }

    statusLabel(status: string): string {
        const map: Record<string, string> = {
            PENDING: 'Pendiente',
            PAID:    'Pagado',
            OVERDUE: 'Vencido'
        };
        return map[status] ?? status;
    }

    async selectPlan(subscriptionId: string) {
        const targetPlan = this.plans().find(p => p.subscriptionId === subscriptionId);
        if (!targetPlan) return;

        const confirmed = await this.confirmService.confirm({
            title: 'Cambiar plan',
            message: `¿Estás seguro de cambiar al ${targetPlan.name}?`,
            confirmText: 'Sí, cambiar',
            cancelText: 'Cancelar'
        });
        if (!confirmed) return;

        const current = this.currentPlan();
        const currency = this.currentCurrency();
        const newPrice = targetPlan.prices.find(p => p.currency === currency)?.price ?? 0;
        const amountPaid = (current && targetPlan.order > current.order)
            ? (this.getUpgradeAmount(targetPlan) ?? newPrice)
            : newPrice;

        this.isLoading.set(true);
        this.subService.updateSubscription({ subscriptionId, currency, amountPaid }).subscribe({
            next: async () => {
                if (current && targetPlan.order > current.order) {
                    this.subService.currentSubscriptionId.set(subscriptionId);
                }
                this.subService.loadUpcomingBilling().subscribe();
                this.isLoading.set(false);
                await this.confirmService.alert('Plan actualizado', 'Tu plan ha sido actualizado con éxito.');
            },
            error: async () => {
                this.isLoading.set(false);
                await this.confirmService.alert('Error', 'Ocurrió un error al actualizar el plan. Intenta nuevamente.');
            }
        });
    }
}

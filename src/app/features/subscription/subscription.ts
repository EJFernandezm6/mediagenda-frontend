import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Zap } from 'lucide-angular';
import { forkJoin } from 'rxjs';
import { SubscriptionService, SubscriptionPlan } from './services/subscription.service';
import { PlanCardComponent } from './components/plan-card/plan-card';
import { PaymentMethodsComponent } from './components/payment-methods/payment-methods';
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
    private confirmService = inject(ConfirmModalService);

    plans = this.subService.plans;
    currentSubscriptionId = this.subService.currentSubscriptionId;
    currentCurrency = this.subService.currentCurrency;
    upcomingBilling = this.subService.upcomingBilling;
    currentPlan = computed(() =>
        this.plans().find(p => p.subscriptionId === this.currentSubscriptionId()) ?? null
    );

    billingPlanName = computed(() => {
        const billing = this.upcomingBilling();
        if (!billing) return null;
        return this.plans().find(p => p.subscriptionId === billing.subscriptionId)?.name ?? null;
    });

    icons = { Zap };

    constructor() {
        forkJoin([
            this.subService.loadClinicInfo(),
            this.subService.loadPlans(),
            this.subService.loadPaymentMethods(),
            this.subService.loadUpcomingBilling()
        ]).subscribe();
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

        const clinic = this.subService.clinicInfo();
        const startAtStr = clinic?.startDate;
        const expiresAtStr = clinic?.expirationDate;

        if (!startAtStr || !expiresAtStr) return newPrice;

        const toDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

        const today = toDay(new Date());
        const periodStart = toDay(new Date(startAtStr));
        const periodEnd = toDay(new Date(expiresAtStr));
        const msPerDay = 86_400_000;
        const totalDays = Math.round((periodEnd.getTime() - periodStart.getTime()) / msPerDay);
        const remainingDays = Math.max(0, Math.round((periodEnd.getTime() - today.getTime()) / msPerDay));

        if (totalDays <= 0) return newPrice;

        const proportionalOldPrice = oldPrice * (remainingDays / totalDays);
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

        const isFreePlan = targetPlan.prices.every(p => p.price === 0);
        if (isFreePlan && this.subService.clinicInfo()?.hadFreePlan) {
            await this.confirmService.alert(
                'Plan no disponible',
                'Ya utilizaste el plan gratuito anteriormente. No es posible volver a seleccionarlo.'
            );
            return;
        }

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

        this.subService.updateSubscription({ subscriptionId, currency, amountPaid }).subscribe({
            next: async () => {
                if (current && targetPlan.order > current.order) {
                    this.subService.currentSubscriptionId.set(subscriptionId);
                }
                this.subService.loadUpcomingBilling().subscribe();
                await this.confirmService.alert('Plan actualizado', 'Tu plan ha sido actualizado con éxito.');
            },
            error: async () => {
                await this.confirmService.alert('Error', 'Ocurrió un error al actualizar el plan. Intenta nuevamente.');
            }
        });
    }
}

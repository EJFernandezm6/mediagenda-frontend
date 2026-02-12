import { Component, Input, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Check, Star, Zap, Crown } from 'lucide-angular';
import { SubscriptionPlan, SubscriptionService } from '../../services/subscription.service';

@Component({
    selector: 'app-plan-card',
    standalone: true,
    imports: [CommonModule, LucideAngularModule],
    template: `
    <div class="relative rounded-xl border p-6 shadow-sm flex flex-col h-full transition-all duration-200"
      [class.border-blue-500]="isCurrent"
      [class.bg-blue-50]="isCurrent"
      [class.border-gray-200]="!isCurrent"
      [class.hover:border-blue-300]="!isCurrent">
      
      <div *ngIf="isCurrent" class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wide rounded-full shadow-sm">
        Plan Actual
      </div>

      <h3 class="text-lg font-semibold text-gray-900">{{ plan.name }}</h3>
      <p class="text-sm text-gray-500 mt-1 h-10">{{ plan.description }}</p>

      <div class="mt-4 flex items-baseline text-gray-900">
        <span class="text-3xl font-bold tracking-tight">
          {{ displayPrice() }}
        </span>
        <span class="ml-1 text-sm font-semibold text-gray-500">/{{ plan.payment_period === 'MONTHLY' ? 'mes' : 'año' }}</span>
      </div>

      <ul role="list" class="mt-6 space-y-4 flex-1">
        <li *ngFor="let feature of plan.features" class="flex items-start">
          <lucide-icon [img]="checkIcon" class="h-5 w-5 flex-shrink-0 text-green-500"></lucide-icon>
          <span class="ml-3 text-sm text-gray-700">{{ feature }}</span>
        </li>
      </ul>

      <button (click)="onSelect()"
        [disabled]="isCurrent"
        [class.bg-blue-600]="!isCurrent"
        [class.text-white]="!isCurrent"
        [class.hover:bg-blue-700]="!isCurrent"
        [class.bg-blue-100]="isCurrent"
        [class.text-blue-800]="isCurrent"
        class="mt-8 block w-full py-2.5 px-4 border border-transparent rounded-lg text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:cursor-not-allowed transition-colors">
        {{ isCurrent ? 'Plan Actual' : 'Seleccionar Plan' }}
      </button>
    </div>
  `
})
export class PlanCardComponent {
    @Input({ required: true }) plan!: SubscriptionPlan;
    @Input() isCurrent = false;
    @Input({ required: true }) onSelect!: () => void;

    private subService = inject(SubscriptionService);

    checkIcon = Check;

    displayPrice = computed(() => {
        const currency = this.subService.currentCurrency();
        const priceObj = this.plan.prices.find(p => p.currency === currency);
        const symbol = currency === 'USD' ? '$' : 'S/';
        return priceObj ? `${symbol} ${priceObj.price}` : 'N/A';
    });
}

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-badge',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './badge.component.html',
})
export class BadgeComponent {
    @Input() variant: 'primary' | 'success' | 'warning' | 'danger' | 'neutral' = 'neutral';
    @Input() dot: boolean = false;

    get badgeClasses(): string {
        const baseClasses = 'inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold border transition-colors';

        const variantClasses = {
            primary: 'bg-accent-soft text-accent border-accent/20',
            success: 'bg-success-soft text-success border-success/20',
            warning: 'bg-warning-soft text-warning border-warning/20',
            danger: 'bg-danger-soft text-danger border-danger/20',
            neutral: 'bg-muted text-text-muted border-border-main'
        };

        return `${baseClasses} ${variantClasses[this.variant]}`;
    }

    get dotClasses(): string {
        const baseDot = 'w-1.5 h-1.5 rounded-full mr-2';

        const variantDots = {
            primary: 'bg-accent',
            success: 'bg-success',
            warning: 'bg-warning',
            danger: 'bg-danger',
            neutral: 'bg-text-muted'
        };

        return `${baseDot} ${variantDots[this.variant]}`;
    }
}

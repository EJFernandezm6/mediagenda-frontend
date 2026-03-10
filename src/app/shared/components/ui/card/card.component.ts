import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-card',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './card.component.html',
})
export class CardComponent {
    @Input() variant: 'elevated' | 'flat' | 'outline' = 'elevated';
    @Input() noPadding: boolean = false;

    get cardClasses(): string {
        const baseClasses = 'bg-surface rounded-3xl overflow-hidden transition-all';

        const variantClasses = {
            elevated: 'shadow-md hover:shadow-lg border border-border-soft',
            flat: 'bg-muted/50 border border-transparent',
            outline: 'bg-transparent border-2 border-border-main'
        };

        return `${baseClasses} ${variantClasses[this.variant]}`;
    }
}

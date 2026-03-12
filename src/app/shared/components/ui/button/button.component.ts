import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-button',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './button.component.html',
})
export class ButtonComponent {
    @Input() variant: 'primary' | 'accent' | 'success' | 'danger' | 'warning' | 'ghost' | 'outline' = 'primary';
    @Input() size: 'sm' | 'md' | 'lg' = 'md';
    @Input() type: 'button' | 'submit' = 'button';
    @Input() disabled: boolean = false;
    @Input() loading: boolean = false;
    @Input() fullWidth: boolean = false;

    @Output() onClick = new EventEmitter<MouseEvent>();

    get buttonClasses(): string {
        const baseClasses = 'inline-flex items-center justify-center font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed';

        const sizeClasses = {
            sm: 'px-3 py-2 text-[10px]',
            md: 'px-5 py-3 text-xs',
            lg: 'px-8 py-4 text-sm'
        };

        const variantClasses = {
            primary: 'bg-primary text-white hover:bg-primary-hover shadow-sm',
            accent: 'bg-accent text-white hover:bg-accent-hover shadow-sm',
            success: 'bg-success text-white hover:bg-success-hover shadow-lg shadow-success/10',
            danger: 'bg-danger text-white hover:bg-danger-hover shadow-lg shadow-danger/10',
            warning: 'bg-warning text-white hover:bg-warning-hover shadow-lg shadow-warning/10',
            ghost: 'bg-transparent text-text-muted hover:bg-muted font-semibold',
            outline: 'bg-transparent border-2 border-accent text-accent hover:bg-accent-soft'
        };

        return `
      ${baseClasses} 
      ${sizeClasses[this.size]} 
      ${variantClasses[this.variant]} 
      ${this.fullWidth ? 'w-full' : ''}
    `.trim();
    }

    handleButtonClick(event: MouseEvent): void {
        if (!this.disabled && !this.loading) {
            this.onClick.emit(event);
        }
    }
}

import { Injectable, signal } from '@angular/core';

export interface ConfirmData {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    showCancel?: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class ConfirmModalService {
    private isOpenSignal = signal(false);
    private dataSignal = signal<ConfirmData | null>(null);
    private resolveFn?: (value: boolean) => void;

    // Read-only signals for the modal component
    isOpen = this.isOpenSignal.asReadonly();
    data = this.dataSignal.asReadonly();

    /**
     * Opens a confirmation modal.
     * @returns A promise that resolves to true if the user confirms, and false if they cancel.
     */
    confirm(data: ConfirmData): Promise<boolean> {
        this.dataSignal.set({ ...data, showCancel: data.showCancel ?? true });
        this.isOpenSignal.set(true);

        return new Promise<boolean>((resolve) => {
            this.resolveFn = resolve;
        });
    }

    /**
     * Opens an alert modal (no cancel button).
     */
    alert(title: string, message: string): Promise<boolean> {
        return this.confirm({
            title,
            message,
            confirmText: 'Entendido',
            showCancel: false
        });
    }

    /**
     * Called by the modal component when the user clicks confirm.
     */
    onConfirm() {
        this.close(true);
    }

    /**
     * Called by the modal component when the user clicks cancel.
     */
    onCancel() {
        this.close(false);
    }

    private close(result: boolean) {
        this.isOpenSignal.set(false);
        if (this.resolveFn) {
            this.resolveFn(result);
        }
        this.dataSignal.set(null);
    }
}

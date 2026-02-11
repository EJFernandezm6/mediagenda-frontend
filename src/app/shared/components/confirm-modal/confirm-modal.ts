import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmModalService } from '../../../core/services/confirm.service';
import { LucideAngularModule, AlertTriangle, X } from 'lucide-angular';

@Component({
    selector: 'app-confirm-modal',
    standalone: true,
    imports: [CommonModule, LucideAngularModule],
    templateUrl: './confirm-modal.html',
    styleUrl: './confirm-modal.css'
})
export class ConfirmModalComponent {
    private confirmService = inject(ConfirmModalService);

    readonly Icons = { AlertTriangle, X };

    isOpen = this.confirmService.isOpen;
    data = this.confirmService.data;

    confirm() {
        this.confirmService.onConfirm();
    }

    cancel() {
        this.confirmService.onCancel();
    }
}

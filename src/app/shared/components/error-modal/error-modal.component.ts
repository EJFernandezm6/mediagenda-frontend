import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ErrorService } from '../../../core/services/error.service';
import { LucideAngularModule, AlertTriangle, ChevronDown, ChevronUp, XOctagon } from 'lucide-angular';

@Component({
    selector: 'app-error-modal',
    standalone: true,
    imports: [CommonModule, LucideAngularModule],
    templateUrl: './error-modal.component.html',
    styleUrls: ['./error-modal.component.css']
})
export class ErrorModalComponent {
    errorService = inject(ErrorService);

    icons = { AlertTriangle, ChevronDown, ChevronUp, XOctagon };
    showTechnicalDetails = false;

    get error() {
        return this.errorService.getError();
    }

    close() {
        this.showTechnicalDetails = false;
        this.errorService.clearError();
    }

    toggleDetails() {
        this.showTechnicalDetails = !this.showTechnicalDetails;
    }
}

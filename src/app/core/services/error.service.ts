import { Injectable, signal } from '@angular/core';

export interface AppError {
    businessMessage: string;
    technicalDetails?: {
        status?: number;
        errorType?: string;
        path?: string;
        timestamp?: string;
        rawMessage?: string;
        validationErrors?: any[];
    } | null;
}

@Injectable({
    providedIn: 'root'
})
export class ErrorService {
    private currentError = signal<AppError | null>(null);

    /**
     * Muestra el modal de error con un mensaje de negocio y, opcionalmente, 
     * detalles técnicos.
     */
    showError(error: AppError) {
        this.currentError.set(error);
    }

    /**
     * Limpia el estado de error, cerrando el modal.
     */
    clearError() {
        this.currentError.set(null);
    }

    /**
     * Obtiene el flujo reactivo del error actual.
     */
    getError() {
        return this.currentError();
    }
}

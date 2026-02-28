import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { ErrorService, AppError } from './error.service';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

/**
 * Interceptor global para capturar errores HTTP y delegarlos al ErrorService
 * para ser mostrados en el ErrorModalComponent.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
    const errorService = inject(ErrorService);

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            let appError: AppError = {
                businessMessage: 'Ha ocurrido un error inesperado de comunicación con el servidor.',
                technicalDetails: {
                    status: error.status,
                    path: error.url || 'Desconocida',
                    rawMessage: error.message
                }
            };

            // Si el error viene de nuestro backend usando ErrorResponse
            if (error.error && typeof error.error === 'object') {
                const backendError = error.error;

                // Custom mapping logic
                if (backendError.message) {
                    appError.businessMessage = backendError.message; // Mensaje de negocio amigable
                }

                appError.technicalDetails = {
                    status: backendError.status || error.status,
                    errorType: backendError.error || error.name,
                    path: backendError.path || error.url || 'Desconocida',
                    timestamp: backendError.timestamp || new Date().toISOString(),
                    rawMessage: backendError.message || error.message,
                    validationErrors: backendError.validationErrors || []
                };
            } else if (error.status === 0) {
                // Network Error or CORS
                appError.businessMessage = 'Error de conexión. Verifica tu conexión a internet o el servidor puede estar caído.';
                appError.technicalDetails!.errorType = 'Network/CORS Error';
            }

            // Evita interceptar si es una ruta específica donde queremos manejar nosotros el error
            // ej: Login Auth. (Opcional)
            // if (!req.url.includes('/auth/login')) {
            errorService.showError(appError);
            // }

            return throwError(() => error);
        })
    );
};

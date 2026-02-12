import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ConfirmModalService } from '../services/confirm.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
    const confirmService = inject(ConfirmModalService);

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            // Check for connection errors (status 0) or server errors (5xx)
            if (error.status === 0 || (error.status >= 500 && error.status < 600)) {
                let message = 'No se pudo conectar con el servidor. Por favor, verifique su conexión o intente más tarde.';

                if (error.status !== 0) {
                    message = `Error del servidor (${error.status}). Por favor contacte a soporte si el problema persiste.`;
                }

                // Use the Alert method we added to ConfirmModalService
                confirmService.alert('Problema de Servicio', message);
            }
            return throwError(() => error);
        })
    );
};

import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { ConfirmModalService } from '../services/confirm.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
    const confirmService = inject(ConfirmModalService);
    const router = inject(Router);

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            // Check for 401 Unauthorized (Token expired/invalid)
            if (error.status === 401) {
                // Ignore 401s from login endpoint itself to prevent loops or weird UX
                if (!req.url.includes('/auth/login')) {
                    confirmService.alert('Sesión Expirada', 'Su sesión ha expirado. Por favor inicie sesión nuevamente.')
                        .then(() => {
                            // Perform logout logic
                            localStorage.removeItem('user');
                            localStorage.removeItem('token');
                            router.navigate(['/auth/login']);
                        });
                    // Return empty to stop propagation? Or rethrow?
                    // Rethrowing might trigger other error handlers. 
                    // Usually for 401 we want to stop the flow.
                    return throwError(() => error);
                }
            }

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

import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
// 1. IMPORTAR ESTO:
import { provideHttpClient, withFetch } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter([]),
    // 2. AGREGAR ESTO AQUÍ:
    provideHttpClient(withFetch()) 
  ]
}; 
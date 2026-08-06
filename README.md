# React + Tailwind

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules. One top of the standard Vite setup, [tailwindcss](https://tailwindcss.com/) is installed and ready to be used in React components.

Additional references:
* [Getting started with Vite](https://vitejs.dev/guide/)
* [Tailwind documentation](https://tailwindcss.com/docs/installation)


## TALLER BIIB ERP — Sprint 2

Cambios incluidos:
- Dashboard ejecutivo exclusivo para Bibi y Salvador.
- Suni continúa con acceso operativo a remisiones y cambio de estados.
- Indicadores de ventas, cobros, gastos, flujo, adeudos y trabajos activos.
- Costos fijos mensuales visibles: nómina, renta, auto e internet.
- Identidad actualizada a TALLER BIIB ERP.

> Nota: el flujo disponible es una estimación de cobros menos gastos capturados. Todavía no descuenta automáticamente todos los costos variables por servicio.


## TALLER BIIB ERP v2.3 - Gastos simplificados

El formulario de gastos incluye únicamente Concepto y Cantidad. Conceptos disponibles: Oro, Plata, Plateado, Broches, Soldadura, Seguetas, Herramientas taller, Gasolina, Renta, Internet, Auto, Papelería, Publicidad, Estacionamiento y Otro.

## TALLER BIIB ERP v2.4 — Sincronización multidispositivo

- Gastos se descargan desde Google Sheets al iniciar sesión y al presionar Sincronizar.
- Después de registrar un gasto, la app vuelve a consultar la nube.
- Configuración del negocio incorpora un botón para guardarla en Google Sheets.
- Se incluye `GOOGLE_APPS_SCRIPT_SINCRONIZACION.gs` con las funciones necesarias para actualizar el Apps Script existente.

La app mantiene compatibilidad con el Apps Script anterior: si el GET devuelve solamente un arreglo, seguirá cargando remisiones. Para sincronizar gastos y configuración es obligatorio actualizar y volver a desplegar Google Apps Script.

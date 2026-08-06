# TALLER BIIB ERP v2.5 — Métodos de pago

## Cambios visibles

- Al capturar un anticipo se elige **Efectivo** o **Transferencia**.
- Al entregar una nota aparece una ventana para elegir cómo se liquidó el saldo.
- Al registrar un gasto se elige **Efectivo** o **Transferencia**.
- El historial de gastos muestra el método utilizado.

## Datos en Google Sheets

El Apps Script crea o amplía estas hojas:

- `Gastos`: agrega la columna `MetodoPago`.
- `Movimientos`: registra anticipos y liquidaciones con folio, importe y método.

Las remisiones existentes no se eliminan ni se cambian.

## Actualización del Apps Script de desarrollo

1. Abre el Apps Script conectado a la copia de desarrollo.
2. Copia las funciones de `GOOGLE_APPS_SCRIPT_METODOS_PAGO.gs`.
3. Integra los bloques indicados en `doGet(e)` y `doPost(e)`.
4. Ve a **Implementar > Administrar implementaciones**.
5. Edita la implementación, elige **Nueva versión** y presiona **Implementar**.
6. Prueba primero en `taller-biib-erp-dev.vercel.app`.

## Pruebas recomendadas

1. Crear una nota con anticipo en efectivo.
2. Crear otra con anticipo por transferencia.
3. Marcar una nota como entregada y elegir el método de liquidación.
4. Registrar un gasto en efectivo y otro por transferencia.
5. Confirmar que la hoja `Movimientos` y la columna `MetodoPago` en `Gastos` se llenen.

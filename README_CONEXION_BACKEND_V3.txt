TALLER BIIB ERP — APP DEV CONECTADA AL BACKEND v3

URL configurada:
https://script.google.com/macros/s/AKfycbxJnXRcX0VxxM6AlU1yhW450cnhlyZ1DCre-jqvHNimFcO9bNjZoP-PaKaVppkbj3b93A/exec

CAMBIOS:
- Sincronización GET usa accion=sincronizar_completo.
- Crear remisión usa accion=crear_remision.
- El backend registra el anticipo y el movimiento en una sola operación.
- Entregar usa accion=actualizar_estado y registra la liquidación una sola vez.
- Gastos usan accion=registrar_gasto.
- Concepto Otro se envía como concepto=Otro y conceptoOtro=<texto>.
- Datos de Remisiones, Gastos y Servicios se normalizan al formato de la app.

PRUEBAS:
1. Crear nota sin anticipo.
2. Crear nota con anticipo en efectivo.
3. Crear nota con anticipo por transferencia.
4. Entregar una nota con saldo.
5. Registrar gasto en efectivo y transferencia.
6. Revisar hojas Remisiones, Movimientos y Gastos.

FOTOS:
Para que las fotos se guarden en Drive, el backend debe llamar guardarFotoBase64_ desde crearRemision_
y tener la propiedad FOTOS_FOLDER_ID configurada.

/**
 * TALLER BIIB ERP v2.4
 * Funciones de sincronización para Gastos y Configuración.
 *
 * IMPORTANTE:
 * 1) Copia estas funciones en el proyecto de Google Apps Script que ya usa la app.
 * 2) Integra los bloques indicados dentro de tu doGet(e) y doPost(e) actuales.
 * 3) Vuelve a implementar la aplicación web como "Nueva versión".
 */

function obtenerHojaOCrearla_(nombre, encabezados) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName(nombre);
  if (!hoja) hoja = ss.insertSheet(nombre);
  if (hoja.getLastRow() === 0) hoja.appendRow(encabezados);
  return hoja;
}

function leerGastos_() {
  const hoja = obtenerHojaOCrearla_("Gastos", ["Fecha", "Hora", "Usuario", "Concepto", "Categoria", "Monto"]);
  const valores = hoja.getDataRange().getValues();
  if (valores.length <= 1) return [];
  return valores.slice(1).filter(f => f.some(v => v !== "")).map(f => ({
    fecha: normalizarFecha_(f[0]),
    hora: String(f[1] || ""),
    usuario: String(f[2] || ""),
    concepto: String(f[3] || ""),
    categoria: String(f[4] || "Otros"),
    monto: Number(f[5] || 0),
  })).reverse();
}

function guardarGasto_(datos) {
  const hoja = obtenerHojaOCrearla_("Gastos", ["Fecha", "Hora", "Usuario", "Concepto", "Categoria", "Monto"]);
  hoja.appendRow([
    datos.fecha || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd"),
    datos.hora || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "HH:mm"),
    datos.usuario || "",
    datos.concepto || "Otro",
    datos.categoria || "Otros",
    Number(datos.monto || 0),
  ]);
}

function leerConfiguracion_() {
  const hoja = obtenerHojaOCrearla_("Configuracion", ["Clave", "Valor", "ActualizadoPor", "FechaActualizacion"]);
  const valores = hoja.getDataRange().getValues();
  const configuracion = {};
  valores.slice(1).forEach(f => {
    if (f[0] !== "") configuracion[String(f[0])] = Number(f[1]);
  });
  return configuracion;
}

function guardarConfiguracion_(configuracion, usuario) {
  const hoja = obtenerHojaOCrearla_("Configuracion", ["Clave", "Valor", "ActualizadoPor", "FechaActualizacion"]);
  const claves = ["sueldoBibi", "sueldoSalvador", "sueldoSuni", "renta", "auto", "internet", "diasTrabajo"];
  const ahora = new Date();
  const valoresActuales = hoja.getDataRange().getValues();
  const filasPorClave = {};
  valoresActuales.slice(1).forEach((fila, indice) => filasPorClave[String(fila[0])] = indice + 2);

  claves.forEach(clave => {
    const fila = [clave, Number(configuracion[clave] || 0), usuario || "", ahora];
    if (filasPorClave[clave]) hoja.getRange(filasPorClave[clave], 1, 1, 4).setValues([fila]);
    else hoja.appendRow(fila);
  });
}

function normalizarFecha_(valor) {
  if (Object.prototype.toString.call(valor) === "[object Date]" && !isNaN(valor)) {
    return Utilities.formatDate(valor, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(valor || "");
}

function respuestaJson_(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON);
}

/*
AGREGA ESTE BLOQUE AL INICIO DE TU doGet(e), antes del retorno actual:

  if (e && e.parameter && e.parameter.tipo === "sincronizar_completo") {
    const remisiones = obtenerRemisionesExistentes_(); // Sustituye por la función que ya usa tu script.
    return respuestaJson_({
      remisiones: remisiones,
      gastos: leerGastos_(),
      configuracion: leerConfiguracion_(),
    });
  }

Si tu doGet actual ya obtiene las remisiones en una variable, usa esa misma variable en lugar de
obtenerRemisionesExistentes_().
*/

/*
AGREGA ESTOS CASOS A TU doPost(e), después de convertir e.postData.contents a "datos":

  if (datos.tipo === "nuevo_gasto") {
    guardarGasto_(datos);
    return respuestaJson_({ status: "success" });
  }

  if (datos.tipo === "guardar_configuracion") {
    guardarConfiguracion_(datos.configuracion || {}, datos.usuario || "");
    return respuestaJson_({ status: "success" });
  }
*/

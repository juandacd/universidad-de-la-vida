/**
 * Webhook de preinscripción — "Universidad de la Vida"
 * Google Apps Script vinculado (bound) a una Hoja de cálculo de Google.
 *
 * Recibe los campos del formulario (application/x-www-form-urlencoded):
 *   nombre, celular, correo, edad, barrio, como, autorizacion
 * El campo "website" es un honeypot oculto (los bots suelen rellenarlo).
 *
 * Respuesta siempre en JSON mediante ContentService.
 *   Éxito:            {"ok":true}
 *   Duplicado:        {"ok":true,"duplicado":true}
 *   Error validación: {"ok":false,"error":"mensaje"}
 */

// Nombre de la hoja destino. Se crea automáticamente si no existe.
var SHEET_NAME = 'Inscripciones';

// Zona horaria para la marca de tiempo.
var TIMEZONE = 'America/Bogota';

// Encabezados de la hoja (fila 1), en negrilla y congelados.
var HEADERS = [
  'Fecha y hora',
  'Nombres y apellidos',
  'Celular',
  'Correo',
  'Rango de edad',
  'Barrio o municipio',
  'Cómo se enteró',
  'Autorización'
];

/**
 * Devuelve una respuesta JSON con el tipo MIME correcto.
 * @param {Object} obj Objeto a serializar.
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Obtiene la hoja "Inscripciones"; si no existe (o está vacía) la crea
 * con encabezado en negrilla y primera fila congelada.
 * @return {GoogleAppsScript.Spreadsheet.Sheet}
 */
function getOrCreateSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  // Si la primera fila no tiene encabezado, lo escribe con formato.
  var headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  var current = headerRange.getValues()[0];
  if (current.join('').replace(/\s/g, '') === '') {
    headerRange.setValues([HEADERS]);
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  return sheet;
}

/**
 * Punto de entrada para envíos POST del formulario.
 * @param {Object} e Evento con e.parameter (campos del formulario).
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function doPost(e) {
  try {
    var p = (e && e.parameter) || {};

    // Honeypot: si el campo oculto "website" viene con contenido, es un bot.
    // Se ignora en silencio pero se responde ok:true para no delatar el filtro.
    if (p.website && String(p.website).trim() !== '') {
      return jsonResponse({ ok: true });
    }

    // Normalización de entradas.
    var nombre = String(p.nombre || '').trim();
    var celular = String(p.celular || '').replace(/\D/g, ''); // solo dígitos
    var correo = String(p.correo || '').trim();
    var edad = String(p.edad || '').trim();
    var barrio = String(p.barrio || '').trim();
    var como = String(p.como || '').trim();
    var autorizacion = String(p.autorizacion || '').trim().toLowerCase();

    // Validaciones del lado del servidor.
    if (!nombre) {
      return jsonResponse({ ok: false, error: 'El nombre es obligatorio.' });
    }
    if (!celular) {
      return jsonResponse({ ok: false, error: 'El celular es obligatorio.' });
    }
    if (!/^3\d{9}$/.test(celular)) {
      return jsonResponse({ ok: false, error: 'El celular debe tener 10 dígitos y empezar por 3.' });
    }
    if (!edad) {
      return jsonResponse({ ok: false, error: 'El rango de edad es obligatorio.' });
    }
    if (autorizacion !== 'si') {
      return jsonResponse({ ok: false, error: 'Debes autorizar el tratamiento de datos.' });
    }

    // Bloqueo para evitar colisiones por escrituras concurrentes.
    var lock = LockService.getScriptLock();
    lock.waitLock(30000); // espera hasta 30 s

    try {
      var sheet = getOrCreateSheet();

      // Verificación de duplicado por celular (columna 3).
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        var existing = sheet.getRange(2, 3, lastRow - 1, 1).getValues();
        for (var i = 0; i < existing.length; i++) {
          if (String(existing[i][0]).replace(/\D/g, '') === celular) {
            return jsonResponse({ ok: true, duplicado: true });
          }
        }
      }

      var fecha = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
      sheet.appendRow([fecha, nombre, celular, correo, edad, barrio, como, 'Sí']);
      SpreadsheetApp.flush();

      return jsonResponse({ ok: true });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return jsonResponse({ ok: false, error: 'Error interno del servidor: ' + err });
  }
}

/**
 * Comprobación de que el servicio está activo.
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function doGet() {
  return jsonResponse({ ok: true, servicio: 'inscripciones' });
}

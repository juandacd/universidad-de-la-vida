# Webhook de preinscripción (Google Apps Script)

Este script recibe los envíos del formulario de preinscripción y los guarda en
la hoja **Inscripciones** de la Hoja de cálculo de Google a la que está
vinculado (script *bound*). Expone dos funciones web:

- `doPost(e)`: recibe `nombre`, `celular`, `correo`, `edad`, `barrio`,
  `encuentro`, `como`, `autorizacion` (y el honeypot oculto `website`). Valida
  los datos, evita duplicados por celular y guarda la fila.
- `doGet()`: comprobación de estado; responde
  `{"ok":true,"servicio":"inscripciones"}`.

Todas las respuestas son JSON. Cuando todo va bien responde `{"ok":true}`, si el
celular ya existe responde `{"ok":true,"duplicado":true}` y si hay un error de
validación responde `{"ok":false,"error":"mensaje"}`.

## Requisitos previos

- Una Hoja de cálculo de Google (crea una nueva o usa una existente).
- Una cuenta de Google con permiso para editar esa hoja.

## Pasos para publicar

### 1. Abrir Apps Script desde la hoja

1. Abre tu Hoja de cálculo de Google.
2. En el menú superior haz clic en **Extensiones** > **Apps Script**.
   Se abrirá el editor de Apps Script en una pestaña nueva.

### 2. Pegar el código

1. En el editor verás un archivo `Código.gs` (o `Code.gs`) con una función
   `myFunction` de ejemplo. **Borra todo** su contenido.
2. Abre el archivo `apps-script/Code.gs` de este repositorio, copia **todo** su
   contenido y pégalo en el editor.
3. Guarda con el icono del disquete o `Ctrl + S`. Puedes renombrar el proyecto
   (arriba a la izquierda) si lo deseas, por ejemplo "Preinscripciones".

### 3. Desplegar como aplicación web

1. Haz clic en el botón azul **Implementar** (*Deploy*) >
   **Nueva implementación** (*New deployment*).
2. Junto a "Seleccionar tipo", haz clic en el icono de engranaje ⚙️ y elige
   **Aplicación web** (*Web app*).
3. Completa los campos:
   - **Descripción**: por ejemplo `preinscripciones v1` (opcional).
   - **Ejecutar como** (*Execute as*): **Yo** (*Me*).
   - **Quién tiene acceso** (*Who has access*): **Cualquier usuario**
     (*Anyone*).
4. Haz clic en **Implementar** (*Deploy*).

> Nota: en la vista actual de Apps Script el flujo es
> **Implementar** > **Nueva implementación**. En vistas antiguas aparece como
> **Publicar** > **Implementar como aplicación web**. El resultado es el mismo.

### 4. Autorizar permisos

La primera vez Google pedirá autorización:

1. Clic en **Autorizar acceso** (*Authorize access*).
2. Elige tu cuenta de Google.
3. Como el script no está verificado, puede aparecer "Google no ha verificado
   esta aplicación". Haz clic en **Configuración avanzada** (*Advanced*) y
   luego en **Ir a <nombre del proyecto> (no seguro)** (*Go to ... (unsafe)*).
4. Revisa los permisos (necesita administrar tus Hojas de cálculo) y haz clic
   en **Permitir** (*Allow*).

### 5. Copiar la URL del servicio

1. Al terminar el despliegue verás la **URL de la aplicación web**
   (*Web app URL*).
2. Cópiala: termina en **`/exec`**, por ejemplo
   `https://script.google.com/macros/s/AKfy......../exec`.
3. Pégala en el front-end (el `<script>` del formulario en `index.html`) como
   destino del `POST`. Si abres esa URL en el navegador deberías ver
   `{"ok":true,"servicio":"inscripciones"}`.

## Actualizar el código sin cambiar la URL

Cuando modifiques `Code.gs` y quieras publicar los cambios **manteniendo la
misma URL `/exec`**, crea una nueva versión:

1. En el editor de Apps Script, haz clic en **Implementar** (*Deploy*) >
   **Administrar implementaciones** (*Manage deployments*).
2. A la derecha, en la implementación activa, haz clic en el icono de **lápiz**
   (✏️ *Edit*).
3. En **Versión** (*Version*) elige **Nueva versión** (*New version*).
4. (Opcional) Escribe una descripción de los cambios.
5. Haz clic en **Implementar** (*Deploy*).

La URL `/exec` no cambia; a partir de ese momento sirve la nueva versión del
código.

## Updating the script

To publish changes to `Code.gs` **without changing the `/exec` URL**:

1. In the Apps Script editor, click **Deploy** > **Manage deployments**.
2. On the active deployment, click the **pencil icon** (✏️ *Edit*).
3. Under **Version**, choose **New version**.
4. (Optional) Add a description of the changes.
5. Click **Deploy**.

The `/exec` URL stays the same; it will now serve the new version of the code.

## Probar el endpoint (opcional)

Desde una terminal (reemplaza la URL por la tuya):

```bash
curl -L -X POST \
  -d "nombre=Ana Pérez" \
  -d "celular=3001234567" \
  -d "correo=ana@example.com" \
  -d "edad=18 a 25 años" \
  -d "barrio=Centro" \
  -d "como=Redes sociales" \
  -d "autorizacion=si" \
  "https://script.google.com/macros/s/AKfy......../exec"
```

Respuesta esperada: `{"ok":true}`. Si vuelves a enviarlo con el mismo celular:
`{"ok":true,"duplicado":true}`.

Para comprobar que está activo, abre la URL `/exec` en el navegador (usa `GET`).

## Notas y consideraciones

- El campo **`celular`** debe tener 10 dígitos y empezar por 3 (formato
  colombiano). Se guardan solo los dígitos.
- La columna **`edad`** almacena el rango seleccionado (p. ej. "18 a 25 años"),
  no una edad numérica.
- El campo **`encuentro`** se guarda en la última columna, **Encuentro**
  ("Mujeres" o "Hombres"). Si llega vacío se acepta por ahora (compatibilidad
  temporal) y se guarda vacío; si trae otro valor se rechaza con
  `{"ok":false,"error":"Encuentro inválido"}`. El encabezado de esta columna se
  agrega automáticamente a hojas ya existentes sin afectar los datos previos.
- El honeypot **`website`** debe ser un campo oculto en el formulario. Si llega
  con contenido, el envío se descarta en silencio respondiendo `{"ok":true}`.
- Si el front-end hace la petición desde otro dominio, ten en cuenta las
  restricciones de CORS de las aplicaciones web de Apps Script (un `<form>`
  con POST normal suele funcionar sin configuración extra).

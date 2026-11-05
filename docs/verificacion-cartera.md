# Verificación de cartera — 5 de noviembre de 2026

Rama `fix/portfolio-entry-flow`, basada en `feature/public-data-connectors` (PR #2). No fusionar ni publicar automáticamente.

## Correcciones

- Guardar un producto abre Operaciones con ese producto seleccionado, también cuando ya existen otros productos.
- Al editar una compra, cambiar entre importe y participaciones conserva el precio implícito de la operación y las unidades introducidas. No sustituye el precio ejecutado por la valoración actual.
- Corregir participaciones conserva el registro de conversión FX. Cambiar producto, tipo, fecha, importe o comisión de una operación FX se rechaza con explicación: este formulario no permite recalcular la conversión original. No se elimina su evidencia silenciosamente.

## Evidencia

- 143 pruebas automatizadas, incluyendo compra de 100 EUR a 25 EUR, comisión de 1 EUR, venta de una participación por 30 EUR con comisión de 0,50 EUR, y dividendo de 2 EUR. Con valoración de 30 EUR, quedan 3 participaciones, valor de 90 EUR y resultado total de 20,50 EUR. Se comprueba también el paso por JSON y el rechazo de sobreventa.
- Navegador Chromium local, sin Supabase ni proveedores habilitados: alta de dos ISIN con respuestas de mercado simuladas, selección automática del segundo producto, compra por importe y comisión, cambio de modos al editar, guardado y recarga. Sin errores de página.
- Inspección visual en escritorio de 1440 px y móvil de 390 px; sin desbordamiento horizontal de la página. Las tablas mantienen su desplazamiento interno.
- Prueba real separada: BCE (tipo de depósito y EUR/USD) respondió con datos válidos; CFTC agotó el timeout; SEC no configurado. No se considera probado el funcionamiento continuo de estas fuentes.

## Activación pendiente

La conexión Vercel disponible en esta revisión muestra el equipo DeadEmber, no el proyecto Finanzas de va-gorgasal. No se han verificado ni cambiado sus variables.

Revisar PR #1, #2 y esta corrección en ese orden. Antes de publicar, configurar `ENABLE_PUBLIC_INTELLIGENCE=true`, `SEC_USER_AGENT` con aplicación y contacto técnico real y `CRON_SECRET` aleatorio de al menos 24 caracteres; comprobar también las variables existentes de sesión y servicios. No enviar secretos al chat.

La prueba visual usa una cartera ficticia y respuestas ISIN simuladas. Quedan por verificar con un backend de prueba: búsqueda EODHD real, inicio/cierre de sesión, separación entre dos usuarios y sincronización entre dispositivos. Los clientes anteriores no leen la copia completa v4: no conectar la preview a perfiles reales de producción para esta prueba. La tarea cron diaria solo se activa con el despliegue de producción y su configuración.

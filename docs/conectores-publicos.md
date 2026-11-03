# Conectores públicos · 0.9.1-dev

Implementación sobre la primera entrega de KPI, en rama de desarrollo. No cambia operaciones, autenticación, esquema de Supabase o RLS. No conecta noticias, IA, EODHD ni fuentes de pago adicionales.

## Qué conecta

- BCE: facilidad de depósito (`FM.D.U2.EUR.4F.KR.DFR.LEV`) y EUR/USD de referencia (`EXR.D.USD.EUR.SP00.A`). Hasta 260 observaciones, con unidad y multiplicador verificados. El FX indica USD por EUR, no EUR por USD. Fecha observada y consulta al origen separadas; publicación desconocida se conserva como null.
- CFTC: informe desagregado **futures-only**, dataset `72hh-3qpy`, categoría Managed Money. Oro COMEX `088691`, cobre COMEX `085692` y WTI físico NYMEX `067651`. Neto = largos − cortos; porcentaje = neto/interés abierto. Variación semanal solo con dos observaciones separadas por exactamente siete días del mismo contrato. Un contrato ausente no vale cero.
- SEC: historial reciente de Soros Fund Management, CIK `0001029160`, originales 13F-HR y enmiendas 13F-HR/A. Obtiene tablas XML de los dos últimos trimestres originales consecutivos, con límites de tamaño y tiempo. Agrega por CUSIP, clase, PUT/CALL y SH/PRN; no mezcla valores distintos. La conversión de miles a USD depende de la fecha de presentación anterior a 2023-01-03, no del periodo de la cartera. Compara cantidades declaradas, no variación de valor. Las enmiendas de cualquiera de los periodos bloquean posiciones y comparación hasta su conciliación. Si falta XML compatible se conserva el listado de declaraciones y se explica el límite.

No se buscan tickers por nombres ni se atribuyen estas posiciones a la cartera del usuario. Un cambio en cantidades 13F no demuestra compraventas: puede reflejar operaciones corporativas y omite posiciones confidenciales o no reportables. Las opciones 13F incluyen cantidades y valores declarados según las reglas del formulario, no una valoración actual de la prima.

## Configuración de servidor

| Variable | Uso |
| --- | --- |
| `ENABLE_PUBLIC_INTELLIGENCE=true` | Activa los nuevos endpoints. Por defecto quedan desactivados. |
| `SEC_USER_AGENT` | Nombre de aplicación y correo técnico real, ASCII, sin saltos de línea. No usar ejemplos ni dominios inventados. Si falta, solo SEC queda pendiente. No es una API key. |
| `CRON_SECRET` | Secreto aleatorio de al menos 24 caracteres para la tarea diaria. Generarlo y guardarlo directamente como secreto del entorno; nunca en git ni en el navegador. |

`/api/intelligence` exige además los servicios y la sesión no anónima existentes (`ENABLE_REMOTE_FEATURES`, configuración Supabase y cuota `market`). Primero se autoriza la sesión; después se consulta la caché pública. No ampliar permisos ni desactivar autenticación para probar una preview.

Configurar primero un entorno de pruebas aislado. Esta rama hereda copias completas v4 del motor de KPI: no iniciar sesión con cuentas reales en previews que compartan los datos de producción con clientes antiguos. Ninguna variable nueva lleva `NEXT_PUBLIC_`.

## Caché, actualización e histórico

La Data Cache de Next conserva **resultados públicos normalizados y la hora original de recuperación**, sin tokens ni datos de cartera. TTL: BCE seis horas; CFTC y SEC una hora. La caché revalida en segundo plano; una respuesta anterior conserva sus fechas y una revalidación fallida conserva el resultado válido. Una respuesta API puede preceder al resultado de la revalidación; no demuestra por sí sola que el origen acaba de responder. No es un almacén permanente de revisiones ni un histórico infinito: BCE devuelve una ventana de observaciones y COT conserva las semanas consultadas para comparar. Persistir vintages y ampliar históricos queda pendiente.

El contexto del cliente comparte una consulta entre resumen y detalle, cancela peticiones al cambiar de cuenta y consulta cada 30 minutos cuando la pestaña está visible. En fallo de la API conserva la respuesta anterior de esa vista con un aviso. También conserva, marcada para revisar, una fuente anterior si una respuesta parcial llega sin datos para ella. Fuente indisponible, configuración pendiente y dato antiguo se distinguen; no se rellenan con ejemplos. Las edades de observación de FX y COT se advierten con tolerancias de siete y catorce días; el tipo oficial BCE sin cambios no caduca por la antigüedad de la decisión. Una recuperación de más de un día se marca para revisar.

`vercel.json` prepara `/api/cron/intelligence` una vez al día, a las **07:00 UTC (08:00 en invierno / 09:00 en verano en Madrid)**. La ruta valida el Bearer de `CRON_SECRET`, marca las etiquetas para revalidar y solicita la lectura, que desencadena la actualización en segundo plano. Devuelve `revalidation_requested` y los estados observados, que pueden ser de caché; no afirma que la revalidación acaba de completarse. Registra fallos sin cabeceras ni secretos. Es una actualización de caché, no una notificación o recomendación. El horario es compatible con la frecuencia diaria de Hobby, pero su ejecución no tiene precisión de minuto ni reintentos garantizados. Aumentar frecuencia requiere revisar el plan y las cuotas.

Los cron de Vercel se ejecutan sobre producción: **esta PR no activa una tarea en el entorno real**. No se ha hecho un despliegue de producción. La programación solo entrará en vigor cuando se configure y publique expresamente. Una fuente SEC sin contacto se informa pendiente sin impedir que BCE/CFTC se actualicen.

## Seguridad y verificación

- Destinos HTTPS fijos y allowlist de cuatro hosts; sin URLs, CIK ni símbolos arbitrarios desde el cliente. Redirecciones rechazadas, timeout por llamada y tamaño máximo de 3 MB. SEC tiene presupuesto total de 40 segundos.
- XML con rechazo de DTD/ENTITY, validación sintáctica, límite de profundidad y nombres de archivo restringidos al directorio de la declaración. No se ejecuta HTML ni se siguen destinos incluidos en XML.
- No se envía cartera, email del usuario, saldos o identificadores de cuenta a estas fuentes. El contacto técnico configurado solo se envía a SEC como User-Agent.
- Pruebas unitarias sin red con datos explícitamente ficticios. `npm run sources:check` es un diagnóstico real independiente del build y de CI; consulta BCE/CFTC y SEC si existe contacto configurado. Puede exportar la respuesta pública mediante `--output /ruta/snapshot.json`. No imprime el contacto.
- En runtimes locales Node 24 detrás de un proxy, usar su soporte oficial `NODE_USE_ENV_PROXY=1`; mantener certificados y política de red del entorno. No es necesario en un despliegue con conexión directa.

## Fuentes metodológicas

[BCE API](https://data.ecb.europa.eu/help/api/data), [CFTC COT](https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm), [dataset desagregado](https://publicreporting.cftc.gov/stories/s/Disaggregated-Futures/ubmb-6exi/), [SEC API](https://www.sec.gov/search-filings/edgar-application-programming-interfaces), [FAQ 13F y cambio de unidades](https://www.sec.gov/rules-regulations/staff-guidance/frequently-asked-questions-about-form-13f), [Data Cache](https://nextjs.org/docs/app/api-reference/functions/unstable_cache), [revalidateTag](https://nextjs.org/docs/app/api-reference/functions/revalidateTag), [cron Vercel](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

La arquitectura deja las observaciones disponibles para una futura explicación con fuentes; no añade llamadas de IA ni recomendaciones automáticas. FRED, VIX, crédito, gestoras, flujos de ETF y noticias siguen sujetos al [catálogo de fuentes y sus límites](fuentes-datos.md).

# Fuentes para la segunda entrega

Revisión documental: 2 de noviembre de 2026. Este catálogo identifica fuentes y accesos; **no acredita una conexión ejecutada, cobertura de una suscripción ni permiso de redistribución**. No se han utilizado claves del usuario, contratado servicios ni activado conectores. El motor KPI sigue funcionando con importaciones.

## Selección

| Necesidad | Fuente seleccionada | Acceso | Frecuencia del dato | Pendiente antes de activar |
| --- | --- | --- | --- | --- |
| Tipos oficiales BCE y EUR/divisas | BCE Data Portal | API SDMX, CSV/JSON, sin clave en las consultas documentadas | Cambios de tipos / días hábiles para FX | Probar respuesta y metadatos desde servidor; atribución BCE |
| Tipo real Treasury a 10 años | Federal Reserve H.15 | Descarga oficial XML/SDMX | Diaria hábil | Seleccionar serie real a 10 años y validar unidades |
| Balance Fed | Federal Reserve H.4.1 | Descarga oficial XML/SDMX | Semanal | Total de activos, nivel del miércoles, no promedio semanal |
| Dólar amplio ponderado por comercio | Federal Reserve H.10 | Descarga oficial XML/SDMX | Observaciones diarias, publicación con retraso | Usar índice amplio; no etiquetarlo DXY |
| Rango objetivo Fed | FOMC / publicación oficial | Comunicados y datos oficiales | Decisiones de política | Guardar límites y fecha de entrada en vigor; no sustituir por EFFR |
| Tipo efectivo Fed | New York Fed | Página/datos de EFFR | Diaria hábil | Acceso automatizado y condiciones del origen; es un indicador distinto del rango objetivo |
| Condiciones financieras | Chicago Fed NFCI | Publicación oficial y descarga disponible en su web | Semanal | Verificar descarga y condiciones del origen; conservar revisiones |
| VIX | Cboe, origen de la serie | Producto de datos bajo condiciones del proveedor | Según contrato; cierre diario como mínimo viable | Permiso para mostrar a otros usuarios; no inferirlo de su presencia en FRED |
| Spread high yield | ICE Data Indices, origen de la serie | Producto de datos bajo condiciones del proveedor | Cierre diario | Acceso e histórico permitidos para la aplicación |
| COT | CFTC | Public Reporting Environment y archivos CSV oficiales | Semanal, normalmente viernes con posiciones del martes | Escoger familia y contratos; no mezclar futures-only con combined |
| Posiciones institucionales | SEC EDGAR | Submissions JSON + archivos de declaraciones | Trimestral y enmiendas al publicarse | Contacto técnico identificable, tratamiento de 13F-HR/A y comparación de periodos |
| Cuentas empresariales publicadas | SEC EDGAR Company Facts | XBRL JSON, sin API key | Al publicarse cada declaración | Mapear conceptos/unidades/periodos; no son estimaciones de analistas |
| Fundamentales, consenso e históricos por instrumento | EODHD, ya previsto en el proyecto | API de servidor con EODHD_API_KEY | Según campo y cobertura | Comprobar plan, símbolo/ISIN, fechas y derechos de visualización multiusuario |
| Composición de fondos europeos | Gestora del producto y clase exactos | Fichas, informes anuales/semestrales y descargas de posiciones | Según publicación | Resolver cada ISIN y documento; cobertura parcial explícita |
| Flujos de ETF de oro | World Gold Council Goldhub | Datos web y XLSX mensual | Web semanal/mensual; XLSX mensual | Condiciones de uso, descarga e importador; no hay API pública verificada aquí |
| Flujos agregados de fondos/ETF | Investment Company Institute | Publicaciones estadísticas | Estimaciones semanales y datos mensuales | Cobertura, acceso histórico y condiciones; no equivale a flujos diarios por sector |
| Noticias oficiales | RSS de BCE, Fed, SEC y CNMV | Feeds publicados por cada institución | Según publicación | Verificar cada feed, uso permitido y deduplicación |
| Informativo financiero general | Marketaux como candidato adicional; EODHD como opción existente | API con token, filtros por entidades y lenguaje | Según plan | Cuenta/plan y derechos de contenido, conservación e interpretación; no activado |

## Accesos oficiales comprobados en documentación

### BCE

- [API y parámetros](https://data.ecb.europa.eu/help/api/data).
- [Ejemplos oficiales](https://data.ecb.europa.eu/help/api/data-examples).
- [Tipo de la facilidad de depósito](https://data.ecb.europa.eu/data/datasets/FM/FM.D.U2.EUR.4F.KR.DFR.LEV): `FM.D.U2.EUR.4F.KR.DFR.LEV`, porcentaje anual. La serie corresponde a fechas de cambio; un tipo sin cambios no es automáticamente un dato desactualizado.
- FX diario: `EXR.D.USD.EUR.SP00.A`, USD por EUR. Invertir el valor para convertir USD a EUR, conservando la fecha; no invertir dos veces.

Consulta de ejemplo, construida con la sintaxis documentada; todavía sin prueba de integración:

```text
https://data-api.ecb.europa.eu/service/data/EXR/D.USD.EUR.SP00.A?lastNObservations=2&format=csvdata
```

### Reserva Federal y FRED

- [H.15: tipos](https://www.federalreserve.gov/datadownload/Choose.aspx?rel=H15).
- [H.4.1: balance](https://www.federalreserve.gov/datadownload/Choose.aspx?rel=H41).
- [H.10: divisas e índices](https://www.federalreserve.gov/datadownload/Choose.aspx?rel=H10).
- [EFFR de New York Fed](https://www.newyorkfed.org/markets/reference-rates/effr).
- [NFCI de Chicago Fed](https://www.chicagofed.org/research/data/nfci/current-data).

La Fed anuncia la retirada de «Build Your Package» la semana del 9 de noviembre de 2026, preparando la retirada del DDP. **No construir una integración nueva dependiente de ese formulario.** Las páginas consultadas ofrecen paquetes XML/SDMX comprimidos; evaluar tamaño, selección de series y sucesor antes de programar descargas. No descargarlos completos en cada visita de un usuario.

Identificadores FRED útiles para conciliar la definición del dato, sin activar su API:

| ID | Significado y unidad |
| --- | --- |
| [DFII10](https://fred.stlouisfed.org/series/DFII10) | Treasury real a 10 años, porcentaje |
| [WALCL](https://fred.stlouisfed.org/series/WALCL) | Total de activos Fed, millones de USD, nivel del miércoles |
| [DTWEXBGS](https://fred.stlouisfed.org/series/DTWEXBGS) | Índice nominal amplio USD, enero de 2006 = 100; no es DXY |
| [DFEDTARL](https://fred.stlouisfed.org/series/DFEDTARL) / [DFEDTARU](https://fred.stlouisfed.org/series/DFEDTARU) | Límites inferior/superior del rango objetivo, porcentaje |
| [NFCI](https://fred.stlouisfed.org/series/NFCI) | Índice semanal: positivo, condiciones más restrictivas que su media |
| [VIXCLS](https://fred.stlouisfed.org/series/VIXCLS) | Índice VIX, cierre diario, origen Cboe |
| [BAMLH0A0HYM2](https://fred.stlouisfed.org/series/BAMLH0A0HYM2) | OAS high yield ICE BofA en porcentaje; ×100 para puntos básicos |

FRED **no queda aprobado como almacén de datos para esta arquitectura**. Sus [condiciones vigentes](https://fred.stlouisfed.org/legal/) incluyen restricciones de API sobre almacenamiento/caché/archivo y desarrollo o entrenamiento de sistemas de IA. La documentación de [claves](https://fred.stlouisfed.org/docs/api/api_key.html) también indica claves propias por usuario. Aclarar el uso previsto con el proveedor antes de implementar histórico compartido o explicaciones de IA basadas en ese acceso. Obtener el dato del origen tiene sus propias condiciones, que deben revisarse; no hereda automáticamente permisos.

VIX e ICE tienen derechos de terceros. La ficha de ICE en FRED indica además que desde abril de 2026 solo ofrece tres años de observaciones. No prometer una profundidad histórica mayor por esa vía.

### CFTC y SEC

- [COT: informes, CSV y explicación del acceso sin token](https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm).
- [Calendario de COT](https://www.cftc.gov/MarketReports/CommitmentsofTraders/ReleaseSchedule/index.htm): normalmente viernes 15:30 de Nueva York; no codificar una hora UTC fija ni asumir que no hay festivos.
- [Portal público](https://publicreporting.cftc.gov/stories/s/r4w3-av2u): API y exportaciones. Resolver y fijar el dataset y sus columnas durante la implementación; este catálogo no inventa un identificador de dataset.
- [APIs SEC](https://www.sec.gov/search-filings/edgar-application-programming-interfaces): `https://data.sec.gov/submissions/CIK##########.json` y `https://data.sec.gov/api/xbrl/companyfacts/CIK##########.json`.
- [Preguntas oficiales sobre 13F](https://www.sec.gov/rules-regulations/staff-guidance/frequently-asked-questions-about-form-13f).

Los endpoints de lectura SEC no requieren clave. Consultar desde servidor con identidad/contacto técnico reales y respetar su política de acceso. Submissions localiza las declaraciones; las posiciones 13F están en sus tablas de información, no en Company Facts. No tratar cambios de valor declarado como compras/ventas: conciliar títulos, clases, opciones, ajustes y enmiendas. Periodo observado y fecha de presentación deben mostrarse por separado. El 13F es una foto retrasada y parcial, no la cartera actual completa.

COT mide posiciones agregadas de futuros y opciones. No es un flujo de dinero hacia acciones ni permite identificar la tesis de un gestor individual.

### EODHD y gestoras

- [Fundamentales por tipo de instrumento](https://eodhd.com/financial-apis/stock-etfs-fundamental-data-feeds).
- [Condiciones](https://eodhd.com/financial-apis/terms-conditions) y [uso personal frente a comercial](https://eodhd.com/financial-apis/commercial-vs-personal-license-use).
- [Catálogo oficial BlackRock para particulares](https://www.blackrock.com/es/particulares/productos/lista-de-producto).
- [Ejemplo de ficha oficial Nordea Global Listed Infrastructure](https://www.nordea.lu/documents/monthly-report---fact-sheet/MR_N1_GLIF_BP_USD_eng_INT.pdf): ejemplo de fuente, **no asignar la clase BP-USD a otro ISIN** ni asumir que el archivo tiene el mes más reciente.

EODHD documenta acciones globales y ETF, pero su apartado de fondos se refiere a fondos estadounidenses. No prometer fundamentales o posiciones de cualquier fondo UCITS europeo porque el buscador encuentre su ISIN. Estimaciones forward y precios objetivo requieren consenso de un proveedor: los estados financieros SEC no contienen ese consenso.

Las fichas de gestoras pueden contener solo las diez mayores posiciones. Registrar fecha del periodo, fuente, clase y cobertura. No normalizar esos diez pesos a 100%. Una descarga accesible no acredita permiso para redistribuirla a todos los usuarios. Revisar condiciones por gestora/proveedor; no hay una API universal gratuita verificada para estos fondos.

### Oro y otros flujos

- [World Gold Council: holdings y flujos de ETF](https://www.gold.org/goldhub/data/gold-etfs-holdings-and-flows): XLSX mensual, observaciones en toneladas y USD; publicaciones web semanales/mensuales.
- [Condiciones WGC](https://www.gold.org/terms-and-conditions).
- [ICI: emisión neta estimada de ETF](https://www.ici.org/research/statistics/etfs/weekly-estimated-etf-net-issuance).
- [ICI: estadísticas y publicaciones](https://www.ici.org/research/statistics).

ICI aporta agregados útiles; no se ha verificado aquí un feed abierto de flujos diarios para cada sector. Ni volumen negociado, ni variación de activos gestionados ni variación de capitalización equivalen por sí solos a suscripciones netas. El módulo sectorial queda pendiente hasta disponer de datos y universo comparables.

### Noticias

- [RSS BCE](https://www.ecb.europa.eu/home/html/rss.en.html).
- [RSS Fed](https://www.federalreserve.gov/feeds/feeds.htm).
- [RSS SEC](https://www.sec.gov/about/rss-feeds).
- [RSS CNMV](https://www.cnmv.es/portal/gpage?id=RSS).
- [Marketaux: documentación](https://www.marketaux.com/documentation): `GET https://api.marketaux.com/v1/news/all`, filtros de entidades, idioma `es,en` y fecha; token de servidor requerido. Candidato para la portada general, no contratado ni conectado.

Los RSS oficiales cubren decisiones y comunicaciones, pero no sustituyen por sí solos un informativo financiero general. Verificar los feeds concretos y las condiciones antes de agregar; enlazar la fuente y no copiar cuerpos completos ni imágenes sin permiso. Para relacionar noticias con fondos se necesita su composición publicada; no basta con buscar el nombre comercial. La similitud temática no demuestra impacto causal ni exposición económica.

## Orden de conexión propuesto

1. BCE: tipos y FX, sin una nueva clave. Primer conector pequeño y verificable.
2. CFTC y SEC: COT y 13F, conservando fechas y archivos originales cuando se permita. No requieren comprar una API; SEC necesita contacto técnico.
3. Fed/Chicago Fed directos: cerrar formatos de descarga y transición del DDP antes de automatizar.
4. EODHD: probar cobertura con la configuración existente y confirmar permisos del uso multiusuario; no pedir ni duplicar la clave en el frontend.
5. Gestoras: resolver ISIN/clase/documento y medir cobertura real. Oro: importador XLSX conforme a permisos.
6. Noticias: RSS oficiales más un proveedor general con derechos compatibles. VIX, crédito y flujos sectoriales permanecen pendientes si no hay acceso adecuado.

No habilitar nuevas variables de licencia por el mero hecho de localizar una URL. `EODHD_API_KEY`, `MARKET_RESEARCH_LICENSE_CONFIRMED` y `NEWS_LICENSE_CONFIRMED` ya son nombres usados en el proyecto; este documento no los cambia. `FRED_API_KEY` y `MARKETAUX_API_KEY` no están implementadas como nuevas integraciones en esta entrega documental.

## Contrato de datos para implementar

Cada observación debe incluir identificador/definición, valor o null, unidad, divisa si procede, fuente original, URL, periodo observado, fecha de publicación conocida o null, fecha de recuperación y disponibilidad. No sustituir publicación desconocida por la hora de consulta. Mantener versión/revisión e histórico solo donde esté permitido. Diferenciar una serie observada cada día de una publicada cada semana.

Las pruebas de integración deberán confirmar respuesta real, formato, unidades, acceso y cobertura antes de cambiar el estado a conectado. Error, falta de permiso, dato ausente y dato antiguo son estados diferentes. Conservar la última observación válida y su fecha si el proveedor falla, sin presentarla como recién publicada. Los calendarios de actualización seguirán a cada fuente; consultar cada minuto no crea nuevos datos trimestrales.

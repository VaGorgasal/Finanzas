# Motor de KPI · primera entrega

No cambia `calculatePortfolio`, la validación del libro ni la TIR existente. Todos los resultados personales usan operaciones y valoraciones declaradas. Ningún conector externo se activa en esta entrega.

## Rendimiento y alcance

- Resultado acumulado = valor de mercado + ventas netas + dividendos netos − compras con costes. Se separan ventas realizadas, dividendos y latente.
- Porcentaje sobre compras acumuladas, no anualizado; no se etiqueta como TWR.
- XIRR: se reutiliza `portfolioIrr` / ACT/365, importes EUR normalizados, compras con costes negativas, ventas netas/dividendos positivas y valoración final. Se conservan los rechazos de fechas incompatibles, menos de 30 días y signos con raíz no verificable.
- TWR: encadenamiento geométrico de un **índice de rentabilidad total unitarizado importado**, declarado por su fuente, que ya neutraliza los flujos externos. El motor no reconstruye ni verifica esa unitarización; no aceptar un saldo bruto ni una cotización sin ajustes como índice de cartera. La firma liga el archivo al libro, pero no certifica su exactitud. Una edición del libro suspende los KPI de esa serie. La valoración diaria, mensual y anual muestra las fechas realmente comparadas y requiere cierre previo al periodo (tolerancia conservadora de siete días); el anual es año natural hasta última observación, no una proyección anualizada.
- Con saldos históricos sin valoraciones en cada flujo, **TWR no disponible**. El historial de snapshots de la aplicación no se convierte en índice. El efectivo ocioso está fuera del universo analizado, igual que en la TIR existente.
- Drawdown sobre el índice ajustado aportado, nunca sobre el saldo bruto. Máximo *observado*, no máximo anterior al inicio de la serie. Duraciones y recuperación en días naturales. Episodios abiertos distinguidos de recuperados.
- Volatilidad muestral de rendimientos diarios simples, anualizada con √252. Ventanas de 30/90/252 intervalos requieren N+1 observaciones; no se anualizan ventanas con huecos mayores que siete días. El calendario diario y el ajuste por flujos se declaran en la importación: no se verifica automáticamente la integridad del calendario del mercado.
- Correlaciones de Pearson con ambos extremos del intervalo alineados. No se rellenan precios ausentes. Series constantes: correlación indefinida. Contribución = wᵢ(Cw)ᵢ/σ usando covarianza anualizada y pesos actuales constantes; puede ser negativa. Solo con el 100% de posiciones abiertas cubiertas, precios de una fecha común y muestra común suficiente. Es riesgo hipotético con pesos actuales, no atribución histórica.
- Benchmark elegido por usuario para cartera o instrumento, rentabilidad total en EUR y fechas comunes. No se presupone un índice adecuado ni se comparan monedas distintas. No calcula alfa ni rentabilidad relativa sectorial sin una serie asignada.

## Formato de análisis

`AnalysisData` en `data.ts` y estructura descargable desde `/analisis#datos`. JSON hasta 900 KB; 15 series, 1500 puntos por serie. `version: 1`, `portfolioSignature`, `series`, `benchmarkId`, `metadata`, `longTermIds`, `collateral`. Los valores de ejemplo no se incorporan al perfil.

Cada serie declara `scope` (portfolio/instrument/benchmark), `instrumentId` para instrumentos, `currency: EUR`, `basis: unitized-total-return`, `calendar: trading-daily`, `source` HTTPS, `asOf` (periodo observado), `publishedAt` o null si no se conoce, `updatedAt`, y `points` ordenados sin duplicados `{date,value}` positivos, con cero permitido únicamente como último punto para una pérdida terminal total. Puede asignar `benchmarkId`. Convertir las series extranjeras a rentabilidad total EUR con FX fechado antes de importar; no basta con cambiar la etiqueta de moneda. No introducir precios sin ajustar por dividendos.

La firma del libro es un identificador de coherencia, **no criptográfico ni una autorización**. Se conserva separada de los datos públicos de mercado. Datos de una cartera distinta no se aceptan en el importador. Cambiar solo la cotización actual no cambia la firma.

Metadatos directos: `{instrumentId,source,date,traits}`. `traits` admite sector, country, region, currency (exposición económica, no la moneda de la participación), assetClass y themes. Los identificadores/categorías deben ser consistentes entre fuentes. No se adivinan clasificaciones del nombre o del ISIN.

## Composición y estrés

El formato de composición anterior se conserva, con `traits` opcional en cada posición. Peso parcial desconocido = 100 menos suma publicada. Se agregan posiciones con el mismo ID; emisiones distintas no se fusionan como la misma empresa sin un identificador común declarado. Un fondo/ETF no hereda a sus posiciones las características del envoltorio. Las temáticas se pueden solapar, su suma no representa un total de cartera.

Estrés lineal de una dimensión/exposición seleccionada: impacto conocido = exposición × choque entre −100% y +100%. El resto no recibe un choque; lo desconocido se informa como no modelizado, nunca como exposición cero o inmune. No incluye elasticidades, correlaciones de crisis, derivados o escenarios de múltiples choques simultáneos.

Liquidez y objetivos reutilizan `analyzePlan`, sin rendimientos ni ingresos futuros inciertos. Inversiones de largo plazo marcables expresamente. Pignoración opcional importada: deuda, fuente y fecha de condiciones, posiciones y coeficiente elegible de cada banco. LTV = deuda/valor de mercado; cobertura = valor elegible/deuda; margen = valor elegible−deuda. No se presume la política de un banco ni que el caso importe toda la deuda del plan.

## Persistencia y compatibilidad

Clave `brujula-analysis-v1` dentro del espacio de cada UUID, monitorizada por la sincronización existente. Copia completa v4: lee v1–v3 y conserva la nueva clave en exportación/restauración. Restauraciones antiguas sustituyen el análisis por uno vacío solo después de la confirmación general existente. Rollback de las siete claves si falla una escritura. Clientes anteriores rechazan v4, evitando que borren silenciosamente datos nuevos; no mezclar despliegues viejos y nuevos. Límite global de backup del servidor sigue siendo 2 MB. No se cambia SQL/RLS ni se amplía acceso.

## Diagnóstico y siguientes entregas

`config.ts`: umbrales educativos de revisión. Cada diagnóstico declara observado, fecha/fuente, cambio o ausencia de comparación, afectados, interpretación, incertidumbre y faltantes. Incluye dependencias altas y cambios de correlación entre ventanas no solapadas (hasta cinco avisos por vista), y divergencia frente al benchmark elegido. No genera órdenes, recomendaciones automáticas ni explicaciones de IA. Falta de históricos, composición parcial y datos antiguos siempre visibles.

La primera entrega no conecta macro, COT, oro, flujos sectoriales, 13F ni fundamentales. Las tarjetas de mercado/posicionamiento indican esta ausencia. No son datos cero ni ejemplos presentados como actualidad. La siguiente entrega debe implementar conectores independientes con sus calendarios de publicación, claves servidor, caché/histórico normalizado y tareas programadas; incluye el informativo de Noticias pendiente. Los KPI fundamentales por tipo de activo dependen de esa segunda entrega. No se contratan servicios.

## Referencias metodológicas

- CFA Institute, GIPS Handbook: https://www.gipsstandards.org/standards/gips-standards-for-firms/gips-standards-handbook-for-firms/ (valoración en flujos y encadenamiento). Esta herramienta no afirma cumplimiento GIPS.
- Definiciones, tamaños mínimos y convenciones del motor están documentados arriba; los umbrales no son una prueba de idoneidad.

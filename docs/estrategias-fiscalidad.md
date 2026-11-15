# Laboratorio y fiscalidad: núcleo v1

## Funciones

- `/estrategias`: copia inicial de la cartera real o demo, productos nuevos solo
  para la simulación (reutiliza búsqueda ISIN), compras, ventas/reembolsos y traspasos.
- Comparador con mantener: inversiones, efectivo, costes, concentración por
  producto, cuota incremental y reserva. Aportaciones disponibles al inicio en
  ambas alternativas; no se infieren ingresos futuros del plan. Se comprueba
  financiación por fecha y orden: una venta posterior no financia una compra anterior.
- Hipótesis de precio explícitas por instrumento. Sin probabilidades, predicciones,
  dividendos futuros ni atribución a factores macro. Capital final bajo hipótesis
  incluye efectivo y descuenta reserva incremental; el ahorro fiscal no es caja inmediata.
- Cada guardado añade una versión, preservando tesis, riesgos, decisión,
  alternativas, fuentes fechadas, cartera inicial, supuestos y resultados.
  Revisar una versión no modifica las anteriores. Cambiar la fotografía inicial
  exige crear otra estrategia. Exportación y eliminación explícitas.
- `/fiscalidad`: mismo libro de operaciones, proyección FIFO independiente del
  coste medio económico existente. Ventas parciales, comisiones, continuidad del
  coste y fecha en traspasos acreditados, dividendos brutos/retenciones, dos cestas
  del ahorro, límite cruzado del 25%, saldos de los cuatro ejercicios anteriores
  y mínimo personal pendiente de aplicar al ahorro.

## Reglas, evidencia y límites fiscales

Versión `ES-common-savings-2025-2026-v1`, verificada 2026-11-12. Solo régimen común
2025–2026; no extrapola reglas a 2027. Tipos conjuntos 19/21/23/27/30%.
Fuente: Ley 35/2006, artículos 33.5, 35, 37.2, 49, 66, 76 y 94:
https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764&p=20260930&tn=1

Referencias de contraste:
https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-ayuda-presentacion/irpf-2025/8-cumplimentacion-irpf/8_4-cuota-integra/8_4_4-gravamen-base-liquidable-ahorro.html
https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c12-integracion-compensacion-rentas/reglas-integracion-compensacion-rentas/integracion-compensacion-rentas-base-imponible-ahorro.html

El impuesto es `null` si faltan régimen, historial completo, orden del mismo día,
conciliación bruto/retención/neto o evidencias. No se infieren lotes desde una
rentabilidad personal. La confirmación de historial comprende todos los
intermediarios para una misma titularidad, costes, acciones societarias y saldos.
Los importes deben estar convertidos a EUR en la fecha de cada operación; el
original FX de operaciones reales se conserva. No se calcula ganancia adicional
por tenencia de saldos de divisas.

**Pérdidas por recompra:** requieren revisión documental y un importe deducible
acotado a la pérdida. Revisar ventanas anteriores/posteriores (dos meses o un año
según admisión a negociación), otras cuentas y valores homogéneos. NO automatiza
asignación de pérdidas suspendidas ni liberación posterior. Los traspasos necesitan
acreditar elegibilidad fiscal; que el producto sea fondo no es suficiente. Los
resultados FIFO son provisionales cuando hay incidencias de historial o traspaso.

No soporta regímenes forales/especiales, múltiples titularidades mezcladas,
herencias, donaciones, derivados, corporate actions sin reconstruir ni deducción
por doble imposición. Cuota del ahorro no equivale a saldo de la declaración.
Esta entrega no declara completo todo el bloque fiscal del prompt maestro.

## Persistencia y despliegue

Reutiliza `workspaceStorage`, `ProfileSync` y RLS de `user_backups`. Nuevas claves
por usuario: `brujula-strategies-v1`, `brujula-tax-v1`. Copia completa v5 lee v1–v4
sin inventar historial. El indicador superior informa el estado real de guardado.
En modo local hay que exportar; demo no se sincroniza. El historial es versionado
en la aplicación, NO un registro inmutable de servidor ni certificado criptográfico.

Máximo 100 versiones / 500 KB de historial; se rechaza exceso sin purga silenciosa.
El límite del perfil completo existente es 2 MB en Supabase. La sincronización
conserva cambios locales y muestra conflicto si falla. Para escalar es necesaria
una migración a tablas de versiones por usuario. Antes de publicar: exportar copia,
cerrar clientes anteriores y actualizar todos a v5 (clientes v4 rechazan v5).
No se modifica esquema SQL ni se despliega producción automáticamente.

## Correcciones KPI

Cadencia conservadora para estadísticas anualizadas diarias: intervalos de 1–4
días y al menos 60% de intervalos de un día. Correlaciones/riesgo requieren también
continuidad de intervalos comunes. No es un calendario oficial de bolsas; festivos
largos pueden producir ausencia de cálculo. Series semanales ya no se anualizan
con 252 sesiones. La alerta de antigüedad usa la última observación, no asOf/updatedAt.

## Caso histórico

Nvidia 1.000 + Intel 325 + Meta 560 = 1.885 EUR de ventas. Amundi S&P500 1.000 +
Polar 885 = 1.885 EUR de compras: no queda margen para comisiones ni reserva.
BNP Energy & Metals 685,05 EUR se mantiene. Los porcentajes históricos no bastan
para reconstruir FIFO; faltan compras, fechas, costes y clases/ISIN exactos.
Añadir aseguradoras exige financiación explícita. No se cargan datos personales
ni supuestos de adquisición inventados en la cartera real.

## Backlog y contratos

| Siguiente trabajo | Dependencias y contrato | Aceptación |
| --- | --- | --- |
| Fiscalidad avanzada | `DeferredLoss {saleId, homogeneousGroup, units, amount, releaseEvents, evidence}`; titularidad/intermediario | Recompras parciales anteriores/posteriores y liberación entre ejercicios concilian con casos oficiales; sin doble deducción. |
| Historial escalable | `StrategyVersion {userId, strategyId, revision, snapshot, engineVersion, result, createdAt}`; migración RLS | Inserción/lectura propias, sin UPDATE de versiones, borrado explícito, concurrencia y restauración. |
| Fase 2, exposiciones | `IssuerExposure {issuerId, shareClassId, weight, source, observedAt, publishedAt, coverage}`; mapa canónico | Cobertura conocida + desconocida = 100%; no duplicar clases. Reutilizar agregación existente. |
| Fase 2, multifactor | `FactorAssumption {factor, shock, unit, horizon, source, version}`; coeficientes justificados | Ocho escenarios, tornado y sensibilidad reproducibles; sin doble impacto FX/beneficios/múltiplos. |
| Fase 3, macro/sectores | `Observation {metric, value, unit, currency, observedAt, publishedAt, retrievedAt, vintage, source, coverage, status}` | Excluir datos publicados después de fecha simulada; stocks/flows y bruto/neto separados; no equiparar Solvencia II y SST. |
| Fase 4, revisiones | `StrategyReview {versionId, reviewedAt, actualOperationIds, benchmarkId, observedOutcome, evidence}` | Comparar a 30/90/180/365 días con mismos flujos/costes y tesis original conservada. |
| Fase 4, IA | `Claim {text, kind, citations, checkedAt, status}`; fuentes y cálculos anteriores | Hechos/hipótesis separados, citas verificadas, preferencias declaradas separadas de conducta observada. |

## Verificación

Pruebas automatizadas de FIFO, comisiones, traspasos, dividendos, datos incompletos,
pérdidas revisadas, tramos, compensación, financiación cronológica, snapshots,
versiones, copias y KPI. Ejecutar test, lint sin warnings, build y typecheck.
Revisar además UI de escritorio/móvil y restauración en navegador. No probar con
cuentas reales ni ejecutar órdenes de inversión.

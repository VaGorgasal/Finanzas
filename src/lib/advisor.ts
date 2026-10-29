import type {PortfolioState,PortfolioSummary} from './types';
export type InvestorProfile={goal:'aprender'|'vivienda'|'jubilación'|'patrimonio'; horizonYears:number; emergencyMonths:number; lossTolerance:'baja'|'media'|'alta'};
export type Advice={id:string;priority:'alta'|'media'|'informativa';title:string;evidence:string;meaning:string;action:string;href:string};
export const defaultProfile:InvestorProfile={goal:'aprender',horizonYears:5,emergencyMonths:0,lossTolerance:'media'};
export function parseProfile(value:unknown):InvestorProfile|null {
 if(!value || typeof value!=='object')return null;
 const p=value as InvestorProfile;
 if(!['aprender','vivienda','jubilación','patrimonio'].includes(p.goal) || !['baja','media','alta'].includes(p.lossTolerance) || !Number.isInteger(p.horizonYears) || p.horizonYears<0 || p.horizonYears>50 || !Number.isFinite(p.emergencyMonths) || p.emergencyMonths<0 || p.emergencyMonths>60)return null;
 return {goal:p.goal,horizonYears:p.horizonYears,emergencyMonths:p.emergencyMonths,lossTolerance:p.lossTolerance};
}
/** Umbrales de revisión del producto; no constituyen una asignación óptima ni un test de idoneidad. */
export function analyzePortfolio(state:PortfolioState, summary:PortfolioSummary, profile:InvestorProfile|null, today:string):Advice[] {
 const out:Advice[]=[];
 const add=(id:string,priority:Advice['priority'],title:string,evidence:string,meaning:string,action:string,href='/cartera')=>out.push({id,priority,title,evidence,meaning,action,href});
 if(state.demoMode){add('demo','alta','Estás analizando una demostración','La cartera está marcada como ficticia.','No permite extraer conclusiones sobre tu situación real.','Empieza una cartera personal o importa tus datos.');return out;}
 if(!profile)add('profile','media','Completa tu contexto','No has guardado objetivo, plazo ni capacidad para asumir pérdidas.','No se puede valorar si la cartera encaja con tus necesidades.','Completa el formulario de esta pantalla.','#perfil');
 if(profile){
  if(profile.emergencyMonths<3)add('reserve','alta','Revisa tu reserva para imprevistos',
   'Has indicado '+profile.emergencyMonths+' meses de gastos cubiertos. El aviso se activa por debajo de 3 meses.',
   'Es un dato declarado, no un saldo bancario verificado. Tu necesidad depende de estabilidad laboral, deudas y gastos.',
   'Calcula tus gastos esenciales y comprueba qué liquidez tienes disponible antes de comprometer más dinero.','#perfil');
  if(profile.horizonYears<=3)add('horizon','alta','Tu objetivo tiene un plazo corto',
   'Objetivo: '+profile.goal+'. Plazo declarado: '+profile.horizonYears+' años. Umbral de revisión: 3 años.',
   'Una caída cerca de la fecha de uso puede obligarte a vender con pérdidas. No conocemos el riesgo interno de cada fondo.',
   'Separa el dinero que necesitarás en esa fecha y revisa la estabilidad y disponibilidad de los productos que lo financian.','#perfil');
 }
 const active=summary.holdings.filter(h=>h.units>1e-8);
 if(!active.length){add('empty','media','Añade tus posiciones para empezar','No hay participaciones abiertas registradas.','El motor solo puede revisar la información que aportes.','Añade productos y operaciones reales o importa tu copia.');return out;}
 const demo=active.filter(h=>h.instrument.quoteSource==='demo');
 const stale=active.filter(h=>(Date.parse(today+'T12:00:00Z')-Date.parse(h.instrument.priceDate+'T12:00:00Z'))/86400000>7);
 if(demo.length)add('quotes','alta','Faltan valoraciones reales',demo.map(h=>h.instrument.name).join(', '),'Estas posiciones conservan precios ficticios. No se calculan pesos ni concentración con ellos.','Introduce precios reales o consulta EODHD desde Cambiar precio.');
 if(stale.length)add('stale','media','Actualiza precios antiguos',stale.length+' posiciones tienen una valoración de más de 7 días naturales.','Los 7 días son un umbral orientativo de esta app; un fondo puede publicar con retraso. Los pesos reflejan fechas distintas.','Comprueba la fecha del último valor disponible y actualiza las valoraciones.');
 const unknown=active.filter(h=>h.instrument.category==='otro');
 if(unknown.length)add('classification','media','Falta clasificar parte de la cartera',unknown.length+' de '+active.length+' productos no tienen una categoría informativa.','No se pueden medir bien los sectores ni los solapamientos. El número de fondos no demuestra diversificación.','Comprueba las fichas y asigna una categoría al añadir el producto. La categoría no sustituye el análisis de sus posiciones.');
 if(!demo.length && summary.marketValue>0){
  const stock=active.filter(h=>h.instrument.kind==='acción').sort((a,b)=>b.value-a.value)[0];
  if(stock && stock.value/summary.marketValue>.15)add('stock','alta','Revisa la exposición a una sola empresa',stock.instrument.name+' representa '+(stock.value/summary.marketValue*100).toFixed(1)+'% del valor registrado. Umbral de revisión: 15%.','El resultado depende de esa empresa. No se incluye la exposición indirecta a través de fondos.','Revisa la exposición total, incluidos tus fondos, antes de decidir nuevas aportaciones.');
  const tech=active.filter(h=>h.instrument.category==='tecnología').reduce((n,h)=>n+h.value,0);
  if(tech/summary.marketValue>.30)add('sector','media','Revisa el peso tecnológico','Los productos etiquetados como tecnología suman '+(tech/summary.marketValue*100).toFixed(1)+'%. Umbral de revisión: 30%.','Es una aproximación por etiquetas: no mide la tecnología dentro de fondos globales ni sus solapamientos.','Consulta las principales posiciones y exposición sectorial de cada producto.');
  const largest=active.reduce((a,b)=>a.value>b.value?a:b);
  if(largest.instrument.kind!=='acción' && largest.value/summary.marketValue>.60)add('vehicle','informativa','Dependes principalmente de un vehículo',largest.instrument.name+' concentra '+(largest.value/summary.marketValue*100).toFixed(1)+'% del valor registrado.','Un fondo global puede estar diversificado internamente. Este peso no demuestra concentración en una sola empresa.','Revisa índice, política, gestora, costes y posiciones subyacentes; no añadas fondos solo para aumentar su número.');
 }
 if(profile?.lossTolerance==='baja')add('tolerance','media','Contrasta tu tolerancia con el riesgo de los productos','Has declarado tolerancia baja a pérdidas.','La app no dispone de volatilidad, composición completa ni una evaluación de idoneidad.','Consulta el indicador de riesgo y las pérdidas históricas de cada producto y compara con tu capacidad económica.');
 add('limits','informativa','Qué falta para una revisión completa','No conocemos tus saldos bancarios, deudas, ingresos, fiscalidad ni la composición interna completa de los fondos.','No hay una puntuación de salud ni una recomendación de compra o venta basada solo en estos datos.','Completa el contexto y revisa los puntos pendientes. Si necesitas una recomendación personal, contrástala con un asesor cualificado.','#perfil');
 const rank={alta:0,media:1,informativa:2};return out.sort((a,b)=>rank[a.priority]-rank[b.priority]);
}

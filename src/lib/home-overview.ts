import {analyzePlan,fields,type Plan} from './financial-plan.ts';
import type {PortfolioState,PortfolioSummary} from './types.ts';
export function homeOverview(plan:Plan,state:PortfolioState,summary:PortfolioSummary,today:string){
 const active=summary.holdings.filter(h=>h.units>1e-8);
 const unpriced=active.some(h=>h.instrument.quoteSource==='demo');
 // An empty ledger does not establish a zero investment balance unless the user says they do not invest.
 const portfolioKnown=!state.demoMode&&!unpriced&&(state.transactions.length>0||plan.onboarding?.investments==='not-yet');
 const analysis=analyzePlan(plan,portfolioKnown?summary.marketValue:null,today);
 const steps:{id:string;title:string;detail:string;href:string}[]=[];
 if(state.demoMode)return {analysis,portfolioKnown:false,active,steps:[{id:'demo',title:'Vuelve a tus datos personales',detail:'Los importes de la demostración son ficticios.',href:'/cartera'}],oldest:null};
 if(!plan.onboarding?.completed)steps.push({id:'welcome',title:'Prepara tu perfil',detail:'Una guía breve para adaptar tu inicio.',href:'/bienvenida'});
 if(fields.some(k=>plan[k]===null))steps.push({id:'budget',title:'Completa tu balance y presupuesto',detail:`Tienes ${analysis.known} de 8 datos económicos. Los campos vacíos siguen pendientes.`,href:'/plan'});
 if(analysis.warnings.length)steps.push({id:'budget-warning',title:'Revisa las asignaciones de tu plan',detail:analysis.warnings[0],href:'/plan'});
 if(unpriced)steps.push({id:'quotes',title:'Registra valoraciones reales',detail:'Hay posiciones con precios de ejemplo. No mostramos totales con esas valoraciones.',href:'/cartera#productos'});
 if(!state.transactions.length&&plan.onboarding?.investments!=='not-yet')steps.push({id:'portfolio',title:'Añade o importa tus inversiones',detail:'Registra productos y operaciones para obtener tu resumen real.',href:'/cartera#datos'});
 const oldest=active.map(h=>h.instrument.priceDate).sort()[0]??null;
 if(!unpriced&&oldest&&(Date.parse(today+'T12:00:00Z')-Date.parse(oldest+'T12:00:00Z'))/86400000>7)steps.push({id:'stale',title:'Revisa las fechas de tus precios',detail:'Hay valoraciones con más de 7 días naturales. Puede haber retrasos de publicación.',href:'/cartera#productos'});
 if(!plan.goals.length)steps.push({id:'goal',title:'Pon fecha a tu próximo objetivo',detail:'Asigna un importe y una aportación que encajen en tu presupuesto.',href:'/plan'});
 if(!state.completedLessons.length&&plan.onboarding?.experience!=='experienced')steps.push({id:'learn',title:'Aprende los primeros conceptos',detail:'Empieza por riesgo, diversificación y plazos.',href:'/academia'});
 if(!steps.length)steps.push({id:'review',title:'Revisa tu plan periódicamente',detail:'Actualiza tus datos cuando cambien tus ingresos, objetivos o inversiones.',href:'/plan'});
 return {analysis,portfolioKnown,active,steps,oldest};
}

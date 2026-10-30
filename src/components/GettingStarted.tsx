'use client';
import Link from 'next/link';
import {usePortfolio} from '../context/PortfolioContext';
import {useFinancialPlan} from '../context/useFinancialPlan.ts';
import {analyzePlan} from '../lib/financial-plan.ts';
import {calculateCash} from '../lib/cash.ts';
import {eur,todayIso} from '../lib/portfolio.ts';
import {Section,Tag} from './Common';
export function GettingStarted(){const {state,summary,ready}=usePortfolio();const {plan,ready:planReady}=useFinancialPlan();if(!ready||!planReady)return <p role="status">Preparando tu resumen…</p>;
 const unpriced=summary.holdings.some(h=>h.units>1e-8&&h.instrument.quoteSource==='demo');const result=analyzePlan(plan,unpriced?null:summary.marketValue,todayIso());const cash=state.cashTracking?calculateCash(state.cashEntries??[],state.transactions):null;
 const steps=[{title:'Añade tus productos',done:state.instruments.length>0,href:'/cartera#productos'},{title:'Registra tus operaciones',done:state.transactions.length>0,href:'/cartera#operaciones'},{title:'Completa tu presupuesto',done:result.known===8,href:'/plan'},{title:'Define un objetivo',done:plan.goals.length>0,href:'/plan'}];const done=steps.filter(s=>s.done).length;
 const dates=summary.holdings.filter(h=>h.units>1e-8).map(h=>h.instrument.priceDate).sort();
 return <><Section title="Pon tu brújula en marcha" className="onboarding" extra={<Tag>{done}/4 pasos</Tag>}><div className="setupSteps">{steps.map((s,i)=><Link key={s.title} href={s.href} className={'setupStep '+(s.done?'completed':'')}><span>{s.done?'✓':i+1}</span><strong>{s.title}</strong><small>{s.done?'Completado':'Continuar →'}</small></Link>)}</div></Section>
 <div className="metricGrid"><div className="metricCard"><span>Patrimonio neto declarado</span><strong>{result.net===null?'Faltan datos':eur(result.net)}</strong><small>Balance del plan, sin sumar dos veces la cartera</small></div><div className="metricCard"><span>Efectivo de inversión</span><strong>{cash?eur(cash.balance):'Sin registrar'}</strong><small>{cash&&cash.minBalance<0?'Revisa movimientos ausentes':'No se suma automáticamente a la liquidez del plan'}</small></div><div className="metricCard"><span>Objetivos registrados</span><strong>{plan.goals.length}</strong><small>{result.goals.filter(g=>g.feasible).length} cubiertos en el escenario base</small></div><div className="metricCard"><span>Fecha más antigua de precios abiertos</span><strong>{dates[0]??'Sin posiciones'}</strong><small>{unpriced?'Hay valoraciones pendientes':'Las fechas pueden diferir entre productos'}</small></div></div></>;
}

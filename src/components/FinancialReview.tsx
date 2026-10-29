'use client';
import Link from 'next/link';
import {useFinancialPlan} from '../context/useFinancialPlan';
import {usePortfolio} from '../context/PortfolioContext';
import {analyzePlan} from '../lib/financial-plan';
import {eur,todayIso} from '../lib/portfolio';
import {Section,Info,Tag} from './Common';
export function FinancialReview(){const {plan,ready,error}=useFinancialPlan();const {summary}=usePortfolio();const unpriced=summary.holdings.some(h=>h.units>1e-8&&h.instrument.quoteSource==='demo');const r=analyzePlan(plan,unpriced?null:summary.marketValue,todayIso());
 return <Section title="Objetivos y capacidad financiera" extra={<Link className="textLink" href="/plan">Completar mi plan →</Link>}>
 {!ready?<p>Cargando plan…</p>:<><Tag>{r.known}/8 datos económicos informados</Tag>{error&&<p role="alert">{error}</p>}<p>Excedente mensual: {r.surplus===null?'Sin datos suficientes':eur(r.surplus)}. Patrimonio neto: {r.net===null?'Sin datos suficientes':eur(r.net)}.</p>{r.warnings.map(w=><Info tone="amber" key={w}>{w}</Info>)}
 {!r.goals.length?<p>Añade objetivos con importe y fecha para valorar su financiación.</p>:r.goals.map(g=><article className="adviceCard" key={g.id}><h3>{g.name}</h3><p>Objetivo {eur(g.target)} para {g.date}. Proyección base: {eur(g.projected)}. Pendiente: {eur(g.gap)}.</p><p>{g.feasible?'Cubierto con las asignaciones declaradas en el escenario base.':'Revisa las asignaciones, el plazo y los datos pendientes antes de darlo por cubierto.'}</p></article>)}
 {plan.receipts.length>0&&<Info>Ingresos futuros inciertos: {eur(r.uncertain)}. No se incluyen en el patrimonio ni en los recursos para objetivos.</Info>}<p className="hint">Sin rentabilidad, inflación ni impuestos. Los activos invertidos no se liquidan ni se asignan a objetivos automáticamente.</p></>}
 </Section>;}

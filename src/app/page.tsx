'use client';
import Link from 'next/link';
import {useFinancialPlan} from '../context/useFinancialPlan.ts';
import {GettingStarted} from '../components/GettingStarted';
import { Header, Info, Pnl, Section, Tag } from '../components/Common';
import { usePortfolio } from '../context/PortfolioContext';
import { eur, nfmt } from '../lib/portfolio.ts';
import { lessons } from '../data/lessons.ts';

export default function Dashboard() {
  const {state, summary} = usePortfolio();
  const {plan}=useFinancialPlan();
  const notInvesting=plan.onboarding?.investments==='not-yet';
  const unpriced = !state.demoMode && summary.holdings.some(h => h.units > 0 && h.instrument.quoteSource === 'demo');
  const active = summary.holdings.filter(x=>x.units>0.00000001);
  const firstTodo=lessons.find(x=>!state.completedLessons.includes(x.id));
  return <>
    <Header eyebrow="TU ESPACIO FINANCIERO" title="Tu dinero, con perspectiva." description="Menos ruido. Más claridad sobre lo que tienes y lo que quieres conseguir." action={<Tag tone="amber">{state.demoMode?'MODO DEMO · importes ficticios':'TU ESPACIO PERSONAL'}</Tag>}/>
    <GettingStarted/>
    {state.demoMode && <Info tone="amber"><strong>Estás explorando una simulación.</strong> Los 72 € y los valores de mercado son ficticios. Para cargar operaciones reales, entra en Mi cartera y pulsa «Empezar mi cartera».</Info>}
    {!state.demoMode && !state.instruments.length && !notInvesting && <Info><strong>Empieza con tus inversiones.</strong> Añade los productos que tienes, sus precios de valoración y tus compras reales desde Mi cartera. No se incluyen inversiones de ejemplo.</Info>}
    {unpriced && <Info tone="amber"><strong>Valoración pendiente.</strong> Hay posiciones con precios de ejemplo antiguos. Actualízalos en Mi cartera; hasta entonces no mostramos el valor total ni la rentabilidad.</Info>}
    <div className="contentGrid">
      <Section title="Tus inversiones" className="span7" extra={<Link href="/cartera" className="tinyLink">Ver movimientos ↗</Link>}>
        <div className="holdingsList">
        {active.length ? active.map(h=>{
          const weight=summary.marketValue?100*h.value/summary.marketValue:0;
          return <div key={h.instrument.id} className="holdingRow">
            <div className="assetIcon" style={{background:`${h.instrument.color}20`,color:h.instrument.color}}>{h.instrument.kind==='etf'?'◇':'◈'}</div>
            <div className="holdingName"><strong>{h.instrument.name}</strong><small>{h.instrument.kind.toUpperCase()} · {h.instrument.isin}</small></div>
            <div className="holdingVal"><strong>{!state.demoMode && h.instrument.quoteSource==='demo' ? 'Sin valorar' : eur(h.value)}</strong><small>{!state.demoMode && h.instrument.quoteSource==='demo' ? 'Introduce un precio real' : <Pnl amount={h.totalPnL} percent={h.returnOnBuys}/>}</small></div>
            <span className="holdingWeight">{unpriced ? '—' : `${nfmt(weight,1)}%`}</span>
          </div>;
        }):<p className="muted">Tu cartera está vacía. Si ya inviertes, añade tus productos y registra tus operaciones, o importa tus datos. Si todavía no inviertes, puedes centrarte en tu plan y tus objetivos.</p>}
        </div>
        <div className="allocationStack" aria-label="Distribución de la cartera">
          {!unpriced && active.map(h=><span key={h.instrument.id} style={{width:`${summary.marketValue?100*h.value/summary.marketValue:0}%`,background:h.instrument.color}}/>) }
        </div>
        <p className="hint">El reparto refleja el valor de mercado simulado o introducido, no el porcentaje del capital originalmente invertido.</p>
      </Section>
      <Section title="Una idea para entender mejor" className="span5" extra={<Tag>Contenido educativo</Tag>}>
        <div className="insightIcon">↗</div>
        <h3 className="insightTitle">¿Por qué la tecnología puede caer cuando suben los tipos?</h3>
        <p className="muted">Con tipos más altos, los beneficios esperados a muchos años pueden valorarse menos en el presente. Es una explicación económica general, no una noticia de hoy.</p>
        <Link className="textLink" href="/mercados">Entender el contexto <span>→</span></Link>
      </Section>
      <Section title="Tu próximo aprendizaje" className="span12 lessonTeaser" extra={<span className="subtleText">APRENDE EN 3 MINUTOS</span>}>
        <div><span className="lessonBigIcon">✧</span><div><h3>{firstTodo?.title || '¡Lecciones iniciales completadas!'}</h3><p className="muted">{firstTodo?.description || 'Repasa los conceptos cuando los necesites.'}</p></div></div>
        <Link className="primaryButton" href="/academia">{firstTodo?'Empezar lección':'Repasar'} <span>→</span></Link>
      </Section>
    </div>
  </>;
}

'use client';
import Link from 'next/link';
import { Header, Info, Pnl, Section, Tag } from '../components/Common';
import { usePortfolio } from '../context/PortfolioContext';
import { eur, nfmt, pct } from '../lib/portfolio';
import { lessons } from '../data/lessons';

export default function Dashboard() {
  const {state, summary} = usePortfolio();
  const active = summary.holdings.filter(x=>x.units>0.00000001);
  const firstTodo=lessons.find(x=>!state.completedLessons.includes(x.id));
  return <>
    <Header eyebrow="TU ESPACIO FINANCIERO" title="Hola, futuro inversor 👋" description="Comprende lo que tienes. Decide con criterio, no con prisas." action={<Tag tone="amber">{state.demoMode?'MODO DEMO · importes ficticios':'MODO LOCAL · precios manuales'}</Tag>}/>
    <div className="heroGrid">
      <section className="heroCard">
        <div className="heroEyebrow">VALOR ESTIMADO DE TU CARTERA</div>
        <div className="heroAmount">{eur(summary.marketValue)}</div>
        <div className="heroSub">Calculado con precios {state.instruments.some(a=>a.quoteSource==='demo')?'de demostración o manuales':'introducidos manualmente'} · No hay datos en directo</div>
        <div className="heroDivider"/>
        <div className="heroStats">
          <div><div className="labelOnDark">Aportaciones netas</div><strong>{eur(summary.netCashContributed)}</strong></div>
          <div><div className="labelOnDark">Resultado total</div><strong className={summary.totalPnL>=0?'heroPositive':'heroNegative'}>{summary.totalPnL>=0?'+':''}{eur(summary.totalPnL)}</strong></div>
          <div><div className="labelOnDark">Resultado / compras</div><strong>{pct(summary.returnOnBuys)}</strong></div>
        </div>
        <Link className="heroButton" href="/cartera">Gestionar mi cartera <span>↗</span></Link>
      </section>
      <Section className="progressCard" extra={<Tag tone="mint">Tu recorrido</Tag>}>
        <div className="progressTop"><span className="progressIcon">✦</span><span>{state.completedLessons.length} de {lessons.length} lecciones</span></div>
        <div className="progressPercent">{Math.round(state.completedLessons.length/lessons.length*100)}<span>% completado</span></div>
        <div className="progressTrack"><span style={{width:`${state.completedLessons.length/lessons.length*100}%`}} /></div>
        <p className="muted">Una lección de pocos minutos al día puede enseñarte más que vigilar precios cada hora.</p>
        <Link href="/academia" className="textLink">Continuar aprendizaje <span>→</span></Link>
      </Section>
    </div>
    {state.demoMode && <Info tone="amber"><strong>Estás explorando una simulación.</strong> Los 72 € y los valores de mercado son ficticios. Para cargar operaciones reales, entra en Mi cartera y pulsa «Empezar mi cartera».</Info>}
    <div className="contentGrid">
      <Section title="Tus inversiones" className="span7" extra={<Link href="/cartera" className="tinyLink">Ver movimientos ↗</Link>}>
        <div className="holdingsList">
        {active.length ? active.map(h=>{
          const weight=summary.marketValue?100*h.value/summary.marketValue:0;
          return <div key={h.instrument.id} className="holdingRow">
            <div className="assetIcon" style={{background:`${h.instrument.color}20`,color:h.instrument.color}}>{h.instrument.kind==='etf'?'◇':'◈'}</div>
            <div className="holdingName"><strong>{h.instrument.name}</strong><small>{h.instrument.kind.toUpperCase()} · {h.instrument.isin}</small></div>
            <div className="holdingVal"><strong>{eur(h.value)}</strong><small><Pnl amount={h.totalPnL} percent={h.returnOnBuys}/></small></div>
            <span className="holdingWeight">{nfmt(weight,1)}%</span>
          </div>;
        }):<p className="muted">Todavía no hay participaciones. Añade tu primera compra desde Mi cartera.</p>}
        </div>
        <div className="allocationStack" aria-label="Distribución de la cartera">
          {active.map(h=><span key={h.instrument.id} style={{width:`${summary.marketValue?100*h.value/summary.marketValue:0}%`,background:h.instrument.color}}/>) }
        </div>
        <p className="hint">El reparto refleja el valor de mercado simulado o introducido, no el porcentaje del capital originalmente invertido.</p>
      </Section>
      <Section title="Tu brújula de hoy" className="span5" extra={<Tag>Contenido educativo</Tag>}>
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

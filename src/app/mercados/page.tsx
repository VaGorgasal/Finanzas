'use client';
import { Header, Info, Section, Tag } from '../../components/Common';
import { stories } from '../../data/stories.ts';
import { usePortfolio } from '../../context/PortfolioContext';
export default function MercadosPage(){
  const {state}=usePortfolio();
  return <>
    <Header eyebrow="CONTEXTO, NO RUIDO" title="Resumen diario" description="Cinco minutos para separar hechos, interpretaciones y decisiones." action={<Tag tone="amber">Ejemplos didácticos · Sin feed en directo</Tag>}/>
    <Info tone="amber"><strong>Importante:</strong> estos tres casos son escenarios inventados, no titulares publicados el 29/10/2026. La V0.2 no consulta noticias, valores liquidativos ni cotizaciones en tiempo real.</Info>
    <div className="contentGrid">
      <Section className="span8" title="Noticias explicadas" extra={<Tag>Aprendizaje</Tag>}>
        <div className="storyList">{stories.map(story=><article className="storyCard" key={story.id}><div className="storyTop"><span className="storyIcon">{story.icon}</span><Tag>{story.tag}</Tag></div><h3>{story.title}</h3><div className="storyBreak"><strong>¿Qué está pasando en el ejemplo?</strong><p>{story.fact}</p></div><div className="storyBreak"><strong>¿Por qué podría importar?</strong><p>{story.meaning}</p></div><div className="storyCaution"><strong>Lo que no podemos concluir:</strong> {story.caution}</div><a className="tinyLink" href={story.reference} target="_blank" rel="noopener noreferrer">Fuente oficial para investigar: {story.referenceName} ↗</a></article>)}</div>
      </Section>
      <Section className="span4" title="Rutina de cinco minutos">
        <div className="routine">{[
          ['01','Verifica la fuente','Identifica quién publica la información, cuándo y qué datos aporta.'],
          ['02','Entiende el mecanismo','¿Afecta a beneficios, tipos de interés, divisas o al sector?'],
          ['03','Conecta con tu cartera',`Tienes ${state.instruments.length} productos registrados. ¿Cuáles podrían verse afectados?`],
          ['04','Distingue hechos de hipótesis','Una correlación no demuestra la causa de una subida o caída.'],
          ['05','Revisa tu horizonte','Una noticia diaria rara vez obliga a modificar un plan a largo plazo.'],
        ].map(x=><div key={x[0]} className="routineRow"><span>{x[0]}</span><div><strong>{x[1]}</strong><p>{x[2]}</p></div></div>)}</div>
        <div className="softBox"><strong>Investiga por tu cuenta</strong><div className="resourceLinks"><a href="https://www.cnmv.es/portal/Inversor" target="_blank" rel="noopener noreferrer">Portal del inversor · CNMV ↗</a><a href="https://www.ecb.europa.eu/" target="_blank" rel="noopener noreferrer">Comunicados · BCE ↗</a><a href="https://www.ishares.com/es/particulares/es" target="_blank" rel="noopener noreferrer">Datos oficiales · iShares ↗</a></div></div>
      </Section>
    </div>
  </>;
}

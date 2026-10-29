'use client';
import {useState} from 'react';
import Link from 'next/link';
import {Header,Section,Tag} from '../../components/Common';
import {faqEntries,faqCategories} from '../../data/faq';
import {filterFaq} from '../../lib/faq';
export default function FaqPage(){const [query,setQuery]=useState(''),[category,setCategory]=useState('Todas');const results=filterFaq(faqEntries,query,category);
 function reset(){setQuery('');setCategory('Todas');}
 return <><Header eyebrow="AYUDA PARA USAR BRÚJULA" title="Preguntas frecuentes" description="Encuentra respuestas sobre tu cartera, las valoraciones y tu plan financiero." action={<Tag>{faqEntries.length} respuestas</Tag>}/>
 <Section title="¿En qué podemos ayudarte?" className="faqControls"><div className="field"><label htmlFor="faq-search">Buscar en las preguntas y respuestas</label><input id="faq-search" type="search" maxLength={150} placeholder="Por ejemplo: traspasos, efectivo o importar CSV" value={query} onChange={e=>setQuery(e.target.value)} aria-controls="faq-results"/></div><div className="faqCategories" role="group" aria-label="Filtrar por tema">{['Todas',...faqCategories].map(c=><button key={c} type="button" className={'secondaryButton '+(category===c?'faqSelected':'')} aria-pressed={category===c} onClick={()=>setCategory(c)}>{c}</button>)}</div><div className="faqResultCount"><p role="status" aria-live="polite">{results.length} {results.length===1?'respuesta encontrada':'respuestas encontradas'}</p>{(query||category!=='Todas')&&<button type="button" className="textButton" onClick={reset}>Restablecer filtros</button>}</div></Section>
 <Section title="Respuestas" className="faqPanel"><div id="faq-results">{results.length?results.map(item=><details key={item.id} id={item.id} className="faqItem"><summary>{item.question}</summary><div className="faqAnswer"><Tag>{item.category}</Tag><p>{item.answer}</p><Link className="textLink" href={item.href}>{item.linkLabel} →</Link></div></details>):<div className="faqEmpty"><h3>No encontramos una respuesta con esos filtros</h3><p>Prueba otra palabra o selecciona Todas para ampliar la búsqueda.</p><button type="button" className="secondaryButton" onClick={reset}>Mostrar todas las preguntas</button></div>}</div></Section>
 <p className="hint">Estas respuestas describen la versión actual de Brújula. Si una función figura como pendiente, todavía no está disponible.</p></>;
}

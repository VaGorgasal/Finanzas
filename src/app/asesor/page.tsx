'use client';
import {useEffect,useState,type FormEvent} from 'react';
import Link from 'next/link';
import {FinancialReview} from '../../components/FinancialReview';
import {Header,Section,Info,Tag} from '../../components/Common';
import {usePortfolio} from '../../context/PortfolioContext';
import {analyzePortfolio,defaultProfile,parseProfile,type InvestorProfile} from '../../lib/advisor';
import {todayIso} from '../../lib/portfolio';
const KEY='brujula-investor-profile-v1';
export default function AdvisorPage(){
 const {state,summary,ready}=usePortfolio();
 const [profile,setProfile]=useState<InvestorProfile|null>(null);
 const [draft,setDraft]=useState<InvestorProfile>(defaultProfile);
 const [status,setStatus]=useState('');
 useEffect(()=>{
  try {const raw=localStorage.getItem(KEY);const saved=raw?parseProfile(JSON.parse(raw)):null;
   if(saved){
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfile(saved);setDraft(saved);
   }
  } catch {setStatus('No se ha podido recuperar tu perfil. Puedes completarlo de nuevo.');}
 },[]);
 function save(e:FormEvent){e.preventDefault();const valid=parseProfile(draft);if(!valid){setStatus('Revisa los datos del perfil.');return;}
  setProfile(valid);try{localStorage.setItem(KEY,JSON.stringify(valid));setStatus('Contexto guardado en este navegador.');}catch{setStatus('Contexto aplicado a esta sesión, pero el navegador no permite guardarlo.');}
 }
 const advice=analyzePortfolio(state,summary,profile,todayIso());
 return <><Header eyebrow="TU CARTERA, CON CONTEXTO" title="Asesor de cartera" description="Diagnósticos explicables sobre los datos que has registrado." action={<Tag>Motor de reglas · v1</Tag>}/>
 <Info>Esta revisión es educativa. Los umbrales sirven para detectar puntos que revisar; no determinan una cartera óptima ni generan órdenes de compra o venta. Los datos no se envían a una IA externa.</Info>
 <FinancialReview/>
 <Section title="Tu contexto" className="profilePanel"><form id="perfil" onSubmit={save} className="formStack">
 <div className="fieldGrid"><div className="field"><label htmlFor="goal">Objetivo principal</label><select id="goal" value={draft.goal} onChange={e=>setDraft({...draft,goal:e.target.value as InvestorProfile['goal']})}><option value="aprender">Aprender a invertir</option><option value="vivienda">Vivienda</option><option value="jubilación">Jubilación</option><option value="patrimonio">Construir patrimonio</option></select></div>
 <div className="field"><label htmlFor="horizon">Años hasta necesitar el dinero</label><input id="horizon" type="number" min="0" max="50" step="1" required value={draft.horizonYears} onChange={e=>setDraft({...draft,horizonYears:Number(e.target.value)})}/></div></div>
 <div className="fieldGrid"><div className="field"><label htmlFor="reserve">Meses de gastos esenciales cubiertos con liquidez</label><input id="reserve" type="number" min="0" max="60" step="0.5" required value={draft.emergencyMonths} onChange={e=>setDraft({...draft,emergencyMonths:Number(e.target.value)})}/></div>
 <div className="field"><label htmlFor="tolerance">Tolerancia declarada a pérdidas</label><select id="tolerance" value={draft.lossTolerance} onChange={e=>setDraft({...draft,lossTolerance:e.target.value as InvestorProfile['lossTolerance']})}><option value="baja">Baja</option><option value="media">Media</option><option value="alta">Alta</option></select></div></div>
 <p className="hint">Los valores iniciales son sugerencias del formulario: el análisis solo los utilizará cuando los guardes. Este perfil no forma parte de la copia JSON de la cartera.</p>
 <button className="primaryButton" type="submit">Guardar contexto y analizar</button>{status&&<p role="status">{status}</p>}</form></Section>
 <Section title="Puntos que revisar" extra={<Tag>{ready?advice.length:'…'} diagnósticos</Tag>}>
 {!ready?<p role="status">Cargando tu cartera…</p>:advice.map(item=><article key={item.id} className="adviceCard"><Tag tone={item.priority==='alta'?'amber':item.priority==='media'?'mint':'neutral'}>{item.priority==='informativa'?'Información':'Prioridad '+item.priority}</Tag><h3>{item.title}</h3><p><strong>Datos:</strong> {item.evidence}</p><p>{item.meaning}</p><p><strong>Siguiente paso:</strong> {item.action}</p><Link className="textLink" href={item.href}>{item.href==='/cartera'?'Revisar mi cartera →':'Revisar mi contexto ↑'}</Link></article>)}
 </Section></>;
}

'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePortfolio } from '../context/PortfolioContext';
import {downloadJson} from '../lib/backup.ts';
import {STORAGE_KEY} from '../lib/storage.ts';
import type { ReactNode } from 'react';
const links = [
  {href:'/plan',label:'Mi plan financiero',glyph:'◎'},
  {href:'/asesor',label:'Asesor de cartera',glyph:'✦'},
  {href:'/',label:'Vista general',glyph:'◫'},
  {href:'/cartera',label:'Mi cartera',glyph:'◉'},
  {href:'/mercados',label:'Contexto de mercado',glyph:'▤'},
  {href:'/academia',label:'Aprende',glyph:'▧'},
  {href:'/noticias',label:'Noticias',glyph:'▤'},
  {href:'/consultas',label:'Consultas IA',glyph:'✧'},
  {href:'/exposiciones',label:'Exposiciones',glyph:'◈'},
  {href:'/divisas',label:'Divisas',glyph:'⇄'},
  {href:'/simulador',label:'Simulador',glyph:'◇'},
  {href:'/cuenta',label:'Mi cuenta',glyph:'◎'},
  {href:'/faq',label:'Preguntas frecuentes',glyph:'?'},
];
export function Shell({children}:{children:ReactNode}) {
  const path = usePathname();
  const {state, ready, storageError,recoveryError} = usePortfolio();
  return <div className="appShell">
    <aside className="sidebar">
      <Link className="brand" href="/" aria-label="Brújula Financiera, inicio">
        <span className="brandMark">✦</span><span>brújula<span className="brandLight">.financiera</span><small>APRENDE A INVERTIR</small></span>
      </Link>
      <div className="sideLabel">TU ESPACIO</div>
      <nav className="sideNav" aria-label="Navegación principal">
        {links.map(item=><Link key={item.href} href={item.href} className={`navLink ${path === item.href ? 'active':''}`} aria-current={path===item.href?'page':undefined}><span className="navGlyph">{item.glyph}</span>{item.label}</Link>)}
      </nav>
      <div className="sideInfo"><span className="miniLight">◉</span> Tu progreso empieza con comprender lo que ya tienes.<p>5 minutos al día son suficientes para aprender algo útil.</p></div>
      <div className="sidebarBottom">EDICIÓN 0.3 · {ready && state.demoMode ? 'MODO DEMO' : 'LOCAL / MANUAL'}</div>
    </aside>
    <div className="mainWrap">
      <div className="mobileNav"><Link href="/" className="mobileBrand">✦ Brújula</Link><div>{links.map(x=><Link key={x.href} href={x.href} className={path===x.href?'selected':''}>{x.label}</Link>)}</div></div>
      <main className="mainContent"><div className="notice"><strong>Beta · Tu espacio financiero.</strong> El guardado local sigue activo. Puedes gestionar una copia entre dispositivos desde Mi cuenta. Exporta una copia antes de borrar datos. <Link href="/faq#backup">Cómo guardar una copia</Link></div>{recoveryError&&<div className="info info-amber" role="alert"><strong>Recuperación pendiente.</strong> {recoveryError} <button className="secondaryButton" onClick={()=>{try{downloadJson({format:'brujula-recovery-raw',raw:localStorage.getItem(STORAGE_KEY)},'brujula-datos-originales.json');}catch{alert('El navegador impide leer los datos originales.');}}}>Descargar original sin modificar</button><Link href="/plan">Importar copia válida</Link></div>}{storageError && <div className="notice" role="alert"><strong>No se han podido guardar los cambios.</strong> El navegador ha bloqueado el almacenamiento o no queda espacio. Conserva esta pestaña abierta y exporta tu cartera desde Mi cartera para no perderla.</div>}{children}</main>
      <footer className="appFooter"><span>Brújula Financiera © 2026 · Proyecto educativo. No es asesoramiento financiero personalizado.</span><span>{storageError ? 'Cambios sin guardar · Exporta una copia' : 'Datos guardados en este navegador · EUR'}</span></footer>
    </div>
  </div>;
}

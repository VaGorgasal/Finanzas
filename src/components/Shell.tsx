'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePortfolio } from '../context/PortfolioContext';
import type { ReactNode } from 'react';
const links = [
  {href:'/',label:'Vista general',glyph:'◫'},
  {href:'/cartera',label:'Mi cartera',glyph:'◉'},
  {href:'/mercados',label:'Resumen diario',glyph:'▤'},
  {href:'/academia',label:'Aprende',glyph:'▧'},
];
export function Shell({children}:{children:ReactNode}) {
  const path = usePathname();
  const {state, ready} = usePortfolio();
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
      <div className="sidebarBottom">EDICIÓN 0.2 · {ready && state.demoMode ? 'MODO DEMO' : 'LOCAL / MANUAL'}</div>
    </aside>
    <div className="mainWrap">
      <div className="mobileNav"><Link href="/" className="mobileBrand">✦ Brújula</Link><div>{links.map(x=><Link key={x.href} href={x.href} className={path===x.href?'selected':''}>{x.label}</Link>)}</div></div>
      <main className="mainContent">{children}</main>
      <footer className="appFooter"><span>Brújula Financiera © 2026 · Proyecto educativo. No es asesoramiento financiero personalizado.</span><span>Datos guardados en este navegador · EUR</span></footer>
    </div>
  </div>;
}

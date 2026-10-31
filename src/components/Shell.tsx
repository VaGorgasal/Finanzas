'use client';
import {useEffect,useRef,type ReactNode} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useAccount} from '../context/AccountContext';
import {usePortfolio} from '../context/PortfolioContext';
import {workspaceStorage} from '../lib/workspace-storage.ts';
import {downloadJson} from '../lib/backup.ts';
import {STORAGE_KEY} from '../lib/storage.ts';
import {Icon,type IconName} from './Icon';
type NavItem={href:string;label:string;icon:IconName};
const groups:{label:string;items:NavItem[]}[]=[
 {label:'Tu patrimonio',items:[{href:'/',label:'Vista general',icon:'home'},{href:'/plan',label:'Mi plan financiero',icon:'plan'},{href:'/cartera',label:'Mi cartera',icon:'wallet'},{href:'/seguimiento',label:'Seguimiento',icon:'watch'},{href:'/asesor',label:'Asesor de cartera',icon:'compass'}]},
 {label:'Ideas y contexto',items:[{href:'/noticias',label:'Noticias',icon:'news'},{href:'/mercados',label:'Contexto de mercado',icon:'layers'},{href:'/consultas',label:'Consultas IA',icon:'chat'},{href:'/academia',label:'Aprende',icon:'learn'}]},
 {label:'Herramientas',items:[{href:'/exposiciones',label:'Exposiciones',icon:'layers'},{href:'/divisas',label:'Divisas',icon:'swap'},{href:'/simulador',label:'Simulador',icon:'calculator'},{href:'/faq',label:'Preguntas frecuentes',icon:'help'}]},
];
const all=groups.flatMap(g=>g.items);
const mobile=[all[0],all[2],all[3],all[1]];
function Brand(){return <Link className="brand" href="/" aria-label="Brújula Financiera, inicio"><span className="brandMark"><Icon name="compass" size={27}/></span><span>brújula<span className="brandLight">.</span><small>FINANCIERA</small></span></Link>;}
export function Shell({children}:{children:ReactNode}){
 const path=usePathname(),menuRef=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const media=window.matchMedia('(min-width:901px)');const close=()=>{if(media.matches)menuRef.current?.close();};media.addEventListener('change',close);return ()=>media.removeEventListener('change',close);},[]);
 const {user,configured,sync}=useAccount();const {state,ready,storageError,recoveryError}=usePortfolio();
 const current=all.find(x=>x.href===path)?.label??(path==='/bienvenida'?'Bienvenida':'Mi cuenta');
 const group=groups.find(g=>g.items.some(x=>x.href===path))?.label??'Tu espacio';
 const warning=user&&['error','conflict','pending'].includes(sync.phase);
 const status=user?(sync.phase==='saved'?'Guardado en tu cuenta':sync.phase==='saving'?'Guardando…':sync.phase==='loading'?'Cargando perfil…':'Pendiente de guardar'):(configured?'Inicia sesión':'Solo en este navegador');
 const avatar=user?.email?.slice(0,1).toUpperCase()??'T';
 function navItems(close=false){return groups.map(g=><div className="navGroup" key={g.label}><div className="sideLabel">{g.label}</div><nav className="sideNav" aria-label={g.label}>{g.items.map(x=><Link href={x.href} key={x.href} className={'navLink '+(path===x.href?'active':'')} aria-current={path===x.href?'page':undefined} onClick={()=>{if(close)menuRef.current?.close();}}><Icon name={x.icon}/><span>{x.label}</span>{path===x.href&&<span className="navActiveMark"/>}</Link>)}</nav></div>);}
 return <div className="appShell"><a className="skipLink" href="#contenido">Ir al contenido</a>
 <aside className="sidebar"><Brand/><div className="sideNavigation">{navItems()}</div><div className="sidebarAccount"><Link href="/cuenta" className="profileLink"><span className="avatar">{avatar}</span><span><strong>{user?'Mi espacio personal':'Tu espacio personal'}</strong><small>{user?'Gestionar mi cuenta':'Entrar o crear cuenta'}</small></span><Icon name="arrow" size={16}/></Link></div></aside>
 <div className="mainWrap"><div className="workspaceBar"><div className="workspaceTrail"><span className="mobileCompass"><Icon name="compass"/></span><span>{group}</span><span className="trailSlash">/</span><strong>{current}</strong></div><div className="workspaceActions"><Link href="/cuenta" className={'saveIndicator '+(warning?'isPending':'')} title={user?sync.message:status}><span/>{status}</Link><Link href="/cuenta" className="topAvatar" aria-label="Mi cuenta">{avatar}</Link></div></div>
 <main className="mainContent" id="contenido">
 {ready&&state.demoMode&&<div className="notice demoNotice"><strong>Modo demostración.</strong> Estás viendo importes ficticios. <Link href="/cartera">Volver a mi cartera →</Link></div>}
 {warning&&<div className="accountSync warning" role="status"><strong>{sync.message}</strong> <Link href="/cuenta">Revisar mi cuenta →</Link></div>}
 {!user&&configured&&path!=='/cuenta'&&<div className="notice"><strong>Un espacio solo para ti.</strong> Entra para recuperar tu perfil. <Link href="/cuenta">Mi cuenta →</Link></div>}
 {recoveryError&&<div className="info info-amber" role="alert"><strong>Recuperación pendiente.</strong> {recoveryError} <button className="secondaryButton" onClick={()=>{try{downloadJson({format:'brujula-recovery-raw',raw:workspaceStorage().getItem(STORAGE_KEY)},'brujula-datos-originales.json');}catch{alert('El navegador impide leer los datos originales.');}}}>Descargar original sin modificar</button><Link href="/plan">Importar copia válida</Link></div>}
 {storageError&&<div className="info info-amber" role="alert"><strong>No se han podido guardar los cambios.</strong> Conserva esta pestaña y exporta una copia desde Mi cartera.</div>}{children}</main>
 <footer className="appFooter"><span><strong>brújula.</strong> Tu dinero, con perspectiva.</span><span>Proyecto educativo · No es asesoramiento financiero personalizado.</span></footer>
 </div>
 <nav className="mobileDock" aria-label="Navegación móvil">{mobile.map((x,i)=><Link key={x.href} href={x.href} className={path===x.href?'selected':''} aria-current={path===x.href?'page':undefined}><Icon name={x.icon}/><span>{['Inicio','Cartera','Seguir','Mi plan'][i]}</span></Link>)}<button onClick={()=>menuRef.current?.showModal()} aria-haspopup="dialog" aria-controls="mobile-menu"><Icon name="menu"/><span>Más</span></button></nav>
 <dialog className="mobileMenu" id="mobile-menu" ref={menuRef} aria-labelledby="mobile-menu-title"><div className="mobileMenuHead"><h2 id="mobile-menu-title">Tu brújula</h2><button className="menuClose" aria-label="Cerrar menú" onClick={()=>menuRef.current?.close()}><Icon name="close"/></button></div>{navItems(true)}<Link className="profileLink" href="/cuenta" onClick={()=>menuRef.current?.close()}><Icon name="user"/><span>Mi cuenta</span><Icon name="arrow"/></Link></dialog>
 </div>;
}

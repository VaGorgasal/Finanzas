import type {CSSProperties} from 'react';
export type IconName='home'|'wallet'|'plan'|'watch'|'compass'|'news'|'learn'|'chat'|'layers'|'swap'|'calculator'|'user'|'help'|'arrow'|'menu'|'close'|'check';
const paths:Record<IconName,string>={
 home:'M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
 wallet:'M20 8V5a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15v12H5a2 2 0 0 1-2-2V6m18 6h-6v4h6m-3-2h.01',
 plan:'M5 4h14v17H5Zm4-2v4m6-4v4M8 10h8m-8 4h8m-8 4h5',
 watch:'m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z',
 compass:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-6-3-2 5-4 1 1-4Z',
 news:'M4 3h13v17H4Zm13 5h4v12H4m3-13h7m-7 4h7m-7 4h7',
 learn:'M12 6v15M3 4c4 0 6 0 9 2 3-2 5-2 9-2v15c-4 0-6 0-9 2-3-2-5-2-9-2Z',
 chat:'M21 4H3v13h5l4 4 4-4h5ZM7 9h10m-10 4h6',
 layers:'m12 3 10 5-10 5L2 8Zm-10 9 10 5 10-5M2 16l10 5 10-5',
 swap:'M3 7h17m-4-4 4 4-4 4M21 17H4m4-4-4 4 4 4',
 calculator:'M5 2h14v20H5ZM8 5h8v4H8Zm0 8h1m3 0h1m3 0h.01M8 17h1m3 0h1m3 0h.01',
 user:'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2',
 help:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-12-3a3 3 0 0 1 6 0c0 2-3 2-3 4m0 3h.01',
 arrow:'M4 12h16m-6-6 6 6-6 6',menu:'M4 6h16M4 12h16M4 18h16',close:'m6 6 12 12M6 18 18 6',check:'m5 12 4 4L19 6',
};
export function Icon({name,size=20,style}:{name:IconName;size?:number;style?:CSSProperties}){return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" style={style}><path d={paths[name]}/></svg>;}

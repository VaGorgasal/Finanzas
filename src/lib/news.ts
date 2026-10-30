import {isValidDay} from './portfolio.ts';
import {createHash} from 'node:crypto';
export type NewsItem={id:string;title:string;date:string;url:string;source:string;symbols:string[];excerpt:string};
export function normalizeNews(input:unknown,now=Date.now()):NewsItem[]{
 if(!Array.isArray(input))return [];const seen=new Set<string>();
 return input.flatMap(x=>{if(!x||typeof x.title!=='string'||typeof x.date!=='string'||typeof x.link!=='string')return [];let url:URL;try{url=new URL(x.link);}catch{return [];}
 const timestamp=Date.parse(x.date);if(!isValidDay(x.date.slice(0,10))||url.protocol!=='https:'||url.username||url.password||!Number.isFinite(timestamp)||timestamp>now+300000)return [];
 const key=x.title.trim().toLowerCase().replace(/\s+/g,' ');if(!key||seen.has(key)||seen.has(url.href))return [];seen.add(key);seen.add(url.href);
 return [{id:createHash('sha256').update(url.href).digest('hex').slice(0,24),title:x.title.slice(0,250),date:new Date(timestamp).toISOString(),url:url.href,source:url.hostname,symbols:Array.isArray(x.symbols)?x.symbols.filter((s:unknown)=>typeof s==='string').slice(0,50):[],excerpt:typeof x.content==='string'?x.content.replace(/<[^>]*>/g,' ').slice(0,1200):''}];}).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,30);
}

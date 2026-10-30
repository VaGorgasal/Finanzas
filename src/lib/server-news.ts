import {normalizeNews} from './news.ts';
import {ServiceError} from './server-access.ts';
export async function fetchNews(symbol='',topic=''){
 const key=process.env.EODHD_API_KEY;
 if(!key||process.env.NEWS_LICENSE_CONFIRMED!=='true')throw new ServiceError('Las noticias requieren configurar el proveedor y confirmar sus derechos de uso.');
 const url=new URL('https://eodhd.com/api/news');url.searchParams.set('api_token',key);url.searchParams.set('limit','30');url.searchParams.set('fmt','json');
 if(symbol)url.searchParams.set('s',symbol);else if(topic)url.searchParams.set('t',topic);
 const res=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(15000)});
 if(!res.ok)throw new ServiceError('El proveedor de noticias no permite esta consulta o ha agotado su cuota.',502);
 return normalizeNews(await res.json());
}

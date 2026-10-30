import {NextRequest,NextResponse} from 'next/server';
import {requireAccess,serviceFailure,ServiceError} from '../../../lib/server-access.ts';
import {fetchNews} from '../../../lib/server-news.ts';
export const runtime='nodejs';
export async function GET(request:NextRequest){try{
 const symbol=request.nextUrl.searchParams.get('symbol')??'',topic=request.nextUrl.searchParams.get('topic')??'';
 if((symbol&&!/^[A-Za-z0-9^_-]{1,30}\.[A-Za-z0-9_-]{1,15}$/.test(symbol))||!['','technology','energy','economy','finance'].includes(topic))throw new ServiceError('Filtro de noticias no válido.',400);
 await requireAccess(request,'news');
 return NextResponse.json({items:await fetchNews(symbol,topic),fetchedAt:new Date().toISOString(),provider:'EODHD',refreshSeconds:300},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return serviceFailure(e);}}

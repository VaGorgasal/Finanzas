import {createClient} from '@supabase/supabase-js';
import {NextResponse} from 'next/server';
import {ServiceError} from './service-error.ts';
export {ServiceError} from './service-error.ts';
export async function requireAccess(request:Request,kind:'market'|'news'|'ai'){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(process.env.ENABLE_REMOTE_FEATURES!=='true'||!url||!key||!process.env.SUPABASE_SERVICE_ROLE_KEY)throw new ServiceError('Servicio pendiente de activación. Puedes seguir usando las funciones locales.');
 const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1];
 if(!token)throw new ServiceError('Inicia sesión en Mi cuenta para usar este servicio.',401);
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await db.auth.getUser(token);
 if(error||!data.user||data.user.is_anonymous)throw new ServiceError('La sesión no es válida. Vuelve a iniciar sesión.',401);
 if(process.env.BETA_USER_IDS && !process.env.BETA_USER_IDS.split(',').map(x=>x.trim()).includes(data.user.id))throw new ServiceError('Tu cuenta todavía no tiene acceso a la beta de servicios.',403);
 const admin=createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const quota=await admin.rpc('consume_service_quota',{p_user:data.user.id,p_kind:kind});
 if(quota.error)throw new ServiceError('No se ha podido comprobar la cuota. No se realizará la consulta.');
 if(quota.data!==true)throw new ServiceError('Se ha alcanzado la cuota diaria del servicio. Inténtalo otro día.',429);
 return data.user.id;
}
export function serviceFailure(error:unknown){return NextResponse.json({error:error instanceof ServiceError?error.message:'El servicio no responde. No se ha modificado tu información.'},{status:error instanceof ServiceError?error.status:502,headers:{'Cache-Control':'no-store'}});}
export async function boundedJson(request:Request,max=50000){const reader=request.body?.getReader();if(!reader)throw new ServiceError('Falta el contenido de la consulta.',400);let size=0;const chunks:Uint8Array[]=[];try{for(;;){const x=await reader.read();if(x.done)break;size+=x.value.byteLength;if(size>max){await reader.cancel();throw new ServiceError('Consulta demasiado grande.',413);}chunks.push(x.value);}}finally{reader.releaseLock();}try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new ServiceError('Formato de consulta no válido.',400);}}

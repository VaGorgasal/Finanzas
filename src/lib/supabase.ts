import {createClient,type SupabaseClient} from '@supabase/supabase-js';
let client:SupabaseClient|null=null;
export function browserDatabase(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return null;
 client??=createClient(url,key);return client;
}
export async function authHeaders():Promise<Record<string,string>>{
 const db=browserDatabase();if(!db)return {};
 const {data}=await db.auth.getSession();return data.session?{Authorization:'Bearer '+data.session.access_token}:{};
}
export async function remoteFetch(url:string,init:RequestInit={}){
 return fetch(url,{...init,headers:{...await authHeaders(),...init.headers}});
}

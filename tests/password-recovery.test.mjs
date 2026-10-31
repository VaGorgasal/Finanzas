import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createClient} from '@supabase/supabase-js';
import {RECOVERY_KEY,recoveryRequested,rememberRecovery,resumeRecovery,forgetRecovery,recoveryFinishedUrl} from '../src/lib/password-recovery.ts';
function storage(){const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};}
test('un enlace de recuperación en inicio se reconoce antes de que el SDK borre el fragmento',()=>{
 const href='https://example.com/#access_token=example&refresh_token=example&type=recovery';
 const requested=recoveryRequested(href);assert.equal(requested,true);assert.equal(recoveryRequested('https://example.com/'),false);
 const s=storage();if(requested)rememberRecovery(s,'account-A',100);assert.equal(resumeRecovery(s,'account-A',200),true);
 assert.equal(s.getItem(RECOVERY_KEY).includes('access_token'),false);assert.equal(s.getItem(RECOVERY_KEY).includes('refresh_token'),false);
});
test('el destino explícito abre el formulario sin confundir confirmación o acceso normal',()=>{
 assert.equal(recoveryRequested('https://example.com/cuenta?recuperar=1'),true);
 for(const url of ['https://example.com/cuenta','https://example.com/#type=signup','https://example.com/#type=magiclink'])assert.equal(recoveryRequested(url),false);
});
test('recargar conserva la recuperación solo para la misma cuenta y dentro del plazo',()=>{
 const s=storage();rememberRecovery(s,'A',100);assert.equal(resumeRecovery(s,'A',200),true);assert.equal(resumeRecovery(s,'B',200),false);assert.equal(resumeRecovery(s,'A',100+30*60*1000),false);
 forgetRecovery(s);assert.equal(resumeRecovery(s,'A',200),false);
 s.setItem(RECOVERY_KEY,'broken');assert.equal(resumeRecovery(s,'A',200),false);
});
test('sin sessionStorage el flujo actual puede continuar y al terminar elimina solo el marcador de pantalla',()=>{
 const broken={getItem(){throw Error();},setItem(){throw Error();},removeItem(){throw Error();}};
 assert.doesNotThrow(()=>rememberRecovery(broken,'A'));assert.equal(resumeRecovery(broken,'A'),false);assert.doesNotThrow(()=>forgetRecovery(broken));
 assert.doesNotThrow(()=>rememberRecovery(null,'A'));assert.equal(resumeRecovery(null,'A'),false);
 assert.equal(recoveryFinishedUrl('https://example.com/cuenta?recuperar=1&x=1'),'/cuenta?x=1');
 assert.equal(recoveryFinishedUrl('https://example.com/#type=recovery&access_token=example'),'/');
});
test('el marcador de pantalla no permite cambiar la contraseña sin una sesión de Supabase',async()=>{
 const s=storage();rememberRecovery(s,'A');let calls=0;
 const db=createClient('https://example.supabase.co','public-test-key',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:async()=>{calls++;throw Error('Unexpected network');}}});
 const {error}=await db.auth.updateUser({password:'test phrase never transmitted'});assert.ok(error);assert.equal(calls,0);assert.equal(resumeRecovery(s,'A'),true);
});

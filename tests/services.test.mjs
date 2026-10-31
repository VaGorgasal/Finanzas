import assert from 'node:assert/strict';import {test} from 'node:test';
import {normalizeNews} from '../src/lib/news.ts';
import {convertToEur} from '../src/lib/fx.ts';
import {loanScenario,savingsScenario} from '../src/lib/scenarios.ts';
import {aggregateExposure,parseCompositions} from '../src/lib/exposures.ts';
import {parsePortfolio,loadPortfolioSafely,STORAGE_KEY} from '../src/lib/storage.ts';
import {parseBackup,restoreBackupExtras} from '../src/lib/backup.ts';
import {makeEmptyPortfolio} from '../src/data/empty.ts';import {emptyPlan} from '../src/lib/financial-plan.ts';
test('noticias eliminan duplicados, URLs peligrosas y fechas imposibles',()=>{
 const row={title:'Resultado de prueba',date:'2026-10-20T10:00:00Z',link:'https://example.com/article',content:'<script>instrucciones</script>Texto',symbols:['AAPL.US']};const out=normalizeNews([row,{...row,link:'https://example.org/repeat'},{...row,title:'bad',link:'javascript:alert(1)'},{...row,title:'future',date:'9999-01-01'}],Date.parse('2026-10-30'));assert.equal(out.length,1);assert.equal(out[0].source,'example.com');assert.ok(!out[0].excerpt.includes('<script>'));
});
test('cuota cero y ahorro sin retorno concilian; préstamos no admiten plazos inválidos',()=>{
 assert.equal(loanScenario(1200,0,12,10).payment,100);assert.equal(loanScenario(1200,0,12,10).total,1210);assert.equal(savingsScenario(100,20,12,0).value,340);assert.throws(()=>loanScenario(100,-1,12));assert.throws(()=>loanScenario(100,5,0));assert.throws(()=>savingsScenario(0,100,12,-100));
});
test('FX conserva importe original y exige coherencia con los euros',()=>{
 assert.equal(convertToEur(100,.92),92);assert.throws(()=>convertToEur(100,0));const p=makeEmptyPortfolio();p.instruments=[{id:'a',name:'Test',isin:'IE00BYX5NX33',kind:'fondo',category:'global',color:'#008f85',explanation:'',risk:'',price:10,priceDate:'2026-10-20',quoteSource:'manual',currency:'EUR'}];p.transactions=[{id:'t',instrumentId:'a',type:'BUY',date:'2026-10-20',amount:92,units:1,fee:.92,fx:{currency:'USD',amount:100,fee:1,eurPerUnit:.92,date:'2026-10-20',source:'Extracto'}}];assert.equal(parsePortfolio(p).transactions[0].fx.currency,'USD');assert.throws(()=>parsePortfolio({...p,transactions:[{...p.transactions[0],amount:100}]}));
});
test('solapamientos agregan solo pesos conocidos, sin inventar cobertura de fondos',()=>{
 const c=parseCompositions([{instrumentId:'fund',date:'2026-10-20',source:'https://example.com/factsheet',positions:[{id:'X',name:'X',weight:20}]}]);const holdings=[{instrument:{id:'fund',name:'Fund',kind:'fondo'},units:1,value:100},{instrument:{id:'stock',isin:'X',name:'X',kind:'acción'},units:1,value:100},{instrument:{id:'unknown',name:'Unknown',kind:'fondo'},units:1,value:100}];const r=aggregateExposure(holdings,c);assert.equal(r.rows[0].value,120);assert.equal(r.coverage,.4);assert.equal(r.rows[0].products.length,2);assert.throws(()=>parseCompositions([{...c[0],positions:[{id:'X',name:'X',weight:101}]}]));
});
test('copia completa incluye perfil e historial y recupera copias antiguas',()=>{
 const copy=parseBackup({format:'brujula-complete-v1',portfolio:makeEmptyPortfolio(),plan:emptyPlan()});assert.equal(copy.format,'brujula-complete-v3');assert.deepEqual(copy.history,[]);assert.equal(copy.profile,null);assert.throws(()=>parseBackup({...copy,profile:{goal:'bad'}}));
});
test('lectura dañada conserva el original y restaura todas las claves ante fallo de cuota',()=>{
 const values=new Map([[STORAGE_KEY,'{broken']]);let fail=false;globalThis.window={localStorage:{getItem:k=>values.get(k)??null,setItem(k,v){if(fail&&k==='brujula-investor-profile-v1'){fail=false;throw new Error('quota');}values.set(k,v);},removeItem:k=>values.delete(k)},dispatchEvent(){}};globalThis.localStorage=window.localStorage;
 assert.ok(loadPortfolioSafely().error);assert.equal(values.get(STORAGE_KEY),'{broken');const before=new Map(values);fail=true;assert.throws(()=>restoreBackupExtras(parseBackup({format:'brujula-complete-v2',portfolio:makeEmptyPortfolio(),plan:emptyPlan()})));assert.deepEqual(values,before);delete globalThis.window;delete globalThis.localStorage;
});

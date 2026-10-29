import type {FaqEntry} from '../data/faq';
export function normalizeFaqText(value:string):string{return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').trim();}
export function filterFaq(entries:FaqEntry[],query:string,category:string='Todas'):FaqEntry[]{const words=normalizeFaqText(query).split(/\s+/).filter(Boolean);return entries.filter(entry=>{if(category!=='Todas'&&entry.category!==category)return false;const text=normalizeFaqText(entry.question+' '+entry.answer+' '+entry.category+' '+(entry.keywords??''));return words.every(word=>text.includes(word));});}

export function loanScenario(principal:number,annualRate:number,months:number,fee=0){
 if(![principal,annualRate,months,fee].every(Number.isFinite)||principal<0||principal>1e9||annualRate<0||annualRate>100||!Number.isInteger(months)||months<1||months>600||fee<0||fee>1e9)throw new Error('Revisa capital, plazo, comisión y tipo.');
 const r=annualRate/1200;const payment=r===0?principal/months:principal*r/(1-Math.pow(1+r,-months));
 return {payment,total:payment*months+fee,interest:payment*months-principal,fee};
}
export function savingsScenario(initial:number,monthly:number,months:number,annualReturn:number){
 if(![initial,monthly,months,annualReturn].every(Number.isFinite)||initial<0||monthly<0||initial>1e9||monthly>1e9||!Number.isInteger(months)||months<1||months>600||annualReturn<=-100||annualReturn>100)throw new Error('Revisa los supuestos de ahorro.');
 const r=Math.pow(1+annualReturn/100,1/12)-1;
 const value=initial*Math.pow(1+r,months)+monthly*(Math.abs(r)<1e-12?months:(Math.pow(1+r,months)-1)/r);
 return {value,contributed:initial+monthly*months,growth:value-initial-monthly*months};
}

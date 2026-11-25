import {report,checks} from './field-v03.mjs';
const [mode='report',count='90']=process.argv.slice(2);
if(mode==='report')console.log(JSON.stringify(report(Number(count)),null,2));
else if(mode==='test')console.log(JSON.stringify({passed:checks()},null,2));
else throw Error('usage: report [seeds] | test');

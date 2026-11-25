import {createHmac,timingSafeEqual} from 'node:crypto';
const LIMIT=5000000;
function keyCheck(key){if(!Buffer.isBuffer(key)||key.length!==32)throw Error('32-byte key required');}
function digest(payload,key){return createHmac('sha256',key).update('PhiGenesis checkpoint v1\0','utf8').update(payload,'utf8').digest('hex');}
export function seal(payload,key){keyCheck(key);if(typeof payload!=='string'||payload.length>LIMIT)throw Error('payload');return JSON.stringify({version:1,payload,mac:digest(payload,key)});}
export function open(raw,key,expectedMac){keyCheck(key);if(typeof raw!=='string'||raw.length>LIMIT*6+1024)throw Error('envelope size');const d=JSON.parse(raw);if(d.version!==1||typeof d.payload!=='string'||d.payload.length>LIMIT||typeof d.mac!=='string'||!/^[0-9a-f]{64}$/.test(d.mac)||JSON.stringify({version:1,payload:d.payload,mac:d.mac})!==raw)throw Error('envelope');if(!timingSafeEqual(Buffer.from(d.mac,'hex'),Buffer.from(digest(d.payload,key),'hex')))throw Error('authentication');if(expectedMac!==undefined&&d.mac!==expectedMac)throw Error('checkpoint pin mismatch');return d.payload;}

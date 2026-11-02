import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
process.env.VERCEL='1';
for(const key of ['RESEND_API_KEY','CONTACT_FROM_EMAIL','GUESTBOOK_DB_URL','GUESTBOOK_DB_AUTH_TOKEN','LASTFM_API_KEY','LASTFM_USERNAME','SPOTIFY_CLIENT_ID','SPOTIFY_CLIENT_SECRET','SPOTIFY_REFRESH_TOKEN'])delete process.env[key];
let externalRequests = 0;
globalThis.fetch=async()=>{externalRequests++;throw new Error('External requests disabled for built-runtime QA')};
const functionRoot = '.vercel/output/functions/_render.func';
const config = JSON.parse(readFileSync(functionRoot + '/.vc-config.json', 'utf8'));
const {default: app}=await import(pathToFileURL(resolve(functionRoot, config.handler)).href);
const cases=[['guestbook','GET',undefined,503],['contact','POST',{name:'Test',email:'test@example.com',message:'Test'},503],['guestbook','POST',{message:'x'.repeat(9000)},413],['now-playing','GET',undefined,503]];
for(const [name,method,body,expected]of cases){const r=await app.fetch(new Request('https://rasyadwaarsya.my.id/api/'+name+'/',{method,headers:{'Content-Type':'application/json','Sec-Fetch-Site':'same-origin'},...(body?{body:JSON.stringify(body)}:{})}));console.log(JSON.stringify({route:name,method,http:r.status,expected}));if(r.status!==expected)throw Error('Unexpected status');}
const forbidden=await app.fetch(new Request('https://rasyadwaarsya.my.id/api/contact/',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://unrelated.example'},body:'{}'}));if(forbidden.status!==403)throw Error('Origin guard');
if(externalRequests)throw new Error('An unconfigured endpoint attempted an external request');
console.log('Built Vercel runtime passes missing-services, missing-IP, body-limit and origin checks. No external requests performed.');

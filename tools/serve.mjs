import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {extname,join,normalize} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=join(fileURLToPath(new URL('..',import.meta.url))),mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
const server=createServer(async(req,res)=>{try{const path=decodeURIComponent((req.url||'/').split('?')[0]),local=normalize(path==='/'?'web/index.html':join('web',path));if(local.startsWith('..'))throw new Error('not found');const full=join(root,local),info=await stat(full);if(!info.isFile())throw new Error('not found');res.writeHead(200,{'Content-Type':mime[extname(full)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(await readFile(full));}catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Not found');}});
const port=Number(process.env.PORT||8080);server.listen(port,'127.0.0.1',()=>console.log(`Neuron Beat at http://localhost:${port}`));

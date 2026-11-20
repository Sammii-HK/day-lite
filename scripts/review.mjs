// Serve only a compiled, no-key client build. No API, proxies, location or runtime data.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.ico':'image/x-icon','.png':'image/png','.svg':'image/svg+xml'};
http.createServer(async(req,res)=>{
  const pathname=new URL(req.url,'http://127.0.0.1').pathname;
  const file=path.resolve(root,pathname==='/'?'index.html':'.'+pathname);
  if(!file.startsWith(root)){res.writeHead(404);res.end();return;}
  try{
    let body=await fs.readFile(file);
    if(path.extname(file)==='.html')body=body.toString().replace('<body>','<body><aside style="padding:10px 5%;font:11px system-ui;background:#243d50;color:#fff">Local offline review. Actual solar calculations; map tiles and geolocation are not exercised.</aside>');
    res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; base-uri 'none'; form-action 'none'");
    res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(body);
  }catch{res.writeHead(404);res.end();}
}).listen(4838,'127.0.0.1',()=>console.log('Day Lite offline review http://127.0.0.1:4838'));

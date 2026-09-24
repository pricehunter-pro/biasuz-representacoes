import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root=process.cwd();
const pairs={
  "index.html":["app.js"],
  "admin.html":["admin.js","auth-ui.js"],
  "portal.html":["portal.js","auth-ui.js"],
  "store.html":["store.js"],
  "commercial-admin.html":["commercial-admin.js"],
  "catalog-review.html":["catalog-review.js"],
  "catalog-share.html":["catalog-share.js"],
  "brand.html":["brand.js"],
  "catalogo.html":["catalogo.js"],
  "catalogs-admin.html":["catalogs-admin.js"],
  "reset-password.html":["reset-password.js"],
  "sales-admin.html":["sales-admin.js"]
};
const optionalSharedIds=new Set([
  "toggleSignup","signupPanel","createAccount","signupName","signupEmail","signupPassword","requestAccess"
]);
let failed=false;
const err=msg=>{failed=true;console.error("ERROR:",msg)};
const ok=msg=>console.log("OK:",msg);

for(const [htmlFile,jsFiles] of Object.entries(pairs)){
  if(!fs.existsSync(path.join(root,htmlFile))){err("Missing "+htmlFile);continue}
  const html=fs.readFileSync(path.join(root,htmlFile),"utf8");
  const ids=[...html.matchAll(/\bid=["']([^"']+)["']/g)].map(m=>m[1]);
  const seen=new Set();
  for(const id of ids){if(seen.has(id))err(htmlFile+" duplicate id #"+id);seen.add(id)}
  for(const jsFile of jsFiles){
    if(!fs.existsSync(path.join(root,jsFile))){err(htmlFile+" references missing "+jsFile);continue}
    const js=fs.readFileSync(path.join(root,jsFile),"utf8");
    try{new vm.Script(js,{filename:jsFile});ok(jsFile+" syntax")}
    catch(e){err(jsFile+" syntax: "+e.message)}
    for(const m of js.matchAll(/getElementById\(["']([^"']+)["']\)/g)){
      if(!seen.has(m[1])&&!optionalSharedIds.has(m[1])) err(jsFile+" expects #"+m[1]+" but "+htmlFile+" does not define it");
    }
  }
  for(const m of html.matchAll(/(?:src|href)=["']\.\/([^"'?#]+)[^"']*["']/g)){
    const asset=m[1];
    if(asset.startsWith("#"))continue;
    if(!fs.existsSync(path.join(root,asset)))err(htmlFile+" references missing local asset "+asset);
  }
}
for(const f of fs.readdirSync(root).filter(x=>/\.(js|html)$/i.test(x))){
 const t=fs.readFileSync(path.join(root,f),"utf8");
 if(/SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY|\bservice_role\b\s*[:=]/i.test(t))err(f+" appears to contain an administrative Supabase secret reference");
}
if(failed)process.exit(1);
console.log("Quality checks completed successfully.");

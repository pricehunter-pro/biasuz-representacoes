import { createClient } from "@supabase/supabase-js";

const url=process.env.SUPABASE_URL;
const key=process.env.SUPABASE_SERVICE_KEY;
const onlySlug=process.env.BRAND_SLUG||"";
const maxGeneric=Number(process.env.MAX_GENERIC_PRODUCTS||120);
if(!url||!key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY are required");
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});

const strip=s=>String(s||"").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();
const abs=(base,p)=>{try{return new URL(p,base).href}catch{return null}};
async function getText(u){const r=await fetch(u,{headers:{"user-agent":"BiasuzCatalogBot/1.0 (+https://bia.dunihub.online)","accept":"text/html,application/xml,application/json"}});if(!r.ok)throw new Error(r.status+" "+u);return r.text()}
async function getJson(u){const r=await fetch(u,{headers:{"user-agent":"BiasuzCatalogBot/1.0 (+https://bia.dunihub.online)","accept":"application/json"}});if(!r.ok)throw new Error(r.status+" "+u);return r.json()}
function locs(xml){return [...xml.matchAll(/<loc>(.*?)<\/loc>/gsi)].map(m=>m[1].replace(/&amp;/g,"&").trim())}
function productJsonLd(html){
 const scripts=[...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
 const out=[];
 for(const s of scripts){try{const j=JSON.parse(s);const nodes=Array.isArray(j)?j:(j?.["@graph"]||[j]);for(const n of nodes){if(n?.["@type"]==="Product"||Array.isArray(n?.["@type"])&&n["@type"].includes("Product"))out.push(n)}}catch{}}
 return out;
}
async function upsert(brand,items){
 if(!items.length)return 0;
 const rows=items.map(p=>({representada_id:brand.id,external_key:p.external_key||null,name:p.name,category:p.category||null,subcategory:p.subcategory||null,description:p.description||null,sku:p.sku||null,ean:p.ean||null,product_url:p.product_url||null,image_url:p.image_url||null,attributes:p.attributes||{},active:true,source_url:p.source_url||p.product_url||brand.official_url,source_checked_at:new Date().toISOString()}));
 const {error}=await db.from("products").upsert(rows,{onConflict:"representada_id,name,sku,product_url"});if(error)throw error;return rows.length
}
async function shopify(brand){
 const origin=new URL(brand.official_url).origin;let page=1,total=0,found=false;
 while(page<=20){let j;try{j=await getJson(origin+"/products.json?limit=250&page="+page)}catch{return found?total:0}
  const ps=j?.products||[];if(!ps.length)break;found=true;
  const items=ps.map(p=>{const v=p.variants?.[0]||{};return {external_key:String(p.id),name:p.title,description:strip(p.body_html),sku:v.sku||null,ean:v.barcode||null,product_url:origin+"/products/"+p.handle,image_url:p.images?.[0]?.src||null,attributes:{vendor:p.vendor,product_type:p.product_type,tags:p.tags,variants:p.variants?.length||0},source_url:origin+"/products/"+p.handle}});
  total+=await upsert(brand,items);page++;
 }return total
}
async function generic(brand){
 const origin=new URL(brand.official_url).origin;let sitemap;
 for(const p of ["/sitemap.xml","/sitemap_index.xml","/wp-sitemap.xml"]){try{sitemap=await getText(origin+p);if(sitemap)break}catch{}}
 if(!sitemap)return 0;
 let urls=locs(sitemap);const nested=urls.filter(x=>/sitemap/i.test(x));
 for(const s of nested.slice(0,20)){try{urls.push(...locs(await getText(s)))}catch{}}
 urls=[...new Set(urls)].filter(x=>/product|produto|produtos|products|shop|loja/i.test(x)&&!/sitemap/i.test(x)).slice(0,maxGeneric);
 const items=[];
 for(const u of urls){try{const html=await getText(u);for(const p of productJsonLd(html)){const img=Array.isArray(p.image)?p.image[0]:p.image;items.push({external_key:p.sku||p.mpn||u,name:p.name,description:strip(p.description),sku:p.sku||null,ean:p.gtin13||p.gtin||null,product_url:p.url||u,image_url:typeof img==="string"?abs(u,img):img?.url?abs(u,img.url):null,category:p.category||null,attributes:{brand:p.brand?.name||p.brand||null},source_url:u})}}catch{}}
 return upsert(brand,items)
}
async function runBrand(brand){
 console.log("Sync",brand.name);let count=0;
 try{count=await shopify(brand);if(!count)count=await generic(brand);
  await db.from("representadas").update({catalog_status:count?"partial":"review",last_catalog_sync_at:new Date().toISOString()}).eq("id",brand.id);
  console.log(brand.name,count);
 }catch(e){console.error(brand.name,e.message);await db.from("representadas").update({catalog_status:"review"}).eq("id",brand.id)}
}
let q=db.from("representadas").select("*").eq("active",true).order("name");if(onlySlug)q=q.eq("slug",onlySlug);
const {data:brands,error}=await q;if(error)throw error;
for(const b of brands||[])await runBrand(b);

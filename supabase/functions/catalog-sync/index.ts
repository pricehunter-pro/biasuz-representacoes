
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const strip = (s:any) => String(s ?? "").replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]*>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&#039;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g," ").trim();
const abs = (base:string,p:any) => { try { return new URL(String(p),base).href } catch { return null } };
const num = (v:any) => { const n=Number(v); return Number.isFinite(n)?n:null };
const priceMinor = (v:any,minor:any=2) => { const n=Number(v); return Number.isFinite(n)?n/Math.pow(10,Number(minor)||2):null };
const uniq = <T>(a:T[]) => [...new Set(a)];

async function fetchText(url:string){
  const r=await fetch(url,{headers:{"user-agent":"BiasuzCatalogSync/2.0 (+https://bia.dunihub.online)","accept":"text/html,application/xml,text/xml,application/json;q=0.9,*/*;q=0.8"}});
  if(!r.ok) throw new Error(String(r.status)+" "+url);
  return await r.text();
}
async function fetchJson(url:string){
  const r=await fetch(url,{headers:{"user-agent":"BiasuzCatalogSync/2.0 (+https://bia.dunihub.online)","accept":"application/json,*/*;q=0.8"}});
  if(!r.ok) throw new Error(String(r.status)+" "+url);
  return await r.json();
}
function locs(xml:string){ return [...xml.matchAll(/<loc>(.*?)<\/loc>/gsi)].map(m=>m[1].replace(/&amp;/g,"&").trim()) }
function meta(html:string,name:string,property=false){
  const attr=property?"property":"name";
  const needle1=attr+'="'+name+'"';
  const needle2=attr+"='"+name+"'";
  for(const tag of html.match(/<meta[^>]*>/gi)||[]){
    if(!tag.toLowerCase().includes(needle1.toLowerCase())&&!tag.toLowerCase().includes(needle2.toLowerCase()))continue;
    const m=tag.match(/content=["']([^"']+)["']/i);if(m)return m[1];
  }
  return null;
}
function h1(html:string){return strip(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||"")}
function jsonLdNodes(html:string){
  const out:any[]=[];
  for(const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
    try{
      const j=JSON.parse(m[1]);
      const walk=(x:any)=>{
        if(Array.isArray(x)){x.forEach(walk);return}
        if(!x||typeof x!=="object")return;
        if(x["@graph"])walk(x["@graph"]);
        out.push(x);
      };
      walk(j);
    }catch{}
  }
  return out;
}
function productLd(html:string){return jsonLdNodes(html).filter((n:any)=>n?.["@type"]==="Product" || (Array.isArray(n?.["@type"])&&n["@type"].includes("Product")))}
function breadcrumbCategory(html:string){
  const bc=jsonLdNodes(html).find((n:any)=>n?.["@type"]==="BreadcrumbList");
  const items=bc?.itemListElement||[];
  const names=items.map((x:any)=>x?.name||x?.item?.name).filter(Boolean);
  return names.length>1?names[names.length-2]:null;
}
function offerFromLd(p:any){
  const offers=Array.isArray(p?.offers)?p.offers:[p?.offers].filter(Boolean);
  const o=offers[0]||{};
  const av=String(o.availability||"").toLowerCase();
  return {price:num(o.price||o.lowPrice),currency:o.priceCurrency||null,availability:av.includes("outofstock")?"out_of_stock":av.includes("instock")?"in_stock":null};
}

async function saveProducts(db:any,brand:any,platform:string,items:any[]){
  if(!items.length)return {products:0,variants:0,images:0};
  const uniqueItems=[...new Map(items.filter(x=>x?.name&&x?.external_key).map(x=>[String(x.external_key),x])).values()];
  const clean=uniqueItems.map(x=>({
    representada_id:brand.id,
    external_key:String(x.external_key),
    name:String(x.name).trim(),
    category:x.category||null,
    subcategory:x.subcategory||null,
    group_name:x.group_name||null,
    description:x.description||null,
    sku:x.sku||null,
    ean:x.ean||null,
    package_info:x.package_info||null,
    unit_label:x.unit_label||null,
    product_url:x.product_url||null,
    image_url:x.image_url||x.images?.[0]?.url||x.images?.[0]||null,
    attributes:x.attributes||{},
    active:true,
    source_url:x.source_url||x.product_url||brand.official_url,
    source_checked_at:new Date().toISOString(),
    source_platform:platform,
    source_price:x.source_price??null,
    source_compare_at_price:x.source_compare_at_price??null,
    source_currency:x.source_currency||null,
    source_availability:x.source_availability||null,
    source_last_seen_at:new Date().toISOString(),
    source_metadata:x.source_metadata||{}
  }));
  let count=0,variantCount=0,imageCount=0;
  for(let i=0;i<clean.length;i+=100){
    const part=clean.slice(i,i+100);
    const {data,error}=await db.from("products").upsert(part,{onConflict:"representada_id,external_key"}).select("id,external_key");
    if(error)throw error;
    count+=data?.length||0;
    const idMap=new Map((data||[]).map((r:any)=>[String(r.external_key),r.id]));
    const original=uniqueItems.filter(x=>idMap.has(String(x.external_key)));
    const imageRows:any[]=[],variantRows:any[]=[];
    for(const it of original){
      const pid=idMap.get(String(it.external_key));
      const imgs=(it.images||[]).map((im:any,idx:number)=>typeof im==="string"?{url:im,alt:null,position:idx}:({url:im.url||im.src,alt:im.alt||null,position:im.position??idx})).filter((im:any)=>im.url);
      for(const im of imgs) imageRows.push({product_id:pid,image_url:im.url,alt_text:im.alt,position:im.position,source_url:it.product_url||it.source_url||null});
      for(const v of it.variants||[]) variantRows.push({product_id:pid,external_key:v.external_key?String(v.external_key):null,sku:v.sku||null,ean:v.ean||null,name:v.name||null,option_values:v.option_values||{},source_price:v.source_price??null,source_compare_at_price:v.source_compare_at_price??null,source_currency:v.source_currency||it.source_currency||null,available:v.available??null,image_url:v.image_url||null,source_metadata:v.source_metadata||{}});
    }
    const uniqueImages=[...new Map(imageRows.map((x:any)=>[String(x.product_id)+"|"+String(x.image_url),x])).values()];
    const uniqueVariants=[...new Map(variantRows.map((x:any)=>[String(x.product_id)+"|"+String(x.external_key||"")+"|"+String(x.sku||""),x])).values()];
    if(uniqueImages.length){const {error:e}=await db.from("product_images").upsert(uniqueImages,{onConflict:"product_id,image_url"});if(e)throw e;imageCount+=uniqueImages.length}
    if(uniqueVariants.length){const {error:e}=await db.from("product_variants").upsert(uniqueVariants,{onConflict:"product_id,external_key,sku"});if(e)throw e;variantCount+=uniqueVariants.length}
  }
  return {products:count,variants:variantCount,images:imageCount};
}

async function shopify(brand:any){
  const origin=new URL(brand.official_url).origin;
  const items:any[]=[];
  for(let page=1;page<=40;page++){
    const j=await fetchJson(origin+"/products.json?limit=250&page="+page);
    const ps=j?.products||[]; if(!ps.length)break;
    for(const p of ps){
      const variants=(p.variants||[]).map((v:any)=>({
        external_key:String(v.id),sku:v.sku||null,ean:v.barcode||null,name:v.title||null,
        option_values:{option1:v.option1,option2:v.option2,option3:v.option3},
        source_price:num(v.price),source_compare_at_price:num(v.compare_at_price),source_currency:"BRL",
        available:v.available??null,image_url:(p.images||[]).find((im:any)=>im.id===v.image_id)?.src||null,
        source_metadata:{grams:v.grams,weight:v.weight,weight_unit:v.weight_unit}
      }));
      const availableVariants=variants.filter((v:any)=>v.available!==false);
      const prices=(availableVariants.length?availableVariants:variants).map((v:any)=>v.source_price).filter((x:any)=>x!=null);
      const compares=(availableVariants.length?availableVariants:variants).map((v:any)=>v.source_compare_at_price).filter((x:any)=>x!=null);
      items.push({
        external_key:"shopify:"+p.id,name:p.title,description:strip(p.body_html),sku:variants[0]?.sku||null,ean:variants[0]?.ean||null,
        category:p.product_type||null,group_name:p.vendor||null,product_url:origin+"/products/"+p.handle,
        image_url:p.images?.[0]?.src||null,images:(p.images||[]).map((im:any,idx:number)=>({url:im.src,alt:im.alt,position:idx})),
        variants,source_price:prices.length?Math.min(...prices):null,source_compare_at_price:compares.length?Math.min(...compares):null,
        source_currency:"BRL",source_availability:availableVariants.length?"in_stock":variants.length?"out_of_stock":"unknown",
        attributes:{vendor:p.vendor,product_type:p.product_type,tags:p.tags,handle:p.handle},
        source_metadata:{shopify_id:p.id,created_at:p.created_at,updated_at:p.updated_at}
      });
    }
    if(ps.length<250)break;
  }
  return items;
}

async function woo(brand:any){
  const origin=new URL(brand.official_url).origin;const items:any[]=[];
  for(let page=1;page<=30;page++){
    const ps=await fetchJson(origin+"/wp-json/wc/store/v1/products?per_page=100&page="+page);
    if(!Array.isArray(ps)||!ps.length)break;
    for(const p of ps){
      const minor=p.prices?.currency_minor_unit??2;
      items.push({
        external_key:"woo:"+p.id,name:p.name,description:strip(p.description||p.short_description),sku:p.sku||null,
        category:p.categories?.[0]?.name||null,subcategory:p.categories?.[1]?.name||null,
        product_url:p.permalink||origin+"/?p="+p.id,image_url:p.images?.[0]?.src||null,
        images:(p.images||[]).map((im:any,idx:number)=>({url:im.src,alt:im.alt,position:idx})),
        source_price:priceMinor(p.prices?.price,minor),source_compare_at_price:priceMinor(p.prices?.regular_price,minor),
        source_currency:p.prices?.currency_code||"BRL",source_availability:p.is_in_stock===false?"out_of_stock":"in_stock",
        attributes:{categories:p.categories,tags:p.tags,average_rating:p.average_rating,review_count:p.review_count},
        source_metadata:{woo_id:p.id,has_options:p.has_options,variation:p.variation||""}
      });
    }
    if(ps.length<100)break;
  }
  return items;
}

async function vtex(brand:any){
  const origin=new URL(brand.official_url).origin;const items:any[]=[];
  for(let from=0;from<2500;from+=50){
    const to=from+49;
    const ps=await fetchJson(origin+"/api/catalog_system/pub/products/search?_from="+from+"&_to="+to);
    if(!Array.isArray(ps)||!ps.length)break;
    for(const p of ps){
      const vars:any[]=[];const imgs:any[]=[];
      let bestPrice:any=null,compare:any=null,available=false,firstSku=null,firstEan=null;
      for(const it of p.items||[]){
        const offer=it.sellers?.[0]?.commertialOffer||{};
        const price=num(offer.Price),list=num(offer.ListPrice);
        if(offer.AvailableQuantity>0||offer.IsAvailable===true)available=true;
        if(price!=null&&(bestPrice==null||price<bestPrice))bestPrice=price;
        if(list!=null&&(compare==null||list<compare))compare=list;
        firstSku=firstSku||it.referenceId?.[0]?.Value||String(it.itemId||"");
        firstEan=firstEan||it.ean||null;
        for(const im of it.images||[]) imgs.push({url:im.imageUrl,alt:im.imageLabel||p.productName});
        vars.push({external_key:String(it.itemId),sku:it.referenceId?.[0]?.Value||null,ean:it.ean||null,name:it.name||null,source_price:price,source_compare_at_price:list,source_currency:"BRL",available:offer.AvailableQuantity>0||offer.IsAvailable===true,image_url:it.images?.[0]?.imageUrl||null,source_metadata:{available_quantity:offer.AvailableQuantity}});
      }
      items.push({
        external_key:"vtex:"+p.productId,name:p.productName,description:strip(p.description),sku:firstSku,ean:firstEan,
        category:(p.categories||[])[0]?.split("/").filter(Boolean).pop()||null,group_name:p.brand||null,product_url:p.link,
        image_url:imgs[0]?.url||null,images:imgs,variants:vars,source_price:bestPrice,source_compare_at_price:compare,source_currency:"BRL",
        source_availability:available?"in_stock":"out_of_stock",attributes:{brand:p.brand,categories:p.categories,categoryId:p.categoryId},
        source_metadata:{vtex_product_id:p.productId}
      });
    }
    if(ps.length<50)break;
  }
  return items;
}

async function sitemapUrls(origin:string){
  let roots:string[]=[];
  for(const p of ["/sitemap.xml","/sitemap_index.xml","/wp-sitemap.xml"]){
    try{const x=await fetchText(origin+p);const l=locs(x);if(l.length){roots.push(...l);break}}catch{}
  }
  if(!roots.length)return [];
  let pages:string[]=[];let queue=[...roots];let seen=new Set<string>();
  for(let depth=0;depth<3&&queue.length;depth++){
    const next:string[]=[];
    for(const u of queue.slice(0,80)){
      if(seen.has(u))continue;seen.add(u);
      if(/sitemap/i.test(u)){
        try{const l=locs(await fetchText(u));for(const x of l){if(/sitemap/i.test(x))next.push(x);else pages.push(x)}}catch{}
      }else pages.push(u);
    }
    queue=next;
  }
  return uniq(pages);
}

async function generic(brand:any,maxPages:number){
  const origin=new URL(brand.official_url).origin;
  const discovered=new Set<string>();
  const listingLinks=new Set<string>();

  const addLink=(base:string,href:any)=>{
    const u=abs(base,href); if(!u)return;
    try{
      const x=new URL(u); if(x.origin!==origin)return;
      const p=x.pathname.toLowerCase();
      if(/\.(jpg|jpeg|png|gif|webp|svg|pdf|xml|zip|css|js|ico)$/i.test(p))return;
      if(/\/(login|conta|account|carrinho|cart|checkout|politica|privacy|contato|contact|sobre|about|blog|noticia|news|tag|author|feed)(\/|$)/i.test(p))return;
      listingLinks.add(x.href.split("#")[0]);
    }catch{}
  };

  const allSitemapUrls=await sitemapUrls(origin);
  for(const u of allSitemapUrls){
    if(/\/produto[s]?\/|\/product[s]?\/|\/shop\/|\/item\/|\/b2c\//i.test(u)) discovered.add(u);
  }

  const seedPages=uniq([
    brand.official_url,
    origin+"/produtos/",
    origin+"/produtos",
    origin+"/products/",
    origin+"/products",
    origin+"/loja/",
    origin+"/shop/",
    origin+"/produtos-todos-os-produtos",
    origin+"/todos-os-produtos",
    origin+"/b2c/c/rawraw"
  ]);

  for(const seed of seedPages){
    try{
      const html=await fetchText(seed);
      for(const m of html.matchAll(/href=["']([^"']+)["']/gi))addLink(seed,m[1]);
      for(const m of html.matchAll(/href=["']([^"']*(?:\?|&)pg=\d+[^"']*)["']/gi))addLink(seed,m[1]);
      for(const m of html.matchAll(/href=["']([^"']*(?:\?|&)page=\d+[^"']*)["']/gi))addLink(seed,m[1]);
    }catch{}
  }

  const pagedSeeds=seedPages.filter(x=>/produto|product|todos-os-produtos|rawraw/i.test(x));
  for(const seed of pagedSeeds.slice(0,4)){
    for(let n=2;n<=20;n++){
      const sep=seed.includes("?")?"&":"?";
      for(const pageUrl of [seed+sep+"pg="+n,seed+sep+"page="+n,seed.replace(/\/$/,"")+"/page/"+n+"/"]){
        try{
          const html=await fetchText(pageUrl);
          if(!html||/404|página não encontrada|page not found/i.test(h1(html)))continue;
          for(const m of html.matchAll(/href=["']([^"']+)["']/gi))addLink(pageUrl,m[1]);
        }catch{}
      }
    }
  }

  for(const u of listingLinks){
    try{
      const x=new URL(u),p=x.pathname.toLowerCase();
      if(x.href===origin+"/"||p==="/")continue;
      if(/\/(categoria|category|colecao|collection|marcas|brands)(\/|$)/i.test(p))continue;
      if(/produtos-todos-os-produtos|todos-os-produtos|\/produtos\/?$|\/products\/?$|\/loja\/?$|\/shop\/?$|\/b2c\/c\//i.test(p))continue;
      discovered.add(x.href);
    }catch{}
  }

  if(!discovered.size){
    for(const u of allSitemapUrls){
      try{
        const x=new URL(u),p=x.pathname.toLowerCase();
        if(x.origin!==origin||p==="/")continue;
        if(/\.(jpg|jpeg|png|gif|webp|svg|pdf|xml|zip)$/i.test(p))continue;
        if(/(blog|noticia|news|politica|privacy|contato|contact|sobre|about|categoria|category|tag|author|feed)/i.test(p))continue;
        discovered.add(u);
      }catch{}
    }
  }

  const urls=[...discovered].slice(0,maxPages);
  const items:any[]=[];
  const rejectHeading=(name:string)=>/^(produtos|todos os produtos|categorias|loja|home|início|inicio|novidades|lançamentos|mais vendidos|onde comprar|revendedores)$/i.test(name.trim());

  for(let i=0;i<urls.length;i+=10){
    const batch=urls.slice(i,i+10);
    const out=await Promise.all(batch.map(async u=>{
      try{
        const html=await fetchText(u);
        const lds=productLd(html);
        if(lds.length){
          return lds.map((p:any)=>{
            const off=offerFromLd(p),img=Array.isArray(p.image)?p.image:[p.image].filter(Boolean);
            const imageUrls=img.map((x:any)=>typeof x==="string"?abs(u,x):abs(u,x?.url)).filter(Boolean);
            return {external_key:"url:"+u,name:p.name||h1(html),description:strip(p.description||meta(html,"description")),sku:p.sku||null,ean:p.gtin13||p.gtin14||p.gtin||null,category:p.category||breadcrumbCategory(html),product_url:p.url||u,image_url:imageUrls[0]||meta(html,"og:image",true),images:imageUrls.map((x:any,idx:number)=>({url:x,position:idx})),source_price:off.price,source_currency:off.currency,source_availability:off.availability,attributes:{brand:p.brand?.name||p.brand||null},source_metadata:{jsonld:true}};
          });
        }

        const name=h1(html)||meta(html,"og:title",true);
        if(!name||rejectHeading(name))return [];
        const plain=strip(html);
        const ogType=String(meta(html,"og:type",true)||"").toLowerCase();
        const hasCommerce=/(sku|código|codigo|r\$|adicionar ao carrinho|comprar|estoque|indisponível|indisponivel)/i.test(plain);
        const likelyProduct=ogType==="product"||hasCommerce||/\/produto[s]?\/|\/product[s]?\/|\/item\/|\/b2c\//i.test(u);
        const image=meta(html,"og:image",true);
        const desc=strip(meta(html,"description")||meta(html,"og:description",true));
        if(!likelyProduct && !(image&&desc.length>35&&listingLinks.has(u)))return [];

        const sku=(plain.match(/(?:SKU|Código|Codigo)\s*:?\s*([A-Za-z0-9._/-]+)/i)||[])[1]||null;
        const prices=[...plain.matchAll(/R\$\s*([\d.]+,\d{2})/g)].map(m=>Number(m[1].replace(/\./g,"").replace(",","."))).filter(Number.isFinite);
        const sourcePrice=prices.length?Math.min(...prices):null;
        const compare=prices.length>1?Math.max(...prices):null;
        const unavailable=/indisponível|indisponivel|fora de estoque|esgotado/i.test(plain);
        const available=!unavailable&&/(adicionar ao carrinho|comprar|estoque|disponível|disponivel)/i.test(plain);
        return [{
          external_key:"url:"+u,
          name,
          description:desc||plain.slice(0,2500),
          sku,
          category:breadcrumbCategory(html),
          product_url:u,
          image_url:image,
          images:image?[{url:image,position:0}]:[],
          source_price:sourcePrice,
          source_compare_at_price:compare,
          source_currency:sourcePrice!=null?"BRL":null,
          source_availability:unavailable?"out_of_stock":available?"in_stock":null,
          source_metadata:{jsonld:false,og_type:ogType||null}
        }];
      }catch{return []}
    }));
    items.push(...out.flat());
  }
  return [...new Map(items.filter((x:any)=>x?.name&&x?.external_key).map((x:any)=>[String(x.external_key),x])).values()];
}

async function detectAndFetch(brand:any,source:any,maxPages:number){
  const hint=(source?.platform_hint||"auto").toLowerCase();
  const attempts:string[] = hint==="shopify"?["shopify","woo","vtex","generic"]:
    hint==="wordpress"?["woo","generic","shopify","vtex"]:
    hint==="vtex"?["vtex","shopify","woo","generic"]:
    ["shopify","woo","vtex","generic"];
  const errors:any[]=[];
  for(const platform of attempts){
    try{
      let items:any[]=[];
      if(platform==="shopify")items=await shopify(brand);
      if(platform==="woo")items=await woo(brand);
      if(platform==="vtex")items=await vtex(brand);
      if(platform==="generic")items=await generic(brand,maxPages);
      if(items.length)return {platform,items,errors};
    }catch(e:any){errors.push({platform,message:e?.message||String(e)})}
  }
  return {platform:"unknown",items:[],errors};
}

Deno.serve(async(req:Request)=>{
  if(req.method!=="POST")return new Response("Method not allowed",{status:405});
  try{
    const body=await req.json().catch(()=>({}));
    const slug=body.slug||null;
    const maxPages=Math.max(20,Math.min(Number(body.max_pages||350),1200));
    const secretJson=Deno.env.get("SUPABASE_SECRET_KEYS");
    const secret=secretJson?JSON.parse(secretJson)["default"]:Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supaUrl=Deno.env.get("SUPABASE_URL");
    if(!secret||!supaUrl)throw new Error("Supabase service credentials unavailable");
    const db=createClient(supaUrl,secret,{auth:{persistSession:false,autoRefreshToken:false}});
    let q=db.from("representadas").select("*").eq("active",true).order("name");
    if(slug)q=q.eq("slug",slug);
    const {data:brands,error}=await q;if(error)throw error;
    const results:any[]=[];
    for(const brand of brands||[]){
      const {data:sources}=await db.from("catalog_sources").select("*").eq("representada_id",brand.id).eq("enabled",true).order("priority");
      const source=(sources||[])[0]||{source_url:brand.official_url,platform_hint:"auto"};
      const {data:run,error:runErr}=await db.from("catalog_sync_runs").insert({representada_id:brand.id,source_id:source.id||null,status:"running"}).select("id").single();
      if(runErr)throw runErr;
      let platform="unknown",items:any[]=[],errors:any[]=[];
      try{
        const crawlBrand={...brand,official_url:source.source_url||brand.official_url};
        const got=await detectAndFetch(crawlBrand,source,maxPages);platform=got.platform;items=got.items;errors=got.errors;
        const saved=await saveProducts(db,brand,platform,items);
        const status=saved.products?"success":errors.length?"failed":"partial";
        await db.from("catalog_sync_runs").update({completed_at:new Date().toISOString(),status,platform,discovered_count:items.length,upserted_count:saved.products,variant_count:saved.variants,image_count:saved.images,error_count:errors.length,errors}).eq("id",run.id);
        await db.from("representadas").update({catalog_status:saved.products?"partial":"review",last_catalog_sync_at:new Date().toISOString()}).eq("id",brand.id);
        if(source.id)await db.from("catalog_sources").update({crawl_status:saved.products?"synced":"review",last_crawled_at:new Date().toISOString(),platform_hint:platform==="unknown"?source.platform_hint:platform}).eq("id",source.id);
        results.push({slug:brand.slug,platform,discovered:items.length,...saved,errors});
      }catch(e:any){
        errors.push({platform,message:e?.message||String(e)});
        await db.from("catalog_sync_runs").update({completed_at:new Date().toISOString(),status:"failed",platform,error_count:errors.length,errors}).eq("id",run.id);
        await db.from("representadas").update({catalog_status:"review",last_catalog_sync_at:new Date().toISOString()}).eq("id",brand.id);
        results.push({slug:brand.slug,platform,discovered:0,products:0,variants:0,images:0,errors});
      }
    }
    return Response.json({ok:true,results});
  }catch(e:any){return Response.json({ok:false,error:e?.message||String(e)},{status:500})}
});

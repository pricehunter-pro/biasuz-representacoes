import os, re, io, time, json, hashlib
import fitz
import pytesseract
from PIL import Image
from supabase import create_client

URL=os.environ["SUPABASE_URL"]
KEY=os.environ["SUPABASE_SERVICE_KEY"]
POLL=max(30,int(os.getenv("POLL_SECONDS","60")))
DPI=max(120,min(240,int(os.getenv("OCR_DPI","170"))))
MAX_PAGES=max(1,int(os.getenv("MAX_PAGES_PER_RUN","30")))
sb=create_client(URL,KEY)

def clean(s):
    return re.sub(r"\s+"," ",str(s or "")).strip()

def parse(text,page,brand):
    out=[]
    if brand=="jambo-pet":
        for m in re.finditer(r"(\d{4,6})\s*-\s*(JB[A-Z0-9-]+)\s+(.{5,180}?)(?=\s+(?:Tam\.?|TAMANHO|Mat\.?|MATERIAL|Emb\.?|EMBALAGEM|Código|$))",clean(text),re.I):
            out.append(dict(page_number=page,external_code=m.group(1),sku=m.group(2),detected_name=m.group(3).strip(),confidence=.96))
    elif brand=="german-hart":
        for m in re.finditer(r"([A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9 \-/&+]{2,55}?)\s+SKU\s+([A-Z]?\d{3,6})\b",clean(text),re.I):
            name=re.sub(r"\b(PORTA\s*PETISCOS|AROMA|COM LED|FLUTUAÇÃO)\b","",m.group(1),flags=re.I).strip()
            if len(name)>2: out.append(dict(page_number=page,sku=m.group(2),detected_name=name,confidence=.93))
    elif brand=="dentalight":
        for m in re.finditer(r"(?:Código|CODIGO|SKU)\s*:?\s*(\d{3,8})",clean(text),re.I):
            before=clean(text[max(0,m.start()-180):m.start()])
            name=before[-120:].strip()
            out.append(dict(page_number=page,sku=m.group(1),external_code=m.group(1),detected_name=name,confidence=.82))
    elif brand=="raw-raw":
        lines=[clean(x) for x in text.splitlines() if clean(x)]
        for i,l in enumerate(lines):
            if re.search(r"\|\s*(?:\d+\s*(?:g|kg)|\d+\s*unidades|unitária|unitaria|bag)",l,re.I):
                pm=None
                for z in lines[max(0,i-2):min(len(lines),i+4)]:
                    mm=re.search(r"R\$\s*([\d.]+,\d{2})",z)
                    if mm:
                        pm=float(mm.group(1).replace(".","").replace(",","."))
                        break
                out.append(dict(page_number=page,detected_name=l,detected_price=pm,confidence=.74))
    return out

def storage_download(bucket,path):
    return sb.storage.from_(bucket).download(path)

def process_catalog(cat):
    brand=cat["representadas"]["slug"]
    pages=sb.table("catalog_pages").select("*").eq("catalog_id",cat["id"]).execute().data or []
    targets=[p for p in pages if (p.get("metadata") or {}).get("ocr_required") is True and not p.get("ocr_text")]
    if not targets: return 0
    pdf_bytes=storage_download(cat.get("storage_bucket") or "catalogs",cat["storage_path"])
    doc=fitz.open(stream=pdf_bytes,filetype="pdf")
    done=0
    for row in targets[:MAX_PAGES]:
        pn=int(row["page_number"])
        page=doc[pn-1]
        pix=page.get_pixmap(dpi=DPI,colorspace=fitz.csGRAY,alpha=False)
        img=Image.open(io.BytesIO(pix.tobytes("png")))
        text=pytesseract.image_to_string(img,lang="por+eng",config="--psm 6").strip()

        # Page preview remains private in the catalogs bucket.
        preview=f"previews/{cat['id']}/page-{pn:04d}.jpg"
        rgb=page.get_pixmap(dpi=110,alpha=False)
        jpg=rgb.tobytes("jpeg",jpg_quality=72)
        try:
            sb.storage.from_("catalogs").upload(preview,jpg,{"content-type":"image/jpeg","upsert":"true"})
        except Exception:
            try: sb.storage.from_("catalogs").update(preview,jpg,{"content-type":"image/jpeg"})
            except Exception: pass

        meta=dict(row.get("metadata") or {})
        meta.update({"ocr_required":False,"ocr_length":len(text),"ocr_engine":"tesseract","ocr_lang":"por+eng","ocr_dpi":DPI})
        sb.table("catalog_pages").update({"ocr_text":text,"ocr_used":True,"preview_storage_path":preview,"metadata":meta}).eq("id",row["id"]).execute()

        # Replace only low-confidence candidates on this page.
        old=sb.table("catalog_product_candidates").select("id,confidence").eq("catalog_id",cat["id"]).eq("page_number",pn).execute().data or []
        low=[x["id"] for x in old if float(x.get("confidence") or 0)<.9]
        if low: sb.table("catalog_product_candidates").delete().in_("id",low).execute()

        cands=parse(text,pn,brand)
        for c in cands:
            c.update({"catalog_id":cat["id"],"representada_id":cat["representada_id"],"status":"pending" if c["confidence"]>=.9 else "review","source_page_image_path":preview,"raw_data":{"ocr":True,"engine":"tesseract"}})
        if cands: sb.table("catalog_product_candidates").insert(cands).execute()
        done+=1

    # Basic exact SKU matching after OCR.
    cands=sb.table("catalog_product_candidates").select("*").eq("catalog_id",cat["id"]).is_("matched_product_id","null").execute().data or []
    for c in cands:
        if not c.get("sku"): continue
        products=sb.table("products").select("id").eq("representada_id",cat["representada_id"]).ilike("sku",c["sku"]).limit(1).execute().data or []
        if products:
            pid=products[0]["id"]
            sb.table("catalog_product_candidates").update({"matched_product_id":pid,"status":"matched"}).eq("id",c["id"]).execute()
            try: sb.table("catalog_products").upsert({"catalog_id":cat["id"],"product_id":pid,"page_number":c["page_number"],"source_candidate_id":c["id"]},on_conflict="catalog_id,product_id").execute()
            except Exception: pass

    remain=sb.table("catalog_pages").select("id,metadata").eq("catalog_id",cat["id"]).execute().data or []
    pending=sum(1 for p in remain if (p.get("metadata") or {}).get("ocr_required") is True)
    summary=dict(cat.get("extraction_summary") or {})
    summary.update({"ocr_worker":"tesseract","ocr_pages_processed":summary.get("ocr_pages_processed",0)+done,"ocr_required_remaining":pending})
    sb.table("catalogs").update({"status":"review","extraction_summary":summary}).eq("id",cat["id"]).execute()
    return done

def run_once():
    cats=sb.table("catalogs").select("*,representadas!inner(slug,name)").in_("status",["review","uploaded","error"]).not_.is_("storage_path","null").order("updated_at").limit(20).execute().data or []
    total=0
    for c in cats:
        try:
            n=process_catalog(c); total+=n
            if n: print("OCR",c["slug"],n,"pages")
        except Exception as e:
            print("ERROR",c.get("slug"),str(e))
    return total

if __name__=="__main__":
    print("Biasuz OCR worker started")
    while True:
        run_once()
        time.sleep(POLL)

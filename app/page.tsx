"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { LANGS, TAX_PRESETS, TEMPLATES, baseLang, i18n, isLang, isRtl, langLoaded, loadLang, type Lang } from "@/lib/i18n";
import { ensurePdfFont, generateTradeQuotePDF, pdfFileName, tradeQuotePdfFile, type PdfArgs } from "@/lib/pdf";
import { DEFAULT_TAX_PRESET, formatRate, lineVatRate, presetLabelOf, presetOf } from "@/lib/tax";
import { DEFAULT_REGION, REGION_KEY, bizFields, defaultLang, defaultTaxPreset, formatDate, formatMoney, isQuebec, sameRegion, sanitizeRegion, taxPresetsFor, type BizField, type Region } from "@/lib/region";
import { RegionSelect } from "@/components/RegionSelect";
import { FREE_LIMIT, monthKey, countForThisMonth, resolvePro, isValidSubscriptionId, legacyProActive, migrateLegacyPlan } from "@/lib/plan";
import { CheckoutConsent, LegalFooterLinks } from "@/components/LegalLinks";
import { ManageSubscription } from "@/components/LegalClient";
import { formatRbq, isValidRbq, rbqLine } from "@/lib/rbq";
import { BackupPanel, downloadBackup } from "@/components/BackupPanel";
import { BACKUP_SNOOZE_KEY, LAST_EXPORT_KEY, MAX_HISTORY, exportReminderDue, localDate, sanitizeHistory, type ImportPlan } from "@/lib/backup";
import { computeTotals, docKey, nextDocNumber, printableItems, upsertHistory, zeroLines, type FullDoc, type SavedDoc } from "@/lib/docs";
import { INVOICE_STATUSES, QUOTE_STATUSES, STATUS_LABELS, matchesFilter, setStatus, statusAfterSave, statusOf, statusesFor, type DocStatus, type StatusFilter } from "@/lib/status";
import { ONBOARDED_KEY, Onboarding } from "@/components/Onboarding";
import { buildIcs, googleCalendarUrl, icsFileName, isYmd, mailtoLink, shareBody, shareSubject, type ScheduleInput } from "@/lib/schedule";
import { AccountingExport } from "@/components/AccountingExport";
import { LogoPicker } from "@/components/LogoPicker";
import { ClientsPanel } from "@/components/ClientsPanel";
import { CLIENTS_KEY, findClient, sanitizeClients, upsertClient, type SavedClient } from "@/lib/clients";
import { LOGO_KEY, sanitizeLogo, type Logo } from "@/lib/logo";
import { sanitizeFullDoc } from "@/lib/docs";

/** Default quote validity: 30 days (matches the default notes). */
const in30 = () => { const d = new Date(); d.setDate(d.getDate() + 30); return localDate(d); };
const NOTES: Record<Lang,string> = { fr: "Soumission valide 30 jours. Paiement à la réception de la facture. Merci de votre confiance.", en: "Quote valid for 30 days. Payment due on receipt of invoice. Thank you.", zh: "报价有效期 30 天。收到发票即付款。感谢您的信任。", ar: "عرض السعر صالح لمدة 30 يومًا. الدفع عند استلام الفاتورة. شكرًا لثقتكم." };
/** Small strings not in the dictionary (fr / en wording unchanged). */
const MSG: Record<Lang,{pdfDone:string;pdfErr:string;plans:string;yourBiz:string;quoteT:string;invT:string;legacy:string}> = {
  fr: { pdfDone: "PDF téléchargé ✓", pdfErr: "Impossible de créer le PDF. Vérifiez votre connexion et réessayez.", plans: "Détails des forfaits et FAQ →", yourBiz: "Votre entreprise", quoteT: "SOUMISSION", invT: "FACTURE", legacy: "Votre accès Pro est conservé jusqu'au 31 décembre 2026. Pour le lier à votre abonnement Stripe, écrivez à " },
  en: { pdfDone: "PDF downloaded ✓", pdfErr: "Could not create the PDF. Check your connection and try again.", plans: "Plan details & FAQ →", yourBiz: "Your business", quoteT: "QUOTE", invT: "INVOICE", legacy: "Your Pro access is kept until December 31, 2026. To link it to your Stripe subscription, email " },
  zh: { pdfDone: "PDF 已下载 ✓", pdfErr: "无法生成 PDF。请检查网络连接后重试。", plans: "套餐详情和常见问题 →", yourBiz: "您的企业", quoteT: "报价单", invT: "发票", legacy: "您的 Pro 权限保留至 2026 年 12 月 31 日。如需关联到 Stripe 订阅，请发邮件至 " },
  ar: { pdfDone: "تم تنزيل PDF ✓", pdfErr: "تعذر إنشاء PDF. تحقق من اتصالك وحاول مجددًا.", plans: "تفاصيل الخطط والأسئلة الشائعة ←", yourBiz: "شركتك", quoteT: "عرض سعر", invT: "فاتورة", legacy: "يبقى وصولك إلى Pro حتى 31 ديسمبر 2026. لربطه باشتراكك في Stripe، راسلنا على " },
};
const PRICING_HREF: Record<Lang,string> = { fr: "/tarifs", en: "/pricing", zh: "/zh/pricing", ar: "/ar/pricing" };
const DRAFT_KEY = "tq_draft";

type Plan="free"|"pro"; type DocType="quote"|"invoice"; type View="app"|"pricing"|"history"|"clients";
type Item={id:number;description:string;quantity:number;unitPrice:number;vatRate?:number};
type Saved=SavedDoc;
const EMPTY_CLIENT={name:"",address:"",city:"",email:"",phone:""};
const VIEWS:View[]=["app","history","clients","pricing"];
const STATUS_COLORS:Record<DocStatus,string>={draft:"bg-slate-50 text-slate-700",sent:"bg-blue-50 text-blue-800",accepted:"bg-emerald-50 text-emerald-800",refused:"bg-red-50 text-red-700",paid:"bg-emerald-100 text-emerald-900"};
const blankLine=()=>({id:Date.now(),description:"",quantity:1,unitPrice:0});
const EMPTY_COMPANY={name:"",address:"",city:"",email:"",phone:"",bn:"",gst:"",qst:"",rbq:"",interac:"",pst:"",licence:"",regNo:"",vatNo:""};
/** Stored business details: the region-specific fields are written only when filled, so a Québec profile is stored exactly as before. */
const REGION_FIELDS=["pst","licence","regNo","vatNo"] as const;
const storedCompany=(c:typeof EMPTY_COMPANY)=>{const o:Partial<typeof EMPTY_COMPANY>={...c}; for(const k of REGION_FIELDS) if(!o[k]) delete o[k]; return o;};

export default function Home(){
  const [view,setView]=useState<View>("app");
  const [lang,setLang]=useState<Lang>("fr");
  const [plan,setPlan]=useState<Plan>("free");
  const [legacyPro,setLegacyPro]=useState(false);
  const [docType,setDocType]=useState<DocType>("quote");
  const [count,setCount]=useState(0);
  const [history,setHistory]=useState<Saved[]>([]);
  const [showUp,setShowUp]=useState(false);
  const [loading,setLoading]=useState(false);
  const [taxPreset,setTaxPreset]=useState(DEFAULT_TAX_PRESET);
  const [customRate,setCustomRate]=useState(0);
  /** Business region (country + province/state); Québec by default. */
  const [region,setRegion]=useState<Region>(DEFAULT_REGION);
  /** US: optional local sales tax %. VAT countries: document VAT rate (undefined = preset default). */
  const [localRate,setLocalRate]=useState(0);
  const [docVat,setDocVat]=useState<number|undefined>(undefined);
  const [depositPct,setDepositPct]=useState(0);
  const [discountPct,setDiscountPct]=useState(0);
  const [toast,setToast]=useState<string|null>(null);
  const [jobSite,setJobSite]=useState("");
  const [jobDate,setJobDate]=useState("");
  const [jobEndDate,setJobEndDate]=useState("");
  /** docKey of the history entry reopened with "Ouvrir" (its number may be re-saved for another client name). */
  const [openedKey,setOpenedKey]=useState<string|null>(null);
  const [storageErr,setStorageErr]=useState(false);
  const [clients,setClients]=useState<SavedClient[]>([]);
  const [logo,setLogo]=useState<Logo|null>(null);
  /** "Votre entreprise" panel: open until the business name is filled (decided after mount). */
  const [bizOpen,setBizOpen]=useState(true);
  const [ready,setReady]=useState(false);
  /** First-run setup (new users only). */
  const [onb,setOnb]=useState(false);
  /** "X ligne(s) à 0 $" dialog before a download/share; zeroAck = lines the user chose to keep. */
  const [zeroAsk,setZeroAsk]=useState<null|"download"|"share">(null);
  const [zeroAck,setZeroAck]=useState("");
  /** Share fallback (no Web Share): steps to attach the downloaded PDF. */
  const [shareHelp,setShareHelp]=useState<{file:string;mailto:string}|null>(null);
  const [histFilter,setHistFilter]=useState<StatusFilter>("all");
  const t=i18n[lang];
  const [company,setCompany]=useState(EMPTY_COMPANY);
  const [lastExport,setLastExport]=useState<number|null>(null);
  const [reminder,setReminder]=useState(false);
  const [client,setClient]=useState(EMPTY_CLIENT);
  // Number and date are set after mount (the page is prerendered: avoids hydration mismatches).
  const [meta,setMeta]=useState({number:"",date:"",due:"",notes:NOTES.fr});
  const [items,setItems]=useState<Item[]>([{id:1,description:"",quantity:1,unitPrice:0}]);

  useEffect(()=>{try{
    const c=countForThisMonth(localStorage.getItem("tq_count_month"),localStorage.getItem("tq_count"));
    const h=localStorage.getItem("tq_history");
    const co=localStorage.getItem("tq_company");
    const l=localStorage.getItem("tq_lang") as Lang|null;
    const hist=h?sanitizeHistory(JSON.parse(h)).docs:[];
    setCount(c); setHistory(hist); if(co)setCompany(prev=>({...prev,...JSON.parse(co)}));
    // Region: absent = Québec (unchanged experience). Language: the user's explicit choice, else the region's default.
    const rg=sanitizeRegion(JSON.parse(localStorage.getItem(REGION_KEY)||"null")); setRegion(rg); setTaxPreset(defaultTaxPreset(rg));
    const choice=localStorage.getItem("tq_lang_choice")==="1";
    // Québec French unless the user explicitly chose another language (or the region's default is English).
    const ll:Lang=choice&&isLang(l)?l:defaultLang(rg);
    const en=ll!=="fr";
    if(en)setLang(ll);
    setMeta(m=>({...m,notes:en?NOTES[ll]:m.notes,number:nextDocNumber(hist,"quote",ll),date:localDate(),due:in30()}));
    const qv=new URLSearchParams(window.location.search).get("view"); if(qv==="pricing"||qv==="history"||qv==="clients")setView(qv);
    setClients(sanitizeClients(JSON.parse(localStorage.getItem(CLIENTS_KEY)||"[]")));
    setLogo(sanitizeLogo(JSON.parse(localStorage.getItem(LOGO_KEY)||"null")));
    const hasName=!!(co&&(JSON.parse(co)?.name||"").trim());
    if(hasName)setBizOpen(false);
    // First-run setup: only for a brand-new browser (no business name, no document, no subscription).
    if(!localStorage.getItem(ONBOARDED_KEY)&&!hasName&&hist.length===0&&!localStorage.getItem("tq_sub"))setOnb(true);
    // Unsaved document in progress (survives a reload / the phone closing the tab).
    const dr=JSON.parse(localStorage.getItem(DRAFT_KEY)||"null");
    const dd=dr?sanitizeFullDoc(dr.doc):undefined;
    if(dd&&(dr.type==="quote"||dr.type==="invoice")&&typeof dr.number==="string"&&dr.number){
      setDocType(dr.type); setClient({...EMPTY_CLIENT,...dd.client}); setJobSite(dd.jobSite); setJobDate(dd.jobDate); setJobEndDate(dd.jobEndDate);
      if(dd.items.length)setItems(dd.items.map((it,i)=>({id:i+1,...it})));
      setTaxPreset(dd.taxPreset); setCustomRate(dd.customRate); setDiscountPct(dd.discountPct); setDepositPct(dd.depositPct);
      setLocalRate(dd.localRate||0); setDocVat(dd.docVat);
      setOpenedKey(typeof dr.openedKey==="string"?dr.openedKey:null);
      setMeta(m=>({...m,number:dr.number.slice(0,100),date:typeof dr.date==="string"&&dr.date?dr.date:m.date,due:dd.due,notes:dd.notes}));
    }
    const le=parseInt(localStorage.getItem(LAST_EXPORT_KEY)||"",10); if(le>0)setLastExport(le);
    setReminder(exportReminderDue({lastExport:localStorage.getItem(LAST_EXPORT_KEY),snoozedAt:localStorage.getItem(BACKUP_SNOOZE_KEY),history:hist}));
  }catch{ setMeta(m=>m.number?m:{...m,number:nextDocNumber([],"quote","fr"),date:localDate(),due:in30()}); } setReady(true); },[]);

  // Page language and direction (Arabic is right-to-left); preload the PDF font for zh / ar.
  const [,setDictTick]=useState(0);
  useEffect(()=>{ try{const h=document.documentElement; h.lang=lang==="fr"?"fr-CA":lang==="en"?"en-CA":lang==="zh"?"zh-CN":"ar"; if(isRtl(lang))h.dir="rtl"; else h.removeAttribute("dir");}catch{} if(lang==="zh"||lang==="ar"){ if(!langLoaded(lang))loadLang(lang).then(()=>setDictTick(n=>n+1)).catch(()=>{}); ensurePdfFont(lang).catch(()=>{}); } },[lang]);
  useEffect(()=>{ if(!ready)return; try{localStorage.setItem(CLIENTS_KEY,JSON.stringify(clients));}catch{setStorageErr(true);} },[clients,ready]);
  useEffect(()=>{ if(!ready)return; try{ if(logo)localStorage.setItem(LOGO_KEY,JSON.stringify(logo)); else localStorage.removeItem(LOGO_KEY);}catch{setStorageErr(true);} },[logo,ready]);

  /* Pro is confirmed with Stripe on the server at every load; localStorage "tq_plan" is ignored. */
  const checkSub=useCallback(async(subId:string)=>{
    let serverPro:boolean|null=null;
    try{
      const r=await fetch("/api/subscription-status",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({subscriptionId:subId})});
      const d=await r.json(); serverPro=typeof d.pro==="boolean"?d.pro:null;
    }catch{serverPro=null;}
    const last=parseInt(localStorage.getItem("tq_pro_confirmed_at")||"",10)||null;
    if(serverPro===true)localStorage.setItem("tq_pro_confirmed_at",String(Date.now()));
    if(serverPro===false){localStorage.removeItem("tq_sub"); localStorage.removeItem("tq_pro_confirmed_at");}
    const pro=resolvePro(serverPro,last);
    setPlan(pro||legacyProActive(localStorage.getItem("tq_legacy_pro"))?"pro":"free");
    if(pro)localStorage.removeItem("tq_legacy_pro");
  },[]);
  useEffect(()=>{try{
    const restore=new URLSearchParams(window.location.search).get("restore"); // restore link sent by email
    if(isValidSubscriptionId(restore)){localStorage.setItem("tq_sub",restore); window.history.replaceState({},"",window.location.pathname);}
    if(migrateLegacyPlan(localStorage.getItem("tq_plan"),localStorage.getItem("tq_sub"))==="legacy")localStorage.setItem("tq_legacy_pro","1");
    localStorage.removeItem("tq_plan");
    const sub=localStorage.getItem("tq_sub");
    if(isValidSubscriptionId(sub))checkSub(sub);
    else if(legacyProActive(localStorage.getItem("tq_legacy_pro"))){setLegacyPro(true); setPlan("pro");}
  }catch{}},[checkSub]);

  useEffect(()=>{try{
    localStorage.setItem("tq_count",String(count)); localStorage.setItem("tq_count_month",monthKey());
    localStorage.setItem("tq_history",JSON.stringify(history)); localStorage.setItem("tq_company",JSON.stringify(storedCompany(company))); localStorage.setItem("tq_lang",lang);
    setStorageErr(false);
  }catch(e){ if(e instanceof DOMException&&/quota/i.test(e.name+e.message))setStorageErr(true); }},[count,history,company,lang]);

  useEffect(()=>{
    if(typeof window==="undefined")return;
    const q=new URLSearchParams(window.location.search);
    if(q.get("success")!=="true")return;
    const sid=q.get("session_id");
    const clear=()=>window.history.replaceState({},"",window.location.pathname);
    if(!sid||!sid.startsWith("cs_")){clear();return;}
    (async()=>{try{
      const r=await fetch("/api/verify-session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:sid})});
      const d=await r.json();
      if(d.valid){ if(isValidSubscriptionId(d.subscription)){localStorage.setItem("tq_sub",d.subscription); localStorage.setItem("tq_pro_confirmed_at",String(Date.now()));} setPlan("pro"); }
    }catch{} finally{clear();}})();
  },[]);

  const money=useCallback((n:number)=>formatMoney(n,region,lang),[lang,region]);
  const totals=useMemo(()=>computeTotals(items,discountPct,taxPreset,customRate,depositPct,lang,{localRate,docVat}),[items,discountPct,taxPreset,customRate,depositPct,lang,localRate,docVat]);
  const qc=isQuebec(region);
  const preset=presetOf(taxPreset);
  const vat=!!preset?.vat;
  const presetIds=(()=>{const ids=taxPresetsFor(region); return ids.includes(taxPreset)?ids:[...ids,taxPreset];})();
  const otherFields=qc?[]:bizFields(region,lang);
  const {subtotal,discountAmount:discAmt,total,depositAmt:depAmt,balance}=totals;
  const taxes={lines:totals.taxLines};
  const limited=plan==="free"&&count>=FREE_LIMIT;
  const existing=meta.number.trim()?history.find(d=>docKey(d)===docKey({type:docType,number:meta.number})):undefined;
  const rbqOk=isValidRbq(company.rbq);

  const add=()=>setItems(p=>[...p,{id:Date.now(),description:"",quantity:1,unitPrice:0}]);
  const rm=(id:number)=>setItems(p=>p.length>1?p.filter(i=>i.id!==id):[blankLine()]);
  const upd=(id:number,f:keyof Item,v:string|number)=>setItems(p=>p.map(i=>i.id===id?{...i,[f]:v}:i));
  const tpl=(id:string,lg:Lang=lang)=>{const x=TEMPLATES.find(t=>t.id===id); if(!x)return; setItems(x.items.map((it,i)=>({id:Date.now()+i,description:it.description[lg],quantity:it.quantity,unitPrice:it.unitPrice}))); flash(i18n[lg].tplLoaded,3500);};
  /** Language switch: explicit (header / setup) or automatic (region change, only when the user never chose). */
  const switchLang=(nl:Lang,explicit:boolean)=>{
    if(explicit){try{localStorage.setItem("tq_lang_choice","1");}catch{}}
    if(nl===lang)return;
    // Automatic switch (region change): a new document's number follows the language (S-/Q-, F-/INV-). Default terms follow too (as before).
    setMeta(m=>({...m,number:!explicit&&m.number===nextDocNumber(history,docType,lang)?nextDocNumber(history,docType,nl):m.number,notes:m.notes===NOTES[lang]?NOTES[nl]:m.notes})); setLang(nl);
  };
  /** Region change: region default taxes, and the region's language unless the user chose one. */
  const changeRegion=(r:Region)=>{
    setRegion(r); try{ if(isQuebec(r)) localStorage.removeItem(REGION_KEY); else localStorage.setItem(REGION_KEY,JSON.stringify(r));}catch{}
    setTaxPreset(defaultTaxPreset(r)); setCustomRate(0); setLocalRate(0); setDocVat(undefined);
    setItems(p=>p.map(({vatRate:_v,...i})=>i));
    let choice=false; try{choice=localStorage.getItem("tq_lang_choice")==="1";}catch{}
    if(!choice)switchLang(defaultLang(r),false);
  };
  const flash=(msg:string,ms=2500)=>{setToast(msg); setTimeout(()=>setToast(null),ms);};
  const labels={description:t.description,qty:t.qty,rate:t.rate,subtotal:t.subtotal,total:t.total,depositAmt:t.depositAmt,balance:t.balance,discount:t.discount};
  const argsFor=(type:DocType,m:{number:string;date:string;notes:string},d:FullDoc):PdfArgs=>({docType:type,lang,plan,meta:{number:m.number,date:m.date,notes:m.notes,due:d.due},logo,company,client:d.client,jobSite:d.jobSite,jobDate:d.jobDate,jobEndDate:d.jobEndDate,items:d.items,subtotal:d.subtotal,discountPct:d.discountPct,discountAmount:d.discountAmount,taxLines:d.taxLines,total:d.total,depositPct:d.depositPct,depositAmt:d.depositAmt,balance:d.balance,labels,region:d.region??DEFAULT_REGION,taxPreset:d.taxPreset,docVat:d.docVat});
  /** Line as stored (vatRate only for VAT presets). */
  const storeItem=({description,quantity,unitPrice,vatRate}:Item)=>vat&&vatRate!==undefined?{description,quantity,unitPrice,vatRate}:{description,quantity,unitPrice};
  // Québec documents are stored exactly as before (no region field = Québec).
  const currentDoc=(ov?:Item[]):FullDoc=>({client:{...client},jobSite,jobDate,jobEndDate,due:meta.due,notes:meta.notes,items:printableItems(ov??items).map(storeItem),taxPreset,customRate,discountPct,depositPct,...totals,...(taxPreset==="us-sales"&&localRate>0?{localRate}:{}),...(vat&&docVat?{docVat}:{}),...(qc?{}:{region})});

  /**
   * Saves the current document in the history (full copy) and returns the PDF arguments, or null when the
   * free limit blocks a NEW document. Re-saving the same number for the same client (or a reopened document)
   * updates the entry and does not count again. If the number is already used by another document, a new
   * number is assigned so nothing in the history is overwritten.
   */
  const saveCurrent=(action:"download"|"share",ov?:Item[]):PdfArgs|null=>{
    let number=meta.number.trim()||nextDocNumber(history,docType,lang);
    const prev=history.find(d=>docKey(d)===docKey({type:docType,number}));
    const sameClient=prev&&prev.clientName.trim().toLowerCase()===(client.name||"Client").trim().toLowerCase();
    let renumbered=false;
    if(prev&&!sameClient&&openedKey!==docKey(prev)){number=nextDocNumber(history,docType,lang); renumbered=true;}
    const isNew=!prev||renumbered;
    if(isNew&&limited){setShowUp(true);return null;}
    const doc=currentDoc(ov);
    const date=meta.date||localDate();
    const status=statusAfterSave(renumbered?undefined:prev,docType,action);
    const r=upsertHistory(history,{id:String(Date.now()),type:docType,number,clientName:client.name||"Client",total:doc.total,date,doc,updatedAt:Date.now(),status},MAX_HISTORY);
    setHistory(r.history);
    setClients(cs=>upsertClient(cs,client));
    if(isNew)setCount(c=>c+1);
    if(number!==meta.number||date!==meta.date)setMeta(m=>({...m,number,date}));
    setOpenedKey(docKey({type:docType,number}));
    if(renumbered)flash(`${t.duplicated} ${number}`,4000);
    return argsFor(docType,{number,date,notes:meta.notes},doc);
  };
  const zeroSig=(z:Item[])=>z.map(i=>`${i.id}:${i.description}`).join("|");
  const zeroNow=zeroLines(items);
  /** Removes the lines with a description and a 0 $ amount; returns the remaining lines. */
  const removeZero=():Item[]=>{
    const z=new Set(zeroLines(items).map(i=>i.id)); if(!z.size)return items;
    const kept=items.filter(i=>!z.has(i.id)); setItems(kept.length?kept:[blankLine()]);
    flash(`${z.size} ${t.zeroRemoved}`); return kept;
  };
  /** Asks about 0 $ lines before a download/share (once per set of lines kept). */
  const guard=(action:"download"|"share")=>{
    const z=zeroLines(items);
    if(z.length&&zeroAck!==zeroSig(z)&&!(limited&&!existing)){setZeroAsk(action);return;}
    if(action==="download")doDownload(); else doShare();
  };
  const zeroChoice=(remove:boolean)=>{
    const a=zeroAsk; setZeroAsk(null); if(!a)return;
    let ov:Item[]|undefined;
    if(remove)ov=removeZero(); else setZeroAck(zeroSig(zeroLines(items)));
    if(a==="download")doDownload(ov); else doShare(ov);
  };
  const download=()=>guard("download");
  const share=()=>guard("share");
  const doDownload=(ov?:Item[])=>{
    const a=saveCurrent("download",ov); if(!a)return;
    generateTradeQuotePDF(a).then(()=>flash(MSG[lang].pdfDone),()=>flash(MSG[lang].pdfErr,4000));
  };
  // Share e-mail and calendar text: French, or English for the other languages.
  const schedInput=(number:string):ScheduleInput=>({lang:baseLang(lang),docType,number,clientName:client.name,clientEmail:client.email,clientAddress:[client.address,client.city].filter(Boolean).join(", "),jobSite,jobDate,jobEndDate,total:money(total).replace(/[\u202f\u00a0]/g," "),companyName:company.name,companyPhone:company.phone,companyEmail:company.email});
  /** Web Share API with the PDF file when supported (phones), else download + mailto with subject/body. */
  const doShare=async(ov?:Item[])=>{
    const a=saveCurrent("share",ov); if(!a)return;
    const si=schedInput(a.meta.number);
    let file:File|null=null;
    try{file=await tradeQuotePdfFile(a);}catch{file=null;}
    const nav=navigator as Navigator&{canShare?:(d:ShareData)=>boolean};
    if(file&&typeof nav.share==="function"&&nav.canShare?.({files:[file]})){
      try{await nav.share({files:[file],title:shareSubject(si),text:shareBody(si)}); return;}
      catch(e){ if(e instanceof DOMException&&e.name==="AbortError")return; }
    }
    try{await generateTradeQuotePDF(a);}catch{flash(MSG[lang].pdfErr,4000);return;}
    const mt=mailtoLink(si);
    setShareHelp({file:pdfFileName(a),mailto:mt});
    window.location.href=mt;
  };
  const calUrl=googleCalendarUrl(schedInput(meta.number));
  const downloadIcs=()=>{
    const ics=buildIcs(schedInput(meta.number)); if(!ics){flash(t.calNeedDate);return;}
    const url=URL.createObjectURL(new Blob([ics],{type:"text/calendar;charset=utf-8"}));
    const el=document.createElement("a"); el.href=url; el.download=icsFileName({number:meta.number,lang:baseLang(lang)});
    document.body.appendChild(el); el.click(); el.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  const loadDoc=(d:Saved,mode:"open"|"duplicate")=>{
    if(!d.doc)return;
    const x=d.doc;
    setDocType(d.type);
    const number=mode==="open"?d.number:nextDocNumber(history,d.type,lang);
    setMeta({number,date:mode==="open"?d.date:localDate(),due:mode==="open"?x.due:d.type==="quote"?in30():"",notes:x.notes});
    setClient({...EMPTY_CLIENT,...x.client}); setJobSite(x.jobSite); setJobDate(mode==="open"?x.jobDate:""); setJobEndDate(mode==="open"?x.jobEndDate:"");
    setItems(x.items.length?x.items.map((it,i)=>({id:Date.now()+i,...it})):[{id:Date.now(),description:"",quantity:1,unitPrice:0}]);
    setTaxPreset(x.taxPreset); setCustomRate(x.customRate); setDiscountPct(x.discountPct); setDepositPct(x.depositPct);
    setLocalRate(x.localRate||0); setDocVat(x.docVat);
    setOpenedKey(mode==="open"?docKey(d):null);
    setView("app"); window.scrollTo({top:0});
    flash(mode==="open"?`${t.opened} : ${d.number}`:`${t.duplicated} ${number}`);
  };
  const reprint=(d:Saved)=>{ if(d.doc)generateTradeQuotePDF(argsFor(d.type,{number:d.number,date:d.date,notes:d.doc.notes},d.doc)).catch(()=>flash(MSG[lang].pdfErr,4000)); };
  const newDoc=()=>{
    setDocType("quote"); setMeta(m=>({...m,number:nextDocNumber(history,"quote",lang),date:localDate(),due:in30()}));
    setClient(EMPTY_CLIENT); setJobSite(""); setJobDate(""); setJobEndDate(""); setItems([{id:Date.now(),description:"",quantity:1,unitPrice:0}]);
    setDiscountPct(0); setDepositPct(0); setOpenedKey(null);
    setMeta(m=>({...m,notes:NOTES[lang]}));
  };
  /** Client name typed or picked from the suggestions: fill the empty fields from the saved client. */
  const onClientName=(name:string)=>{
    const found=findClient(clients,name);
    if(found&&found.name===name){
      setClient(c=>({name,address:c.address||found.address,city:c.city||found.city,email:c.email||found.email,phone:c.phone||found.phone}));
      if(found.address&&!jobSite)setJobSite([found.address,found.city].filter(Boolean).join(", "));
    } else setClient(c=>({...c,name}));
  };
  const startForClient=(c:SavedClient)=>{
    newDoc(); setClient({name:c.name,address:c.address,city:c.city,email:c.email,phone:c.phone});
    setView("app"); window.scrollTo({top:0});
  };
  const finishOnb=({done,template}:{done:boolean;template:string|null})=>{
    try{localStorage.setItem(ONBOARDED_KEY,"1");}catch{}
    setOnb(false);
    if(company.name.trim())setBizOpen(false);
    if(template)tpl(template); else if(done)flash(t.obDone);
  };
  const SL=STATUS_LABELS[lang];
  const shownHistory=history.filter(d=>matchesFilter(d,histFilter));
  const changeStatus=(d:Saved,st:DocStatus)=>{setHistory(h=>setStatus(h,d.id,st,localDate())); flash(t.statusSaved);};
  const changePaidAt=(d:Saved,date:string)=>{ if(/^\d{4}-\d{2}-\d{2}$/.test(date))setHistory(h=>setStatus(h,d.id,"paid",localDate(),date)); };
  const statusCtl=(d:Saved,prefix:"status"|"mstatus")=>{const st=statusOf(d); return(
    <div className="flex flex-col gap-1 items-start">
      <select value={st} onChange={e=>changeStatus(d,e.target.value as DocStatus)} className={`text-xs border rounded-md px-1.5 py-1 font-medium ${STATUS_COLORS[st]}`} aria-label={`${t.status} ${d.number}`} data-testid={`${prefix}-${d.number}`}>
        {statusesFor(d.type).map(x=><option key={x} value={x}>{SL[x]}</option>)}
      </select>
      {st==="paid"&&<label className="text-[10px] text-slate-500">{t.paidOn}<input type="date" value={d.paidAt||""} onChange={e=>changePaidAt(d,e.target.value)} className="block text-xs border rounded px-1 py-0.5" data-testid={`${prefix==="status"?"paid":"mpaid"}-${d.number}`}/></label>}
    </div>);};
  const exportData=()=>{try{setLastExport(downloadBackup(lang)); setReminder(false); flash(t.backupExported);}catch{flash(t.errRead);}};
  const snoozeReminder=()=>{try{localStorage.setItem(BACKUP_SNOOZE_KEY,String(Date.now()));}catch{} setReminder(false);};
  const onImported=(p:ImportPlan,summary:string)=>{
    setHistory(p.history);
    setClients(p.clients); setLogo(p.logo);
    // Importing a backup means this is not a brand-new user: no first-run setup.
    setOnb(false); try{localStorage.setItem(ONBOARDED_KEY,"1");}catch{}
    if((p.company.name||"").trim())setBizOpen(false);
    setCompany({...EMPTY_COMPANY,...p.company});
    setCount(p.count);
    if(p.region&&!sameRegion(p.region,region)){setRegion(p.region); setTaxPreset(defaultTaxPreset(p.region)); setCustomRate(0); setLocalRate(0); setDocVat(undefined);}
    if(p.lang&&p.lang!==lang){const nl=p.lang; setMeta(m=>m.notes===NOTES[lang]?{...m,notes:NOTES[nl]}:m); setLang(nl);}
    if(p.subChanged){const sub=localStorage.getItem("tq_sub"); if(isValidSubscriptionId(sub)){setLegacyPro(false); checkSub(sub);}}
    flash(summary,4000);
  };
  const toInv=()=>{
    const ref=`${t.refQuote} ${meta.number}`;
    setDocType("invoice"); setOpenedKey(null);
    // The quote's default terms ("Soumission valide 30 jours…") don't belong on an invoice.
    setMeta(m=>({...m,number:nextDocNumber(history,"invoice",lang),date:localDate(),due:"",notes:`${m.notes.trim()===NOTES[lang]||!m.notes.trim()?t.invoiceNotes:m.notes}\n${ref}`}));
    flash(`${t.invoice} ${nextDocNumber(history,"invoice",lang)} ✓`);
  };
  const switchType=(ty:DocType)=>{ if(ty===docType)return; setDocType(ty); setOpenedKey(null); setMeta(m=>({...m,number:nextDocNumber(history,ty,lang)})); };
  const upgrade=async(mode:"monthly"|"yearly")=>{
    setLoading(true);
    try{
      const r=await fetch("/api/create-checkout-session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode})});
      const d=await r.json(); if(d.url)window.location.href=d.url; else{alert(d.error||"Error"); setLoading(false);}
    }catch{alert("Network error"); setLoading(false);}
  };
  useEffect(()=>{ if(!ready||!meta.number)return; try{
    localStorage.setItem(DRAFT_KEY,JSON.stringify({type:docType,number:meta.number,date:meta.date,openedKey,doc:{client,jobSite,jobDate,jobEndDate,due:meta.due,notes:meta.notes,items:items.map(storeItem),taxPreset,customRate,discountPct,depositPct,...(taxPreset==="us-sales"&&localRate>0?{localRate}:{}),...(vat&&docVat?{docVat}:{})}}));
  }catch{} },[ready,docType,meta,openedKey,client,jobSite,jobDate,jobEndDate,items,taxPreset,customRate,discountPct,depositPct,localRate,docVat]); // eslint-disable-line react-hooks/exhaustive-deps
  const inp="w-full border rounded-lg px-3 py-2 text-sm";

  return(
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 cursor-pointer" onClick={()=>setView("app")}>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">T</div>
            <div className="hidden sm:block"><div className="font-bold text-sm">{t.brand}</div><div className="text-[10px] text-slate-500">{plan==="pro"?t.pro:t.free}</div></div>
          </div>
          <nav className="hidden md:flex gap-1">
            {VIEWS.map(v=>(
              <button key={v} onClick={()=>setView(v)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${view===v?"bg-slate-100":"text-slate-600 hover:bg-slate-50"}`}>
                {v==="app"?t.create:v==="history"?t.history:v==="clients"?t.clients:t.pricing}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <select value={lang} onChange={e=>switchLang(e.target.value as Lang,true)} className="text-xs border rounded-md px-2 py-1.5" aria-label="Langue / Language / 语言 / اللغة" data-testid="lang">{LANGS.map(l=><option key={l.code} value={l.code}>{l.label}</option>)}</select>
            {plan==="free"?<button onClick={()=>setView("pricing")} className="bg-blue-600 text-white text-sm font-semibold px-3 py-1.5 rounded-lg">{t.upgrade}</button>
              :<span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full font-medium">{t.pro}</span>}
          </div>
        </div>
        <nav className="md:hidden grid grid-cols-4 border-t text-xs" aria-label="Navigation">
          {VIEWS.map(v=>(
            <button key={v} onClick={()=>{setView(v); window.scrollTo({top:0});}} className={`py-2.5 font-medium ${view===v?"text-blue-700 border-b-2 border-blue-600":"text-slate-600"}`} data-testid={`mnav-${v}`}>
              {v==="app"?t.create:v==="history"?t.history:v==="clients"?t.clients:t.pricing}
            </button>
          ))}
        </nav>
      </header>

      {showUp&&(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-xl font-bold mb-2">{t.limitHit}</h3>
            <p className="text-sm text-slate-600 mb-6">{t.limitText}</p>
            <button disabled={loading} onClick={()=>upgrade("monthly")} className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold mb-2 disabled:opacity-60">{t.monthly}</button>
            <button disabled={loading} onClick={()=>upgrade("yearly")} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold mb-2 disabled:opacity-60">{t.yearly}</button>
            <button onClick={()=>setShowUp(false)} className="w-full text-slate-500 text-sm py-2">{t.continueFree}</button>
            <p className="text-[11px] text-slate-400 text-center mb-1">{t.cadNote}</p>
            <CheckoutConsent lang={lang} className="text-center"/>
          </div>
        </div>
      )}

      {legacyPro&&<div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-xs px-4 py-2 text-center">
        {MSG[lang].legacy}
        <a href="mailto:lgxpowerna@gmail.com" className="underline">lgxpowerna@gmail.com</a>
      </div>}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {view==="pricing"&&(
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">{t.pricing}</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white border rounded-2xl p-6">
                <div className="text-sm text-slate-500 font-semibold mb-1">{t.freePlan}</div>
                <div className="text-3xl font-bold mb-4">{t.freePrice}</div>
                <ul className="space-y-2 text-sm mb-6">{t.featureFree.map(f=><li key={f} className="flex gap-2"><span className="text-emerald-500">✓</span>{f}</li>)}</ul>
                <button onClick={()=>setView("app")} className="w-full border py-2.5 rounded-xl font-medium">{t.continueFree}</button>
              </div>
              <div className="bg-blue-600 text-white rounded-2xl p-6 relative">
                <div className="absolute top-3 right-3 bg-amber-400 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full">{t.best}</div>
                <div className="text-sm text-blue-100 font-semibold mb-1">{t.proPlan}</div>
                <div className="text-3xl font-bold mb-1">{t.proPrice}<span className="text-base font-normal text-blue-200">{t.perMo}</span></div>
                <p className="text-blue-100 text-sm mb-4">{t.orYear}</p>
                <ul className="space-y-2 text-sm mb-6">{t.featurePro.map(f=><li key={f} className="flex gap-2"><span className="text-emerald-300">✓</span>{f}</li>)}</ul>
                <button disabled={loading} onClick={()=>upgrade("monthly")} className="w-full bg-white text-blue-700 py-2.5 rounded-xl font-semibold mb-2 disabled:opacity-60">{t.startMo}</button>
                <button disabled={loading} onClick={()=>upgrade("yearly")} className="w-full bg-blue-500/40 border border-white/30 py-2.5 rounded-xl font-medium disabled:opacity-60">{t.startYr}</button>
                <CheckoutConsent lang={lang} dark className="mt-3"/>
              </div>
            </div>
            <p className="text-center text-xs text-slate-500 mt-4" data-testid="cad-note">{t.cadNote}</p>
            <p className="text-center text-xs text-slate-500 mt-2"><a href={PRICING_HREF[lang]} className="text-blue-600 hover:underline">{MSG[lang].plans}</a></p>
          </div>
        )}

        {view==="history"&&(
          <div>
            <h2 className="text-2xl font-bold mb-6">{t.history}</h2>
            <div className="mb-6">
            {history.length===0?(
              <div className="bg-white border rounded-2xl p-12 text-center text-slate-500">
                <p className="mb-3">{t.noDocs}</p>
                <button onClick={()=>setView("app")} className="text-blue-600 font-medium">{t.createFirst}</button>
              </div>
            ):(
              <>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <label htmlFor="hist-filter" className="text-sm text-slate-600">{t.filterLabel}</label>
                <select id="hist-filter" value={histFilter} onChange={e=>setHistFilter(e.target.value as StatusFilter)} className="border rounded-lg px-2 py-1.5 text-sm bg-white" data-testid="status-filter">
                  <option value="all">{t.filterAll} ({history.length})</option>
                  <optgroup label={t.quotesGroup}>{QUOTE_STATUSES.map(x=><option key={x} value={`quote:${x}`}>{SL[x]} ({history.filter(d=>matchesFilter(d,`quote:${x}`)).length})</option>)}</optgroup>
                  <optgroup label={t.invoicesGroup}>{INVOICE_STATUSES.map(x=><option key={x} value={`invoice:${x}`}>{SL[x]} ({history.filter(d=>matchesFilter(d,`invoice:${x}`)).length})</option>)}</optgroup>
                </select>
              </div>
              {/* Phones: one card per document (status and actions without scrolling sideways). */}
              <ul className="sm:hidden space-y-2">
                {shownHistory.length===0&&<li className="bg-white border rounded-xl p-4 text-center text-sm text-slate-500">{t.noMatch}</li>}
                {shownHistory.map(d=>(
                  <li key={d.id} className="bg-white border rounded-xl p-3 text-sm" data-testid="hcard">
                    <div className="flex justify-between gap-2"><span className="font-semibold">{d.number}</span><span className="font-semibold whitespace-nowrap">{money(d.total)}</span></div>
                    <div className="flex justify-between gap-2 text-xs text-slate-500 mb-2"><span className="truncate">{d.type==="quote"?t.quote:t.invoice} · {d.clientName}</span><span>{formatDate(d.date,region)}</span></div>
                    <div className="flex flex-wrap items-end justify-between gap-2">
                      {statusCtl(d,"mstatus")}
                      {d.doc?(
                        <span className="flex gap-1 text-xs">
                          <button onClick={()=>loadDoc(d,"open")} className="border rounded-lg px-2.5 py-1.5 text-blue-700 font-medium">{t.open}</button>
                          <button onClick={()=>loadDoc(d,"duplicate")} className="border rounded-lg px-2.5 py-1.5 text-blue-700">{t.duplicate}</button>
                          <button onClick={()=>reprint(d)} className="border rounded-lg px-2.5 py-1.5 text-blue-700">{t.pdf}</button>
                        </span>
                      ):<span className="text-[11px] text-slate-400">{t.summaryOnly}</span>}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="hidden sm:block bg-white border rounded-2xl overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600"><tr>
                    <th className="hidden sm:table-cell text-left px-4 py-3">{t.typeCol}</th><th className="text-left px-3 sm:px-4 py-3">#</th>
                    <th className="text-left px-3 sm:px-4 py-3">{t.client}</th><th className="hidden sm:table-cell text-left px-4 py-3">{t.date}</th>
                    <th className="hidden sm:table-cell text-left px-4 py-3">{t.status}</th>
                    <th className="text-right px-3 sm:px-4 py-3">{t.total}</th>
                    <th className="text-right px-3 sm:px-4 py-3">{t.actions}</th>
                  </tr></thead>
                  <tbody>{shownHistory.length===0&&<tr><td colSpan={7} className="px-4 py-6 text-center text-slate-500">{t.noMatch}</td></tr>}{shownHistory.map(d=>(
                    <tr key={d.id} className="border-t">
                      <td className="hidden sm:table-cell px-4 py-3">{d.type==="quote"?t.quote:t.invoice}</td><td className="px-3 sm:px-4 py-3 font-medium whitespace-nowrap">{d.number}</td>
                      <td className="px-3 sm:px-4 py-3">{d.clientName}<div className="sm:hidden text-[11px] text-slate-500">{formatDate(d.date,region)}</div></td><td className="hidden sm:table-cell px-4 py-3 text-slate-500">{formatDate(d.date,region)}</td>
                      <td className="hidden sm:table-cell px-4 py-3">{statusCtl(d,"status")}</td>
                      <td className="px-3 sm:px-4 py-3 text-right font-medium whitespace-nowrap">{money(d.total)}</td>
                      <td className="px-3 sm:px-4 py-3 text-right sm:whitespace-nowrap">{d.doc?(
                        <span className="inline-flex flex-col sm:flex-row items-end gap-2 text-xs">
                          <button onClick={()=>loadDoc(d,"open")} className="text-blue-600 font-medium hover:underline">{t.open}</button>
                          <button onClick={()=>loadDoc(d,"duplicate")} className="text-blue-600 hover:underline">{t.duplicate}</button>
                          <button onClick={()=>reprint(d)} className="text-blue-600 hover:underline">{t.pdf}</button>
                        </span>
                      ):<span className="text-[11px] text-slate-400">{t.summaryOnly}</span>}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              </>
            )}
            </div>
            <BackupPanel lang={lang} t={t} lastExport={lastExport} onExport={exportData} onImported={onImported}/>
            <AccountingExport lang={lang} t={t} history={history} pro={plan==="pro"} onUpgrade={()=>setView("pricing")} onDone={msg=>flash(msg)} region={region}/>
          </div>
        )}

        {view==="clients"&&(
          <ClientsPanel t={t} clients={clients}
            onSave={c=>setClients(cs=>cs.map(x=>x.id===c.id?c:x))}
            onDelete={id=>setClients(cs=>cs.filter(x=>x.id!==id))}
            onNewQuote={startForClient}/>
        )}

        {view==="app"&&(
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {plan==="free"&&<div className="lg:col-span-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-900 flex flex-wrap items-center justify-between gap-2">
              <span>{t.hero} <span className="block text-xs text-blue-800/80 mt-0.5" data-testid="also-avail"><strong>{t.madeFor}</strong> {t.alsoAvail}</span></span>
              <a href={PRICING_HREF[lang]} className="text-blue-700 font-semibold hover:underline whitespace-nowrap">{t.seePricing} →</a>
            </div>}
            {storageErr&&<div role="alert" className="lg:col-span-3 bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-sm text-red-800">⚠️ {t.storageFull}</div>}
            {reminder&&<div role="status" className="lg:col-span-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-sm text-amber-900 flex flex-wrap items-center justify-between gap-2">
              <span>💾 {t.backupReminder}</span>
              <span className="flex gap-3 whitespace-nowrap"><button onClick={exportData} className="font-semibold underline">{t.backupNow}</button><button onClick={snoozeReminder} className="text-amber-700">{t.backupLater}</button></span>
            </div>}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={()=>switchType("quote")} className={`px-4 py-2 rounded-lg text-sm font-semibold ${docType==="quote"?"bg-blue-600 text-white":"bg-white border text-slate-600"}`}>{t.quote}</button>
                <button onClick={()=>switchType("invoice")} className={`px-4 py-2 rounded-lg text-sm font-semibold ${docType==="invoice"?"bg-blue-600 text-white":"bg-white border text-slate-600"}`}>{t.invoice}</button>
                <button onClick={newDoc} className="px-3 py-2 rounded-lg text-sm font-medium bg-white border text-slate-600 hover:bg-slate-50" data-testid="new-doc">{t.newDoc}</button>
                {docType==="quote"&&<button onClick={toInv} className="sm:ml-auto text-sm text-blue-600 font-medium hover:underline px-1 py-2" data-testid="convert">{t.convert} →</button>}
                {existing&&<span className="basis-full sm:basis-auto text-[11px] text-amber-800" data-testid="editing">✏️ {t.editing} {existing.number}</span>}
              </div>
              <div className="bg-white border rounded-xl p-4">
                <div className="text-sm font-semibold mb-2">{t.templates}</div>
                <div className="flex flex-wrap gap-2">{TEMPLATES.map(x=>(
                  <button key={x.id} onClick={()=>tpl(x.id)} className="text-xs border hover:border-blue-400 hover:bg-blue-50 rounded-lg px-3 py-1.5">{x.label[lang]}</button>
                ))}</div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-white border rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="font-semibold text-sm">{t.business}</div>
                    {!bizOpen&&<button type="button" onClick={()=>setBizOpen(true)} className="text-xs text-blue-600 hover:underline" data-testid="biz-edit">{t.bizEdit}</button>}
                  </div>
                  {!bizOpen?(
                    <div className="text-sm text-slate-600 flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {logo&&<img src={logo.dataUrl} alt="" className="h-10 max-w-[6rem] object-contain"/>}
                      <div className="min-w-0"><div className="font-medium text-slate-800 truncate">{company.name}</div>
                      <div className="text-xs text-slate-500 truncate">{[company.city,qc?(rbqOk?rbqLine(company.rbq,lang):""):company.licence,company.phone].filter(Boolean).join(" · ")}</div></div>
                    </div>
                  ):(<>
                  <div className="rounded-lg bg-slate-50 border p-2">
                    <div className="text-[11px] font-semibold text-slate-600 mb-1">{t.region}</div>
                    <RegionSelect t={t} lang={lang} region={region} onChange={changeRegion} testPrefix="biz"/>
                  </div>
                  <input placeholder={t.companyName} value={company.name} onChange={e=>setCompany({...company,name:e.target.value})} className={inp}/>
                  <input placeholder={t.address} value={company.address} onChange={e=>setCompany({...company,address:e.target.value})} className={inp}/>
                  <input placeholder={t.city} value={company.city} onChange={e=>setCompany({...company,city:e.target.value})} className={inp}/>
                  <input placeholder={t.email} value={company.email} onChange={e=>setCompany({...company,email:e.target.value})} className={inp}/>
                  <input placeholder={t.phone} value={company.phone} onChange={e=>setCompany({...company,phone:e.target.value})} className={inp}/>
                  {qc?(<>
                  <input placeholder={t.bn} value={company.bn} onChange={e=>setCompany({...company,bn:e.target.value})} className={inp}/>
                  <input placeholder={t.gst} value={company.gst} onChange={e=>setCompany({...company,gst:e.target.value})} className={inp}/>
                  <input placeholder={t.qst} value={company.qst} onChange={e=>setCompany({...company,qst:e.target.value})} className={inp}/>
                  <div>
                    <input placeholder={t.rbq} inputMode="numeric" value={company.rbq} onChange={e=>setCompany({...company,rbq:formatRbq(e.target.value)})} className={`${inp} ${company.rbq&&!rbqOk?"border-red-400":""}`} aria-invalid={!!company.rbq&&!rbqOk}/>
                    <p className={`text-[11px] mt-1 ${company.rbq&&!rbqOk?"text-red-600":"text-slate-400"}`}>{company.rbq&&!rbqOk?t.rbqInvalid:t.rbqHint}</p>
                  </div>
                  <input placeholder={t.interac} value={company.interac} onChange={e=>setCompany({...company,interac:e.target.value})} className={inp}/>
                  </>):otherFields.map(f=>(
                    <div key={f.key}>
                      <input placeholder={f.label} aria-label={f.label} value={company[f.key as BizField]||""} onChange={e=>setCompany({...company,[f.key]:e.target.value.slice(0,300)})} className={inp} data-testid={`biz-${f.key}`}/>
                      {f.hint&&<p className="text-[11px] mt-1 text-slate-400" data-testid={`biz-${f.key}-hint`}>{f.hint}</p>}
                    </div>
                  ))}
                  <LogoPicker t={t} logo={logo} onChange={l=>{setLogo(l); if(l)flash(t.logoSaved);}}/>
                  {company.name.trim()&&<button type="button" onClick={()=>setBizOpen(false)} className="text-xs text-blue-600 hover:underline">✓ {t.save}</button>}
                  </>)}
                  <button type="button" onClick={()=>{setView("history"); window.scrollTo({top:0});}} className="block text-xs text-blue-600 hover:underline pt-1">💾 {t.backupLink} →</button>
                </div>
                <div className="bg-white border rounded-xl p-4 space-y-2">
                  <div className="font-semibold text-sm mb-2">{t.client}</div>
                  <input placeholder={t.clientName} value={client.name} onChange={e=>onClientName(e.target.value)} list="tq-clients" autoComplete="off" className={inp} data-testid="client-name"/>
                  <datalist id="tq-clients">{clients.map(c=><option key={c.id} value={c.name}>{[c.city,c.phone].filter(Boolean).join(" · ")}</option>)}</datalist>
                  {clients.length>0&&!client.name&&<p className="text-[11px] text-slate-400 -mt-1">{t.clientSuggest}</p>}
                  <input placeholder={t.address} value={client.address} onChange={e=>setClient({...client,address:e.target.value})} className={inp} data-testid="client-address"/>
                  <input placeholder={t.city} value={client.city} onChange={e=>setClient({...client,city:e.target.value})} className={inp} data-testid="client-city"/>
                  <input type="email" placeholder={t.email} value={client.email} onChange={e=>setClient({...client,email:e.target.value})} className={inp} data-testid="client-email"/>
                  <input type="tel" placeholder={t.phone} value={client.phone} onChange={e=>setClient({...client,phone:e.target.value})} className={inp} data-testid="client-phone"/>
                  <input placeholder={t.jobSite} value={jobSite} onChange={e=>setJobSite(e.target.value)} className={inp} data-testid="job-site"/>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-[11px] text-slate-500">{t.jobDate}<input type="date" value={jobDate} onChange={e=>setJobDate(e.target.value)} className={inp} data-testid="job-date"/></label>
                    <label className="text-[11px] text-slate-500">{t.jobEndDate}<input type="date" value={jobEndDate} min={jobDate||undefined} onChange={e=>setJobEndDate(e.target.value)} className={inp} data-testid="job-end-date"/></label>
                  </div>
                </div>
              </div>
              <div className="bg-white border rounded-xl p-4">
                <div className="font-semibold text-sm mb-3">{t.details}</div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div><label className="text-xs text-slate-500">{t.docNumber}</label><input value={meta.number} onChange={e=>setMeta({...meta,number:e.target.value})} className={inp} data-testid="doc-number"/></div>
                  <div><label className="text-xs text-slate-500">{t.date}</label><input type="date" value={meta.date} onChange={e=>setMeta({...meta,date:e.target.value})} className={inp}/></div>
                  <div><label className="text-xs text-slate-500">{docType==="quote"?t.validQuote:t.dueInvoice}</label><input type="date" value={meta.due} onChange={e=>setMeta({...meta,due:e.target.value})} className={inp}/></div>
                </div>
              </div>
              <div className="bg-white border rounded-xl p-4">
                <div className="flex justify-between mb-3"><div className="font-semibold text-sm">{t.items}</div>
                  <button onClick={add} className="text-sm text-blue-600 font-medium">{t.addItem}</button></div>
                <div className="hidden sm:flex gap-2 text-[11px] uppercase text-slate-400 font-semibold px-1 mb-1">
                  <span className="flex-1">{t.description}</span>{vat&&<span className="w-24">{t.vatCol}</span>}<span className="w-20">{t.qty}</span><span className="w-28">{t.rate}</span><span className="w-24 text-right">{t.lineTotal}</span><span className="w-4"/>
                </div>
                {zeroNow.length>0&&<div role="status" className="flex flex-wrap items-center justify-between gap-2 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-3 py-2 text-xs mb-3" data-testid="zero-warn">
                  <span>⚠️ {zeroNow.length} {t.zeroWarn}</span>
                  <button type="button" onClick={removeZero} className="font-semibold underline py-1" data-testid="zero-remove">{t.zeroRemove}</button>
                </div>}
                <div className="space-y-3 sm:space-y-2">{items.map(item=>(
                  <div key={item.id} className="grid grid-cols-[4.5rem_1fr_auto_auto] sm:flex gap-2 items-center border-b sm:border-0 pb-3 sm:pb-0" data-testid="line">
                    <input placeholder={t.description} value={item.description} onChange={e=>upd(item.id,"description",e.target.value)} className={`col-span-4 sm:flex-1 ${inp}`} data-testid="line-desc"/>
                    {vat&&preset?.vat&&<label className="col-span-4 sm:contents"><span className="sm:hidden text-[10px] text-slate-400 block">{t.vatCol}</span>
                    <select value={lineVatRate(taxPreset,item.vatRate,docVat)} onChange={e=>upd(item.id,"vatRate",+e.target.value)} className="w-full sm:w-24 border rounded-lg px-2 py-2 text-sm bg-white" aria-label={t.vatCol} data-testid="line-vat">
                      {preset.vat.rates.map(r=><option key={r} value={r}>{formatRate(r,lang)}</option>)}
                    </select></label>}
                    <label className="sm:contents"><span className="sm:hidden text-[10px] text-slate-400 block">{t.qty}</span>
                    <input type="number" inputMode="decimal" min={0} step={0.01} value={item.quantity||""} placeholder="0" onChange={e=>upd(item.id,"quantity",+e.target.value||0)} className="w-full sm:w-20 border rounded-lg px-3 py-2 text-sm" data-testid="line-qty"/></label>
                    <label className="sm:contents"><span className="sm:hidden text-[10px] text-slate-400 block">{t.rate}</span>
                    <input type="number" inputMode="decimal" min={0} step={0.01} value={item.unitPrice||""} placeholder="0,00" onChange={e=>upd(item.id,"unitPrice",+e.target.value||0)} className="w-full sm:w-28 border rounded-lg px-3 py-2 text-sm" data-testid="line-price"/></label>
                    <div className={`self-end sm:self-auto pb-2 sm:pb-0 w-20 sm:w-24 text-right text-sm font-medium ${item.description.trim()&&item.quantity*item.unitPrice===0?"text-amber-600":""}`}>{money(item.quantity*item.unitPrice)}</div>
                    <button type="button" onClick={()=>rm(item.id)} className="self-end sm:self-auto h-9 w-9 sm:h-auto sm:w-5 flex items-center justify-center rounded-lg border sm:border-0 text-slate-500 sm:text-slate-400 hover:text-red-600 hover:border-red-300" aria-label={t.removeLine} title={t.removeLine} data-testid="line-remove">✕</button>
                  </div>
                ))}</div>
                <button onClick={add} className="mt-3 text-sm text-blue-600 font-medium">{t.addItem}</button>
              </div>
              <div className="bg-white border rounded-xl p-4">
                <div className="font-semibold text-sm mb-2">{t.notes}</div>
                <textarea rows={2} data-testid="notes" value={meta.notes} onChange={e=>setMeta({...meta,notes:e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm resize-none"/>
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-white border rounded-xl shadow-sm sticky top-20 overflow-hidden">
                <div className="bg-slate-800 text-white px-4 py-2 text-xs font-medium flex justify-between">
                  {toast?<span role="status" className="hidden lg:inline text-emerald-300" data-testid="toast-inline">{toast}</span>:null}
                  <span className={toast?"lg:hidden":""}>{t.preview}</span><span className={`opacity-70 ${toast?"lg:hidden":""}`}>{meta.number}</span>
                </div>
                <div className="p-4 text-sm space-y-3">
                  <div className="flex justify-between">
                    <div>
                      <div className="font-bold text-blue-600 text-base">{docType==="quote"?MSG[lang].quoteT:MSG[lang].invT}</div>
                      <div className="text-xs text-slate-500">{formatDate(meta.date,region)}</div>
                    </div>
                    <div className="text-right text-xs"><div className="font-semibold">{company.name||MSG[lang].yourBiz}</div><div className="text-slate-500">{company.city}</div>{qc?rbqOk&&<div className="font-semibold text-slate-800">{rbqLine(company.rbq,lang)}</div>:company.licence&&<div className="text-slate-600">{company.licence}</div>}</div>
                  </div>
                  <div><div className="text-[10px] uppercase text-slate-400 font-semibold">{t.client}</div><div className="font-medium">{client.name||"—"}</div></div>
                  <div className="border-t pt-2 space-y-1 text-xs">
                    <div className="flex justify-between"><span>{vat?t.subtotalHT:t.subtotal}</span><span>{money(subtotal)}</span></div>
                    {discountPct>0&&<div className="flex justify-between text-emerald-600"><span>{t.discount} ({discountPct}%)</span><span>-{money(discAmt)}</span></div>}
                    {taxes.lines.map(l=><div key={`${l.code}-${l.rate}`} className="flex justify-between" data-testid="tax-line"><span>{l.label} ({formatRate(l.rate,lang)})</span><span>{money(l.amount)}</span></div>)}
                    <div className="flex justify-between font-bold text-blue-700 text-sm pt-1 border-t" data-testid="preview-total"><span>{vat?t.totalTTC:t.total}</span><span>{money(total)}</span></div>
                    {preset?.mention&&<div className="text-[11px] font-semibold text-slate-700" data-testid="tax-mention" dir="ltr">{preset.mention[lang]??preset.mention.en}</div>}
                    {depositPct>0&&(<>
                      <div className="flex justify-between text-slate-600"><span>{t.depositAmt}</span><span>{money(depAmt)}</span></div>
                      <div className="flex justify-between font-semibold"><span>{t.balance}</span><span>{money(balance)}</span></div>
                    </>)}
                  </div>
                </div>
                <div className="border-t p-4 space-y-3">
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">{t.tax}</label>
                    <select value={taxPreset} onChange={e=>setTaxPreset(e.target.value)} className={inp} data-testid="tax-preset">
                      {presetIds.map(id=>TAX_PRESETS.find(p=>p.id===id)).map(p=>p&&<option key={p.id} value={p.id}>{presetLabelOf(p,lang)}</option>)}
                    </select>
                    {taxPreset==="custom"&&<input type="number" step={0.001} value={customRate} onChange={e=>setCustomRate(+e.target.value||0)} className={`${inp} mt-2`} placeholder="%"/>}
                    {taxPreset==="us-sales"&&<>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <label className="text-[11px] text-slate-500">{t.stateRate}<input type="number" min={0} max={30} step={0.001} value={customRate||""} placeholder="0" onChange={e=>setCustomRate(Math.min(30,Math.max(0,+e.target.value||0)))} className={inp} data-testid="us-rate"/></label>
                        <label className="text-[11px] text-slate-500">{t.localRate}<input type="number" min={0} max={30} step={0.001} value={localRate||""} placeholder="0" onChange={e=>setLocalRate(Math.min(30,Math.max(0,+e.target.value||0)))} className={inp} data-testid="us-local"/></label>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">{t.usTaxHint}</p>
                    </>}
                    {preset?.vat&&<label className="block text-[11px] text-slate-500 mt-2">{t.vatDoc}
                      <select value={docVat??preset.vat.default} onChange={e=>{setDocVat(+e.target.value); setItems(p=>p.map(({vatRate:_v,...i})=>i));}} className={inp} data-testid="vat-doc">
                        {preset.vat.rates.map(r=><option key={r} value={r}>{formatRate(r,lang)}</option>)}
                      </select></label>}
                    {preset?.mention&&<p className="text-[11px] text-slate-500 mt-2" data-testid="franchise-note">{t.franchiseHint} <strong dir="ltr">« {preset.mention[lang]??preset.mention.en} »</strong></p>}
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">{t.discount}</label>
                    <input type="number" min={0} max={100} step={0.1} value={discountPct} onChange={e=>setDiscountPct(+e.target.value||0)} className={inp}/>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">{t.deposit}</label>
                    <div className="flex gap-1 mb-1">{[0,30,50].map(v=>(
                      <button key={v} type="button" onClick={()=>setDepositPct(v)} className={`flex-1 text-xs py-1 rounded border ${depositPct===v?"bg-blue-600 text-white border-blue-600":"bg-white text-slate-600"}`}>{v}%</button>
                    ))}</div>
                    <input type="number" min={0} max={100} value={depositPct} onChange={e=>setDepositPct(+e.target.value||0)} className={inp}/>
                  </div>
                  {plan==="free"&&<div className="text-xs text-center text-slate-500 bg-slate-50 rounded py-1">{count}/{FREE_LIMIT} {t.used}</div>}
                  <button onClick={download} className={`w-full py-3 rounded-xl font-semibold text-white ${limited&&!existing?"bg-amber-500":"bg-blue-600 hover:bg-blue-700"}`} data-testid="download">
                    {limited&&!existing?t.upgrade:t.download}
                  </button>
                  <button onClick={share} className="w-full py-2.5 rounded-xl font-semibold border border-blue-600 text-blue-700 hover:bg-blue-50" data-testid="share">📤 {t.share}</button>
                  <p className="text-[11px] text-center text-slate-400 -mt-1">{t.shareHint}</p>
                  {plan==="free"&&<p className="text-[11px] text-center text-slate-400">{t.watermark}</p>}
                  <div className="border-t pt-3">
                    <div className="text-xs text-slate-500 mb-1">📅 {t.calendar}</div>
                    {isYmd(jobDate)&&calUrl?(
                      <div className="flex gap-2">
                        <a href={calUrl} target="_blank" rel="noopener noreferrer" className="flex-1 text-center text-xs border rounded-lg py-2 hover:bg-slate-50" data-testid="cal-google">{t.calGoogle}</a>
                        <button type="button" onClick={downloadIcs} className="flex-1 text-xs border rounded-lg py-2 hover:bg-slate-50" data-testid="cal-ics">{t.calIcs}</button>
                      </div>
                    ):<p className="text-[11px] text-slate-400">{t.calNeedDate}</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      {view==="app"&&<div className="lg:hidden fixed bottom-0 inset-x-0 z-20 bg-white/95 backdrop-blur border-t px-4 py-2" data-testid="mobile-bar">
        {toast&&<div role="status" className="bg-slate-900 text-white rounded-lg px-3 py-2 text-xs font-medium mb-2" data-testid="toast-bar">{toast}</div>}
        <div className="flex items-center justify-between gap-3">
        <div className="text-sm"><div className="text-[10px] text-slate-500 uppercase">{t.total}</div><div className="font-bold text-blue-700">{money(total)}</div></div>
        <div className="flex gap-2">
          <button onClick={share} className="border border-blue-600 text-blue-700 rounded-lg px-3 py-2 text-sm font-semibold" aria-label={t.share} data-testid="mbar-share">📤</button>
          <button onClick={download} data-testid="mbar-download" className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${limited&&!existing?"bg-amber-500":"bg-blue-600"}`}>{limited&&!existing?t.upgrade:t.download}</button>
        </div>
        </div>
      </div>}
      {/* Other pages: small corner notice that never blocks taps (in the editor it sits in the preview header / bottom bar). */}
      {toast&&view!=="app"&&<div role="status" className="fixed z-50 pointer-events-none bottom-4 inset-x-4 sm:inset-x-auto sm:right-4 sm:max-w-sm bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-fade-in" data-testid="toast">{toast}</div>}
      {zeroAsk&&<div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="zero-title" data-testid="zero-dialog">
        <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 shadow-xl">
          <h3 id="zero-title" className="text-lg font-bold mb-1">⚠️ {zeroNow.length} {t.zeroWarn}</h3>
          <p className="text-sm text-slate-600 mb-2">{t.zeroText}</p>
          <ul className="text-sm text-slate-700 list-disc pl-5 mb-4 max-h-40 overflow-y-auto">{zeroNow.map(i=><li key={i.id}>{i.description}</li>)}</ul>
          <button type="button" onClick={()=>zeroChoice(true)} className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold mb-2" data-testid="zero-remove-go">{t.zeroRemoveGo}</button>
          <button type="button" onClick={()=>zeroChoice(false)} className="w-full border py-2.5 rounded-xl font-medium mb-1" data-testid="zero-keep">{t.zeroKeep}</button>
          <button type="button" onClick={()=>setZeroAsk(null)} className="w-full text-slate-500 text-sm py-2">{t.cancel}</button>
        </div>
      </div>}
      {shareHelp&&<div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="share-help-title" data-testid="share-help">
        <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 shadow-xl">
          <h3 id="share-help-title" className="text-lg font-bold mb-3">📎 {t.shareTitle}</h3>
          <ol className="list-decimal pl-5 space-y-2 text-sm text-slate-700 mb-4">
            <li>{t.shareStep1}<strong className="block [overflow-wrap:anywhere]">{shareHelp.file}</strong></li>
            <li>{t.shareStep2}</li>
            <li className="font-semibold text-slate-900">{t.shareStep3}</li>
          </ol>
          <a href={shareHelp.mailto} className="block w-full text-center border border-blue-600 text-blue-700 py-2.5 rounded-xl font-semibold mb-2">✉️ {t.shareOpenMail}</a>
          <button type="button" onClick={()=>setShareHelp(null)} className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold" data-testid="share-help-ok">{t.shareOk}</button>
        </div>
      </div>}
      {onb&&view==="app"&&<Onboarding t={t} lang={lang} region={region} onRegion={changeRegion} onLang={l=>switchLang(l,true)} biz={company} onBiz={b=>setCompany(c=>({...c,...b}))} logo={logo} onLogo={l=>setLogo(l)} onClose={finishOnb}/>}
      <footer className={`border-t mt-12 py-8 text-center text-sm text-slate-500 ${view==="app"?"pb-24 lg:pb-8":toast?"pb-24":""}`}>
        <p className="font-medium text-slate-700">{t.brand}</p>
        <p>{t.footer}</p>
        <p className="text-xs mt-1">{t.madeFor} {t.alsoAvail}</p>
        <LegalFooterLinks lang={lang} className="mt-2"/>
        {plan==="pro"&&<div className="mt-2"><ManageSubscription lang={lang} compact/></div>}
        <p className="text-xs mt-2 text-slate-400">© {new Date().getFullYear()} {t.brand} – Mont-Laurier (QC) – {t.rights}</p>
      </footer>
    </div>
  );
}

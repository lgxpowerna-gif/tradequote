"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { TAX_PRESETS, TEMPLATES, i18n, type Lang } from "@/lib/i18n";
import { generateTradeQuotePDF } from "@/lib/pdf";

type Plan="free"|"pro"; type DocType="quote"|"invoice"; type View="app"|"pricing"|"history";
type Item={id:number;description:string;quantity:number;unitPrice:number};
type Saved={id:string;type:DocType;number:string;clientName:string;total:number;date:string};

export default function Home(){
  const [view,setView]=useState<View>("app");
  const [lang,setLang]=useState<Lang>("en");
  const [plan,setPlan]=useState<Plan>("free");
  const [docType,setDocType]=useState<DocType>("quote");
  const [count,setCount]=useState(0);
  const [history,setHistory]=useState<Saved[]>([]);
  const [showUp,setShowUp]=useState(false);
  const [loading,setLoading]=useState(false);
  const [taxPreset,setTaxPreset]=useState("hst13");
  const [customRate,setCustomRate]=useState(0);
  const [depositPct,setDepositPct]=useState(0);
  const [discountPct,setDiscountPct]=useState(0);
  const [toast,setToast]=useState<string|null>(null);
  const [jobSite,setJobSite]=useState("");
  const t=i18n[lang];
  const [company,setCompany]=useState({name:"",address:"",city:"",email:"",phone:"",bn:"",gst:"",interac:""});
  const [client,setClient]=useState({name:"",address:"",city:"",email:""});
  const [meta,setMeta]=useState({number:`Q-${new Date().getFullYear()}-${Math.floor(Math.random()*9000)+1000}`,date:new Date().toISOString().slice(0,10),due:"",notes:"Payment due within 30 days. Thank you."});
  const [items,setItems]=useState<Item[]>([{id:1,description:"",quantity:1,unitPrice:0}]);

  useEffect(()=>{try{
    const p=localStorage.getItem("tq_plan") as Plan|null;
    const c=localStorage.getItem("tq_count");
    const h=localStorage.getItem("tq_history");
    const co=localStorage.getItem("tq_company");
    const l=localStorage.getItem("tq_lang") as Lang|null;
    if(p)setPlan(p); if(c)setCount(+c||0); if(h)setHistory(JSON.parse(h)); if(co)setCompany(JSON.parse(co)); if(l==="en"||l==="fr")setLang(l);
  }catch{}},[]);

  useEffect(()=>{try{
    localStorage.setItem("tq_plan",plan); localStorage.setItem("tq_count",String(count));
    localStorage.setItem("tq_history",JSON.stringify(history)); localStorage.setItem("tq_company",JSON.stringify(company)); localStorage.setItem("tq_lang",lang);
  }catch{}},[plan,count,history,company,lang]);

  useEffect(()=>{
    if(typeof window==="undefined")return;
    const q=new URLSearchParams(window.location.search);
    if(q.get("success")!=="true")return;
    const sid=q.get("session_id");
    const go=()=>{setPlan("pro"); window.history.replaceState({},"",window.location.pathname);};
    if(!sid){go();return;}
    (async()=>{try{
      const r=await fetch("/api/verify-session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:sid})});
      const d=await r.json(); if(d.valid)go(); else window.history.replaceState({},"",window.location.pathname);
    }catch{window.history.replaceState({},"",window.location.pathname);}})();
  },[]);

  const tax=useMemo(()=>{
    if(taxPreset==="custom")return{rate:customRate,name:"Tax"};
    const p=TAX_PRESETS.find(x=>x.id===taxPreset); return{rate:p?.rate??0,name:p?.name??"Tax"};
  },[taxPreset,customRate]);
  const money=useCallback((n:number)=>new Intl.NumberFormat("en-CA",{style:"currency",currency:"CAD"}).format(n),[]);
  const subtotal=useMemo(()=>items.reduce((s,i)=>s+i.quantity*i.unitPrice,0),[items]);
  const discAmt=subtotal*(discountPct/100);
  const taxable=Math.max(0,subtotal-discAmt);
  const taxAmt=taxable*(tax.rate/100);
  const total=taxable+taxAmt;
  const depAmt=total*(depositPct/100);
  const balance=total-depAmt;
  const limited=plan==="free"&&count>=5;

  const add=()=>setItems(p=>[...p,{id:Date.now(),description:"",quantity:1,unitPrice:0}]);
  const rm=(id:number)=>setItems(p=>p.length>1?p.filter(i=>i.id!==id):p);
  const upd=(id:number,f:keyof Item,v:string|number)=>setItems(p=>p.map(i=>i.id===id?{...i,[f]:v}:i));
  const tpl=(id:string)=>{const x=TEMPLATES.find(t=>t.id===id); if(!x)return; setItems(x.items.map((it,i)=>({id:Date.now()+i,description:it.description,quantity:it.quantity,unitPrice:it.unitPrice})));};

  const download=()=>{
    if(limited){setShowUp(true);return;}
    generateTradeQuotePDF({docType,lang,plan,meta,company,client,jobSite,items,subtotal,discountPct,discountAmount:discAmt,tax,taxAmt,total,depositPct,depositAmt:depAmt,balance,labels:{description:t.description,qty:t.qty,rate:t.rate,subtotal:t.subtotal,total:t.total,depositAmt:t.depositAmt,balance:t.balance,discount:t.discount}});
    setToast(lang==="fr"?"PDF téléchargé ✓":"PDF downloaded ✓"); setTimeout(()=>setToast(null),2500);
    setCount(c=>c+1);
    setHistory(h=>[{id:String(Date.now()),type:docType,number:meta.number,clientName:client.name||"Client",total,date:meta.date},...h].slice(0,50));
    setMeta(m=>({...m,number:`${docType==="quote"?"Q":"INV"}-${new Date().getFullYear()}-${Math.floor(Math.random()*9000)+1000}`}));
  };
  const toInv=()=>{setDocType("invoice"); setMeta(m=>({...m,number:`INV-${new Date().getFullYear()}-${Math.floor(Math.random()*9000)+1000}`}));};
  const upgrade=async(mode:"monthly"|"yearly")=>{
    setLoading(true);
    try{
      const r=await fetch("/api/create-checkout-session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode})});
      const d=await r.json(); if(d.url)window.location.href=d.url; else{alert(d.error||"Error"); setLoading(false);}
    }catch{alert("Network error"); setLoading(false);}
  };
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
            {(["app","history","pricing"] as View[]).map(v=>(
              <button key={v} onClick={()=>setView(v)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${view===v?"bg-slate-100":"text-slate-600 hover:bg-slate-50"}`}>
                {v==="app"?t.create:v==="history"?t.history:t.pricing}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <select value={lang} onChange={e=>setLang(e.target.value as Lang)} className="text-xs border rounded-md px-2 py-1.5"><option value="en">EN</option><option value="fr">FR</option></select>
            {plan==="free"?<button onClick={()=>setView("pricing")} className="bg-blue-600 text-white text-sm font-semibold px-3 py-1.5 rounded-lg">{t.upgrade}</button>
              :<span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full font-medium">{t.pro}</span>}
          </div>
        </div>
      </header>

      {showUp&&(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-xl font-bold mb-2">{t.limitHit}</h3>
            <p className="text-sm text-slate-600 mb-6">{t.limitText}</p>
            <button disabled={loading} onClick={()=>upgrade("monthly")} className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold mb-2 disabled:opacity-60">{t.monthly}</button>
            <button disabled={loading} onClick={()=>upgrade("yearly")} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold mb-2 disabled:opacity-60">{t.yearly}</button>
            <button onClick={()=>setShowUp(false)} className="w-full text-slate-500 text-sm py-2">{t.continueFree}</button>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-6">
        {view==="pricing"&&(
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">{t.pricing}</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white border rounded-2xl p-6">
                <div className="text-sm text-slate-500 font-semibold mb-1">{t.freePlan}</div>
                <div className="text-3xl font-bold mb-4">$0</div>
                <ul className="space-y-2 text-sm mb-6">{t.featureFree.map(f=><li key={f} className="flex gap-2"><span className="text-emerald-500">✓</span>{f}</li>)}</ul>
                <button onClick={()=>setView("app")} className="w-full border py-2.5 rounded-xl font-medium">{t.continueFree}</button>
              </div>
              <div className="bg-blue-600 text-white rounded-2xl p-6 relative">
                <div className="absolute top-3 right-3 bg-amber-400 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full">BEST</div>
                <div className="text-sm text-blue-100 font-semibold mb-1">{t.proPlan}</div>
                <div className="text-3xl font-bold mb-1">$9<span className="text-base font-normal text-blue-200">{t.perMo}</span></div>
                <p className="text-blue-100 text-sm mb-4">or $79/year</p>
                <ul className="space-y-2 text-sm mb-6">{t.featurePro.map(f=><li key={f} className="flex gap-2"><span className="text-emerald-300">✓</span>{f}</li>)}</ul>
                <button disabled={loading} onClick={()=>upgrade("monthly")} className="w-full bg-white text-blue-700 py-2.5 rounded-xl font-semibold mb-2 disabled:opacity-60">{t.startMo}</button>
                <button disabled={loading} onClick={()=>upgrade("yearly")} className="w-full bg-blue-500/40 border border-white/30 py-2.5 rounded-xl font-medium disabled:opacity-60">{t.startYr}</button>
              </div>
            </div>
          </div>
        )}

        {view==="history"&&(
          <div>
            <h2 className="text-2xl font-bold mb-6">{t.history}</h2>
            {history.length===0?(
              <div className="bg-white border rounded-2xl p-12 text-center text-slate-500">
                <p className="mb-3">{t.noDocs}</p>
                <button onClick={()=>setView("app")} className="text-blue-600 font-medium">{t.createFirst}</button>
              </div>
            ):(
              <div className="bg-white border rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600"><tr>
                    <th className="text-left px-4 py-3">Type</th><th className="text-left px-4 py-3">#</th>
                    <th className="text-left px-4 py-3">{t.client}</th><th className="text-left px-4 py-3">{t.date}</th>
                    <th className="text-right px-4 py-3">{t.total}</th>
                  </tr></thead>
                  <tbody>{history.map(d=>(
                    <tr key={d.id} className="border-t">
                      <td className="px-4 py-3 capitalize">{d.type}</td><td className="px-4 py-3 font-medium">{d.number}</td>
                      <td className="px-4 py-3">{d.clientName}</td><td className="px-4 py-3 text-slate-500">{d.date}</td>
                      <td className="px-4 py-3 text-right font-medium">{money(d.total)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {view==="app"&&(
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex gap-2">
                <button onClick={()=>setDocType("quote")} className={`px-4 py-2 rounded-lg text-sm font-semibold ${docType==="quote"?"bg-blue-600 text-white":"bg-white border text-slate-600"}`}>{t.quote}</button>
                <button onClick={()=>setDocType("invoice")} className={`px-4 py-2 rounded-lg text-sm font-semibold ${docType==="invoice"?"bg-blue-600 text-white":"bg-white border text-slate-600"}`}>{t.invoice}</button>
                {docType==="quote"&&<button onClick={toInv} className="ml-auto text-sm text-blue-600 font-medium hover:underline">{t.convert} →</button>}
              </div>
              <div className="bg-white border rounded-xl p-4">
                <div className="text-sm font-semibold mb-2">{t.templates}</div>
                <div className="flex flex-wrap gap-2">{TEMPLATES.map(x=>(
                  <button key={x.id} onClick={()=>tpl(x.id)} className="text-xs border hover:border-blue-400 hover:bg-blue-50 rounded-lg px-3 py-1.5">{x.label[lang]}</button>
                ))}</div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-white border rounded-xl p-4 space-y-2">
                  <div className="font-semibold text-sm mb-2">{t.business}</div>
                  <input placeholder={t.companyName} value={company.name} onChange={e=>setCompany({...company,name:e.target.value})} className={inp}/>
                  <input placeholder={t.address} value={company.address} onChange={e=>setCompany({...company,address:e.target.value})} className={inp}/>
                  <input placeholder={t.city} value={company.city} onChange={e=>setCompany({...company,city:e.target.value})} className={inp}/>
                  <input placeholder={t.email} value={company.email} onChange={e=>setCompany({...company,email:e.target.value})} className={inp}/>
                  <input placeholder={t.phone} value={company.phone} onChange={e=>setCompany({...company,phone:e.target.value})} className={inp}/>
                  <input placeholder={t.bn} value={company.bn} onChange={e=>setCompany({...company,bn:e.target.value})} className={inp}/>
                  <input placeholder={t.gst} value={company.gst} onChange={e=>setCompany({...company,gst:e.target.value})} className={inp}/>
                  <input placeholder={t.interac} value={company.interac} onChange={e=>setCompany({...company,interac:e.target.value})} className={inp}/>
                </div>
                <div className="bg-white border rounded-xl p-4 space-y-2">
                  <div className="font-semibold text-sm mb-2">{t.client}</div>
                  <input placeholder={t.clientName} value={client.name} onChange={e=>setClient({...client,name:e.target.value})} className={inp}/>
                  <input placeholder={t.address} value={client.address} onChange={e=>setClient({...client,address:e.target.value})} className={inp}/>
                  <input placeholder={t.city} value={client.city} onChange={e=>setClient({...client,city:e.target.value})} className={inp}/>
                  <input placeholder={t.email} value={client.email} onChange={e=>setClient({...client,email:e.target.value})} className={inp}/>
                  <input placeholder={t.jobSite} value={jobSite} onChange={e=>setJobSite(e.target.value)} className={inp}/>
                </div>
              </div>
              <div className="bg-white border rounded-xl p-4">
                <div className="font-semibold text-sm mb-3">{t.details}</div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div><label className="text-xs text-slate-500">{t.docNumber}</label><input value={meta.number} onChange={e=>setMeta({...meta,number:e.target.value})} className={inp}/></div>
                  <div><label className="text-xs text-slate-500">{t.date}</label><input type="date" value={meta.date} onChange={e=>setMeta({...meta,date:e.target.value})} className={inp}/></div>
                  <div><label className="text-xs text-slate-500">{t.validUntil}</label><input type="date" value={meta.due} onChange={e=>setMeta({...meta,due:e.target.value})} className={inp}/></div>
                </div>
              </div>
              <div className="bg-white border rounded-xl p-4">
                <div className="flex justify-between mb-3"><div className="font-semibold text-sm">{t.items}</div>
                  <button onClick={add} className="text-sm text-blue-600 font-medium">{t.addItem}</button></div>
                <div className="space-y-2">{items.map(item=>(
                  <div key={item.id} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                    <input placeholder={t.description} value={item.description} onChange={e=>upd(item.id,"description",e.target.value)} className={`flex-1 ${inp}`}/>
                    <input type="number" min={0} step={0.01} value={item.quantity} onChange={e=>upd(item.id,"quantity",+e.target.value||0)} className="w-20 border rounded-lg px-3 py-2 text-sm"/>
                    <input type="number" min={0} step={0.01} value={item.unitPrice} onChange={e=>upd(item.id,"unitPrice",+e.target.value||0)} className="w-28 border rounded-lg px-3 py-2 text-sm"/>
                    <div className="w-24 text-right text-sm font-medium">{money(item.quantity*item.unitPrice)}</div>
                    <button onClick={()=>rm(item.id)} className="text-slate-400 hover:text-red-500">✕</button>
                  </div>
                ))}</div>
              </div>
              <div className="bg-white border rounded-xl p-4">
                <div className="font-semibold text-sm mb-2">{t.notes}</div>
                <textarea rows={2} value={meta.notes} onChange={e=>setMeta({...meta,notes:e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm resize-none"/>
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-white border rounded-xl shadow-sm sticky top-20 overflow-hidden">
                <div className="bg-slate-800 text-white px-4 py-2 text-xs font-medium flex justify-between">
                  <span>{t.preview}</span><span className="opacity-70">{meta.number}</span>
                </div>
                <div className="p-4 text-sm space-y-3">
                  <div className="flex justify-between">
                    <div>
                      <div className="font-bold text-blue-600 text-base">{docType==="quote"?(lang==="fr"?"DEVIS":"QUOTE"):(lang==="fr"?"FACTURE":"INVOICE")}</div>
                      <div className="text-xs text-slate-500">{meta.date}</div>
                    </div>
                    <div className="text-right text-xs"><div className="font-semibold">{company.name||"Business"}</div><div className="text-slate-500">{company.city}</div></div>
                  </div>
                  <div><div className="text-[10px] uppercase text-slate-400 font-semibold">{t.client}</div><div className="font-medium">{client.name||"—"}</div></div>
                  <div className="border-t pt-2 space-y-1 text-xs">
                    <div className="flex justify-between"><span>{t.subtotal}</span><span>{money(subtotal)}</span></div>
                    {discountPct>0&&<div className="flex justify-between text-emerald-600"><span>{t.discount} ({discountPct}%)</span><span>-{money(discAmt)}</span></div>}
                    {tax.rate>0&&<div className="flex justify-between"><span>{tax.name} ({tax.rate}%)</span><span>{money(taxAmt)}</span></div>}
                    <div className="flex justify-between font-bold text-blue-700 text-sm pt-1 border-t"><span>{t.total}</span><span>{money(total)}</span></div>
                    {depositPct>0&&(<>
                      <div className="flex justify-between text-slate-600"><span>{t.depositAmt}</span><span>{money(depAmt)}</span></div>
                      <div className="flex justify-between font-semibold"><span>{t.balance}</span><span>{money(balance)}</span></div>
                    </>)}
                  </div>
                </div>
                <div className="border-t p-4 space-y-3">
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">{t.tax}</label>
                    <select value={taxPreset} onChange={e=>setTaxPreset(e.target.value)} className={inp}>
                      {TAX_PRESETS.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}
                    </select>
                    {taxPreset==="custom"&&<input type="number" step={0.001} value={customRate} onChange={e=>setCustomRate(+e.target.value||0)} className={`${inp} mt-2`} placeholder="%"/>}
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
                  {plan==="free"&&<div className="text-xs text-center text-slate-500 bg-slate-50 rounded py-1">{count}/5 {t.used}</div>}
                  <button onClick={download} className={`w-full py-3 rounded-xl font-semibold text-white ${limited?"bg-amber-500":"bg-blue-600 hover:bg-blue-700"}`}>
                    {limited?t.upgrade:t.download}
                  </button>
                  {plan==="free"&&<p className="text-[11px] text-center text-slate-400">{t.watermark}</p>}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      {toast&&<div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium animate-fade-in">{toast}</div>}
      <footer className="border-t mt-12 py-8 text-center text-sm text-slate-500">
        <p className="font-medium text-slate-700">{t.brand}</p>
        <p>{t.footer}</p>
        <p className="text-xs mt-2 text-slate-400">© {new Date().getFullYear()} {t.brand} – {t.rights}</p>
      </footer>
    </div>
  );
}

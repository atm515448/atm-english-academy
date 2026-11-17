(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const raw = (typeof dictionaryData !== "undefined" && Array.isArray(dictionaryData)) ? dictionaryData :
              (typeof DICTIONARY_DATA !== "undefined" && Array.isArray(DICTIONARY_DATA)) ? DICTIONARY_DATA :
              (typeof dictionary !== "undefined" && Array.isArray(dictionary)) ? dictionary :
              Array.isArray(window.dictionaryData) ? window.dictionaryData :
              Array.isArray(window.DICTIONARY_DATA) ? window.DICTIONARY_DATA :
              Array.isArray(window.dictionary) ? window.dictionary : [];
  const words = raw.map((w,i)=>({
    id:String(w.id ?? i), en:String(w.en ?? w.english ?? "").trim(),
    ha:String(w.ha ?? w.hausa ?? "").trim(), type:w.type ?? w.pos ?? "",
    definition:w.definition ?? w.meaning ?? "",
    exampleEn:w.exampleEn ?? w.example_en ?? "", exampleHa:w.exampleHa ?? w.example_ha ?? "",
    synonyms:w.synonyms ?? [], antonyms:w.antonyms ?? [], level:w.level ?? ""
  })).filter(w=>w.en || w.ha);
  const get=(k,d)=>{try{return JSON.parse(localStorage.getItem("atmDict_"+k)) ?? d}catch{return d}};
  const set=(k,v)=>localStorage.setItem("atmDict_"+k,JSON.stringify(v));
  let favorites=get("favorites",[]), history=get("history",[]), settings=get("settings",{theme:"system",fontSize:"medium",voiceLang:"en",autoSpeak:false});
  let direction="en-ha", activePage="search";
  function applySettings(){
    const dark=settings.theme==="dark" || (settings.theme==="system" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.body.dataset.theme=dark?"dark":"light"; document.body.dataset.font=settings.fontSize||"medium";
    $("theme").value=settings.theme; $("fontSize").value=settings.fontSize; $("voiceLang").value=settings.voiceLang;
    $("autoSpeak").checked=!!settings.autoSpeak; $("themeQuick").textContent=dark?"☀":"☾";
  }
  function saveSettings(){settings={theme:$("theme").value,fontSize:$("fontSize").value,voiceLang:$("voiceLang").value,autoSpeak:$("autoSpeak").checked};set("settings",settings);applySettings()}
  function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
  function arr(v){return Array.isArray(v)?v:(v?String(v).split(/[,;]/).map(x=>x.trim()).filter(Boolean):[])}
  function card(w){
    const saved=favorites.includes(w.id), main=direction==="en-ha"?w.en:w.ha, trans=direction==="en-ha"?w.ha:w.en;
    return `<article class="word-card"><div class="word-head"><div><div class="meta">${escapeHtml(w.type||"Word")} ${w.level?"· "+escapeHtml(w.level):""}</div><h2>${escapeHtml(main||"—")}</h2><div class="translation">${escapeHtml(trans||"Translation not available")}</div></div></div>
      ${w.definition?`<p class="definition">${escapeHtml(w.definition)}</p>`:""}
      ${w.exampleEn||w.exampleHa?`<div class="example"><b>Example</b>${escapeHtml(w.exampleEn)}${w.exampleHa?"<br>"+escapeHtml(w.exampleHa):""}</div>`:""}
      ${arr(w.synonyms).length?`<div class="tags"><b>Synonyms:</b> ${escapeHtml(arr(w.synonyms).join(", "))}</div>`:""}
      ${arr(w.antonyms).length?`<div class="tags"><b>Antonyms:</b> ${escapeHtml(arr(w.antonyms).join(", "))}</div>`:""}
      <div class="card-actions"><button class="${saved?"saved":""}" data-fav="${escapeHtml(w.id)}">${saved?"♥ Saved":"♡ Save"}</button><button data-speak="${escapeHtml(main)}">🔊 Pronounce</button></div></article>`;
  }
  function empty(msg){return `<div class="empty">${escapeHtml(msg)}</div>`}
  function addHistory(q){history=[q,...history.filter(x=>x.toLowerCase()!==q.toLowerCase())].slice(0,100);set("history",history)}
  function search(){
    const q=$("searchInput").value.trim().toLowerCase(); $("countLabel").textContent=`${words.length.toLocaleString()} entries loaded · offline`;
    if(!q){$("results").innerHTML=empty("Search for an English or Hausa word to begin.");return}
    const found=words.filter(w=>((direction==="en-ha"?w.en:w.ha)||"").toLowerCase().includes(q) || ((direction==="en-ha"?w.ha:w.en)||"").toLowerCase().includes(q)).slice(0,80);
    $("results").innerHTML=found.length?found.map(card).join(""):empty("No matching word in the installed dictionary yet.");
  }
  function renderSaved(){
    const list=activePage==="favorites"?words.filter(w=>favorites.includes(w.id)):
      history.map(q=>words.find(w=>(w.en+" "+w.ha).toLowerCase().includes(q.toLowerCase()))).filter(Boolean);
    const target=activePage==="favorites"?"favoriteList":"historyList";
    $(target).innerHTML=list.length?list.map(card).join(""):empty(activePage==="favorites"?"You have not saved any words yet.":"No search history yet.");
  }
  function showPage(page){
    activePage=page;document.querySelectorAll(".page").forEach(p=>p.classList.toggle("hidden",p.id!=="page-"+page));
    document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
    if(page!=="search")renderSaved();
  }
  document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>showPage(b.dataset.page)));
  $("searchInput").addEventListener("input",search);
  $("searchInput").addEventListener("change",()=>{if($("searchInput").value.trim())addHistory($("searchInput").value.trim())});
  $("direction").addEventListener("change",e=>{direction=e.target.value;search()});
  $("clearSearch").onclick=()=>{$("searchInput").value="";search();$("searchInput").focus()};
  $("themeQuick").onclick=()=>{$("theme").value=document.body.dataset.theme==="dark"?"light":"dark";saveSettings()};
  ["theme","fontSize","voiceLang","autoSpeak"].forEach(id=>$(id).addEventListener("change",saveSettings));
  $("resetSettings").onclick=()=>{settings={theme:"system",fontSize:"medium",voiceLang:"en",autoSpeak:false};set("settings",settings);applySettings()};
  $("clearHistory").onclick=()=>{history=[];set("history",history);renderSaved()};
  document.addEventListener("click",e=>{
    const fav=e.target.closest("[data-fav]"); if(fav){const id=fav.dataset.fav;favorites=favorites.includes(id)?favorites.filter(x=>x!==id):[...favorites,id];set("favorites",favorites);if(activePage==="search")search();else renderSaved();return}
    const speak=e.target.closest("[data-speak]");if(speak){if(!("speechSynthesis" in window)){alert("Speech is not supported by this browser.");return}const u=new SpeechSynthesisUtterance(speak.dataset.speak);u.lang=settings.voiceLang==="ha"?"ha-NG":"en-US";speechSynthesis.cancel();speechSynthesis.speak(u)}
  });
  if("serviceWorker" in navigator && location.protocol.startsWith("http"))window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
  applySettings();search();
})();
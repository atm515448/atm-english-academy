(()=> {
const data=window.ATM_DICTIONARY||[];
const $=id=>document.getElementById(id);
let direction="en-ha", query="", showSaved=false;
const load=(k,def)=>{try{return JSON.parse(localStorage.getItem(k))??def}catch{return def}};
let favourites=load("atmDictFavourites",[]),history=load("atmDictHistory",[]);
const save=()=>{localStorage.setItem("atmDictFavourites",JSON.stringify(favourites));localStorage.setItem("atmDictHistory",JSON.stringify(history))};
const norm=s=>String(s||"").toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim();
const isFav=e=>favourites.includes(e.en+"|"+e.ha);
function render(){
 const q=norm(query), level=$("level").value;
 let list=data.filter(e=>(level==="all"||e.level===level)&&(!q||[e.en,e.ha,e.definition,e.exampleEn,e.exampleHa].some(v=>norm(v).includes(q))));
 if(showSaved) list=list.filter(isFav);
 $("count").textContent=list.length+" entries";
 $("results").innerHTML=list.length?list.map(e=>{
 const source=direction==="en-ha"?e.en:e.ha, target=direction==="en-ha"?e.ha:e.en;
 const key=e.en+"|"+e.ha, fav=isFav(e);
 return `<article class="entry"><div class="entrytop"><div><div class="word">${esc(source)}</div><div class="meaning">${esc(target)}</div></div><span class="meta">${esc(e.level)}</span></div><div class="meta">${esc(e.type)} · ${esc(e.en)}</div><div class="definition">${esc(e.definition)}</div><div class="example"><b>Example:</b> ${esc(e.exampleEn)}<br><em>${esc(e.exampleHa)}</em></div><div class="actions"><button class="smallbtn ${fav?'saved':''}" data-fav="${attr(key)}">${fav?'★ Saved':'☆ Save word'}</button><button class="smallbtn" data-speak="${attr(source)}">🔊 Pronounce</button></div></article>`;
 }).join(""):`<div class="empty">${showSaved?"You have not saved any matching words.":"No matching word found. Try another spelling or switch language."}</div>`;
 $("saved").innerHTML=favourites.length?favourites.map(k=>{const e=data.find(x=>x.en+"|"+x.ha===k);return e?`<button class="chip" data-word="${attr(direction==="en-ha"?e.en:e.ha)}">${esc(e.en)} — ${esc(e.ha)}</button>`:""}).join(""):`<p class="muted">Your favourite words will appear here.</p>`;
 $("history").innerHTML=history.length?history.map(w=>`<button class="chip" data-word="${attr(w)}">${esc(w)}</button>`).join(""):`<span class="muted">No searches yet.</span>`;
}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function attr(s){return esc(s).replace(/`/g,"&#96;")}
$("search").addEventListener("input",e=>{query=e.target.value;showSaved=false;if(query.trim()){history=[query.trim(),...history.filter(x=>norm(x)!==norm(query))].slice(0,8);save()}render()});
$("level").addEventListener("change",render);
$("clear").addEventListener("click",()=>{$("search").value="";query="";showSaved=false;render()});
document.querySelectorAll(".dir").forEach(b=>b.addEventListener("click",()=>{direction=b.dataset.dir;document.querySelectorAll(".dir").forEach(x=>x.classList.toggle("active",x===b));$("search").placeholder=direction==="en-ha"?"Type an English word…":"Rubuta kalmar Hausa…";$("search").value="";query="";showSaved=false;render()}));
$("results").addEventListener("click",e=>{
 const fav=e.target.closest("[data-fav]"); if(fav){const k=fav.dataset.fav;favourites=favourites.includes(k)?favourites.filter(x=>x!==k):[...favourites,k];save();render();return}
 const speak=e.target.closest("[data-speak]");if(speak){if("speechSynthesis"in window){const u=new SpeechSynthesisUtterance(speak.dataset.speak);u.lang=direction==="en-ha"?"en-GB":"ha-NG";speechSynthesis.speak(u)}else alert("Speech is not supported by this browser.");}
});
document.body.addEventListener("click",e=>{const w=e.target.closest("[data-word]");if(w){$("search").value=w.dataset.word;query=w.dataset.word;showSaved=false;render()}});
$("showSaved").addEventListener("click",()=>{showSaved=!showSaved;$("showSaved").textContent=showSaved?"Show all words":"View saved";render()});
$("clearHistory").addEventListener("click",()=>{history=[];save();render()});
if("serviceWorker"in navigator && location.protocol!=="file:"){navigator.serviceWorker.register("./sw.js").catch(()=>{});}
render();
})();
import { useState, useEffect, useRef } from "react";

const MODEL = "claude-sonnet-4-20250514";
const STORAGE_KEY = "sillage-v1";
const WISHLIST_KEY = "sillage-wishlist-v1";
const LOG_KEY = "sillage-log-v1";

const WX_DESC = { 0:"Clear sky",1:"Mostly clear",2:"Partly cloudy",3:"Overcast",45:"Foggy",48:"Dense fog",51:"Light drizzle",53:"Drizzle",55:"Heavy drizzle",61:"Light rain",63:"Rain",65:"Heavy rain",71:"Light snow",73:"Snow",75:"Heavy snow",80:"Light showers",81:"Showers",82:"Heavy showers",95:"Thunderstorm" };
const WX_ICON = { 0:"☀️",1:"🌤",2:"⛅",3:"☁️",45:"🌫",48:"🌫",51:"🌦",53:"🌧",55:"🌧",61:"🌦",63:"🌧",65:"🌧",71:"🌨",73:"❄️",75:"❄️",80:"🌦",81:"🌧",82:"⛈",95:"⛈" };

const ACTIVITIES = [
  {id:"casual",label:"Casual",icon:"🌿"},{id:"work",label:"Work",icon:"💼"},
  {id:"uni",label:"Uni",icon:"🎓"},{id:"date",label:"Date",icon:"💫"},
  {id:"gym",label:"Gym",icon:"💪"},{id:"evening",label:"Evening",icon:"🌙"},
  {id:"formal",label:"Formal",icon:"🎩"},
];

const GROUP_KEYS = {
  season:["spring","summer","autumn","winter"],
  occasion:["casual","work","uni","date","evening","gym","formal"],
  time:["morning","afternoon","evening","night"],
};

const GROUP_ICONS = {
  spring:"🌸",summer:"☀️",autumn:"🍂",winter:"❄️",
  casual:"🌿",work:"💼",uni:"🎓",date:"💫",evening:"🌙",gym:"💪",formal:"🎩",
  morning:"🌅",afternoon:"☀️",night:"🌌",
};

async function callClaude(prompt, max_tokens=1200) {
  const apiKey = process.env.REACT_APP_ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("API key not configured. Please set REACT_APP_ANTHROPIC_API_KEY in your .env file");
  }
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "x-api-key": apiKey
    },
    body:JSON.stringify({ model:MODEL, max_tokens, messages:[{role:"user",content:prompt}] })
  });
  const d = await r.json();
  if (!d.content || !d.content[0]) {
    throw new Error(d.error?.message || "API call failed");
  }
  return d.content[0].text;
}

function parseJ(text) {
  return JSON.parse(text.replace(/```json\n?|```\n?/g,"").trim());
}

function Bottle({ color="#c9a96e", h=88 }) {
  const w = h * 0.62;
  const uid = color.replace(/[^a-z0-9]/gi,"");
  return (
    <svg width={w} height={h} viewBox="0 0 56 90" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`bg_${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0.5"/>
          <stop offset="45%" stopColor={color} stopOpacity="0.92"/>
          <stop offset="100%" stopColor={color} stopOpacity="0.45"/>
        </linearGradient>
        <linearGradient id={`sh_${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="white" stopOpacity="0.28"/>
          <stop offset="100%" stopColor="white" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <rect x="21" y="1" width="14" height="9" rx="2" fill={color}/>
      <rect x="23" y="10" width="10" height="13" rx="1" fill={color} opacity="0.78"/>
      <path d="M13 23 C19 20 24 19 28 19 C32 19 37 20 43 23 L45 32 H11 Z" fill={`url(#bg_${uid})`}/>
      <rect x="11" y="32" width="34" height="52" rx="5" fill={`url(#bg_${uid})`}/>
      <rect x="15" y="44" width="26" height="28" rx="2" fill="white" opacity="0.07"/>
      <rect x="13" y="34" width="7" height="48" rx="3" fill={`url(#sh_${uid})`}/>
    </svg>
  );
}

function Stars({ value=0, onChange, size=15 }) {
  return (
    <div style={{display:"flex",gap:2}}>
      {[1,2,3,4,5].map(i=>(
        <span key={i} onClick={()=>onChange?.(i)} style={{fontSize:size,cursor:onChange?"pointer":"default",color:i<=value?"#c9a96e":"#2a2018",transition:"color .15s",userSelect:"none"}}>★</span>
      ))}
    </div>
  );
}

function Bar({ value=5, max=10 }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <div style={{flex:1,height:3,background:"#1e1810",borderRadius:2,overflow:"hidden"}}>
        <div style={{width:`${(value/max)*100}%`,height:"100%",background:"linear-gradient(90deg,#8a6a3a,#c9a96e)",borderRadius:2,transition:"width .5s ease"}}/>
      </div>
      <span style={{fontSize:11,color:"#6a5a44",minWidth:22,textAlign:"right"}}>{value}/10</span>
    </div>
  );
}

function Tag({ children, color="#c9a96e" }) {
  return (
    <span style={{display:"inline-block",padding:"2px 10px",borderRadius:20,fontSize:11,border:`1px solid ${color}33`,color,margin:2,letterSpacing:"0.4px",textTransform:"capitalize"}}>
      {children}
    </span>
  );
}

export default function Sillage() {
  const [page,setPage] = useState("home");
  const [collection,setCollection] = useState([]);
  const [wishlist,setWishlist] = useState([]);
  const [wearLog,setWearLog] = useState([]);
  const [weather,setWeather] = useState(null);
  const [rec,setRec] = useState(null);
  const [activity,setActivity] = useState("casual");
  const [detail,setDetail] = useState(null);
  const [detailSource,setDetailSource] = useState("collection");
  const [addMode,setAddMode] = useState("search");
  const [query,setQuery] = useState("");
  const [searchResult,setSearchResult] = useState(null);
  const [isSearching,setIsSearching] = useState(false);
  const [isGettingRec,setIsGettingRec] = useState(false);
  const [groupBy,setGroupBy] = useState("season");
  const [familyFilter,setFamilyFilter] = useState("all");
  const [collSearch,setCollSearch] = useState("");
  const [isScanning,setIsScanning] = useState(false);
  const [toast,setToast] = useState(null);
  const [recForced,setRecForced] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const scanRef = useRef(null);

  useEffect(()=>{
    const link = document.createElement("link");
    link.rel="stylesheet";
    link.href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Cormorant+Garamond:wght@300;400;500;600&display=swap";
    document.head.appendChild(link);
    loadData();
    fetchWeather();
    return ()=>document.head.removeChild(link);
  },[]);

  useEffect(()=>{
    if(weather && collection.length>0 && !rec && !recForced) getRecommendation(false);
  },[weather,collection.length]);

  function showToast(msg){ setToast(msg); setTimeout(()=>setToast(null),2800); }

  async function loadData(){
    try {
      const r1 = localStorage.getItem(STORAGE_KEY);
      if(r1) setCollection(JSON.parse(r1));
    } catch(e){}
    try {
      const r2 = localStorage.getItem(WISHLIST_KEY);
      if(r2) setWishlist(JSON.parse(r2));
    } catch(e){}
    try {
      const r3 = localStorage.getItem(LOG_KEY);
      if(r3) setWearLog(JSON.parse(r3));
    } catch(e){}
  }

  async function saveCollection(col){ localStorage.setItem(STORAGE_KEY,JSON.stringify(col)); setCollection(col); }
  async function saveWishlist(wl){ localStorage.setItem(WISHLIST_KEY,JSON.stringify(wl)); setWishlist(wl); }
  async function saveLog(log){ localStorage.setItem(LOG_KEY,JSON.stringify(log)); setWearLog(log); }

  async function fetchWeather(){
    const doFetch = async(lat,lon)=>{
      try {
        const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode,relative_humidity_2m,apparent_temperature&timezone=auto`);
        const d = await r.json(); const c = d.current;
        const temp=Math.round(c.temperature_2m), feels=Math.round(c.apparent_temperature), code=c.weathercode??0;
        const conds=[];
        if(temp>25) conds.push("hot"); else if(temp>18) conds.push("warm"); else if(temp>10) conds.push("cool"); else conds.push("cold");
        if([51,53,55,61,63,65,80,81,82].includes(code)) conds.push("rainy");
        else if(code<=1) conds.push("sunny"); else conds.push("cloudy");
        setWeather({temp,feels,humidity:c.relative_humidity_2m,code,conds,desc:WX_DESC[code]||"Unknown"});
      } catch(e){}
    };
    if(navigator.geolocation) navigator.geolocation.getCurrentPosition(p=>doFetch(p.coords.latitude,p.coords.longitude),()=>doFetch(51.5792,-0.3365));
    else doFetch(51.5792,-0.3365);
  }

  async function doSearch(q){
    if(!q.trim()) return;
    setIsSearching(true); setSearchResult(null);
    try {
      const text = await callClaude(`You are a fragrance expert database. Return ONLY a valid JSON object (no markdown, no backticks, no explanation) about the fragrance "${q}". Use this exact schema:
{"name":"","brand":"","year":2020,"description":"evocative 2-3 sentence description","concentration":"EDP","family":"Woody","subfamilies":["Aromatic"],"topNotes":["Bergamot","Pepper"],"middleNotes":["Lavender","Geranium"],"baseNotes":["Cedarwood","Vetiver"],"seasons":["spring","autumn"],"occasions":["casual","work"],"weather":["cool","cloudy"],"timeOfDay":["morning","afternoon"],"longevity":7,"sillage":6,"bottleColor":"#8b6914","intensity":"moderate","gender":"masculine","perfumer":null,"similarTo":["Dior Sauvage","Armani Acqua di Gio"]}
Only JSON. Longevity/sillage 1-10. bottleColor hex matching the fragrance vibe.`);
      const frag = parseJ(text);
      frag.id=Date.now().toString(); frag.addedDate=new Date().toISOString(); frag.rating=0; frag.wearCount=0; frag.personalNotes="";
      setSearchResult(frag);
    } catch(e){ showToast("Couldn't find that fragrance — try a different name."); }
    setIsSearching(false);
  }

  async function getRecommendation(forced=true){
    if(collection.length===0) return;
    if(forced) setRecForced(true);
    setIsGettingRec(true); setRec(null);
    try {
      const wx=weather?`${weather.desc}, ${weather.temp}°C (feels ${weather.feels}°C), ${weather.conds.join(", ")}`:"unknown";
      const list=collection.map(f=>`"${f.name}" by ${f.brand} [family:${f.family||"?"},seasons:${(f.seasons||[]).join(",")},occasions:${(f.occasions||[]).join(",")},weather:${(f.weather||[]).join(",")}]`).join("\n");
      const text = await callClaude(`My fragrance collection:\n${list}\n\nToday: ${wx}, Activity: ${activity}\n\nWhich single fragrance is perfect for right now? Return ONLY JSON (no backticks): {"name":"exact name from list","reason":"2-3 engaging, specific sentences explaining why this is the ideal choice for today"}`);
      const p=parseJ(text);
      const frag=collection.find(f=>f.name.toLowerCase().includes(p.name.toLowerCase())||p.name.toLowerCase().includes(f.name.toLowerCase()))||collection[0];
      setRec({reason:p.reason,frag});
    } catch(e){}
    setIsGettingRec(false);
  }

  function addFrag(frag, toWishlist=false){
    if(toWishlist){ const wl=[...wishlist,frag]; saveWishlist(wl); showToast(`${frag.name} added to wishlist`); }
    else { const col=[...collection,frag]; saveCollection(col); showToast(`${frag.name} added to collection!`); setPage("collection"); }
    setSearchResult(null); setQuery("");
  }

  function removeFrag(id,src="collection"){
    if(src==="wishlist"){ saveWishlist(wishlist.filter(f=>f.id!==id)); }
    else { saveCollection(collection.filter(f=>f.id!==id)); }
    if(detail?.id===id) setDetail(null);
    showToast("Removed");
  }

  function moveToCollection(id){
    const frag=wishlist.find(f=>f.id===id); if(!frag) return;
    saveWishlist(wishlist.filter(f=>f.id!==id));
    saveCollection([...collection,{...frag,id:Date.now().toString(),addedDate:new Date().toISOString()}]);
    showToast(`${frag.name} moved to collection!`); setDetail(null);
  }

  function logWear(id){
    const frag=collection.find(f=>f.id===id); if(!frag) return;
    saveCollection(collection.map(f=>f.id===id?{...f,wearCount:(f.wearCount||0)+1,lastWorn:new Date().toISOString()}:f));
    const entry={id:Date.now().toString(),fragId:id,fragName:frag.name,date:new Date().toISOString(),activity,weather:weather?.desc||null};
    saveLog([entry,...wearLog].slice(0,200));
    showToast("Wear logged! ✓");
  }

  function rateF(id,r){ saveCollection(collection.map(f=>f.id===id?{...f,rating:r}:f)); }

  async function startScan(){
    setIsScanning(true);
    try {
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}});
      if(!videoRef.current){setIsScanning(false);return;}
      videoRef.current.srcObject=stream;
      await videoRef.current.play();
      if(!window.jsQR){
        await new Promise((res,rej)=>{ const s=document.createElement("script"); s.src="https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.js"; s.onload=res; s.onerror=rej; document.head.appendChild(s); });
      }
      scanRef.current=setInterval(()=>{
        const v=videoRef.current,c=canvasRef.current;
        if(!v||!c||!v.videoWidth) return;
        c.width=v.videoWidth; c.height=v.videoHeight;
        c.getContext("2d").drawImage(v,0,0);
        const img=c.getContext("2d").getImageData(0,0,c.width,c.height);
        const code=window.jsQR(img.data,img.width,img.height);
        if(code){ stopScan(); setAddMode("search"); setQuery(code.data); doSearch(code.data); }
      },400);
    } catch(e){ showToast("Camera access denied"); setIsScanning(false); }
  }

  function stopScan(){ clearInterval(scanRef.current); videoRef.current?.srcObject?.getTracks().forEach(t=>t.stop()); setIsScanning(false); }

  const C={bg:"#07050302",surf:"#110d0800",card:"#1a1410",border:"#251e14",divider:"#1c1710",gold:"#c9a96e",goldLight:"#e8c99a",goldDim:"#8a6a3a",text:"#f0e4d0",textSub:"#7a6a54",textMut:"#312a20"};
  const realBg="#080604",realSurf="#110d08";

  const S={
    app:{minHeight:"100vh",background:realBg,color:C.text,fontFamily:"'Cormorant Garamond',Georgia,serif",position:"relative"},
    header:{padding:"14px 28px",display:"flex",alignItems:"center",gap:20,borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,zIndex:100,background:realBg+"ee",backdropFilter:"blur(14px)"},
    nav:{display:"flex",gap:2,flex:1,justifyContent:"center"},
    navBtn:{background:"none",border:"none",color:C.textSub,cursor:"pointer",padding:"6px 14px",borderRadius:4,fontSize:13,letterSpacing:"0.8px",textTransform:"uppercase",fontFamily:"'Cormorant Garamond',serif",transition:"all .2s",borderBottom:"1px solid transparent"},
    navActive:{color:C.gold,borderBottom:`1px solid ${C.gold}`},
    addBtn:{background:C.gold,color:realBg,border:"none",padding:"7px 18px",borderRadius:4,cursor:"pointer",fontSize:13,letterSpacing:"0.8px",fontFamily:"'Cormorant Garamond',serif",fontWeight:600,transition:"opacity .2s"},
    main:{padding:"32px 28px",maxWidth:1100,margin:"0 auto"},
    card:{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:20},
    input:{background:"#0d0906",border:`1px solid ${C.border}`,color:C.text,padding:"10px 14px",borderRadius:6,fontSize:14,fontFamily:"'Cormorant Garamond',serif",outline:"none",transition:"border-color .2s"},
    btn:{background:C.gold,color:realBg,border:"none",padding:"10px 22px",borderRadius:6,cursor:"pointer",fontSize:14,fontFamily:"'Cormorant Garamond',serif",fontWeight:700,letterSpacing:"0.4px",transition:"opacity .15s"},
    btnOut:{background:"none",color:C.gold,border:`1px solid ${C.gold}44`,padding:"9px 20px",borderRadius:6,cursor:"pointer",fontSize:14,fontFamily:"'Cormorant Garamond',serif",transition:"all .2s"},
    btnRed:{background:"none",color:"#c45a4a",border:`1px solid #c45a4a44`,padding:"9px 20px",borderRadius:6,cursor:"pointer",fontSize:14,fontFamily:"'Cormorant Garamond',serif"},
    h1:{fontFamily:"'Playfair Display',serif",fontSize:32,fontWeight:400,color:C.text,margin:0},
    h2:{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:400,color:C.text,margin:0},
    tag:{display:"inline-block",padding:"2px 10px",borderRadius:20,fontSize:11,border:`1px solid ${C.gold}33`,color:C.goldDim,margin:2,letterSpacing:"0.4px",textTransform:"capitalize"},
    modal:{position:"fixed",inset:0,background:"#000000bb",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center",backdropFilter:"blur(6px)"},
    modalInner:{background:realSurf,borderRadius:"18px 18px 0 0",maxWidth:660,width:"100%",maxHeight:"92vh",overflowY:"auto",padding:28,border:`1px solid ${C.border}`,borderBottom:"none"},
    toast:{position:"fixed",bottom:28,left:"50%",transform:"translateX(-50%)",background:C.gold,color:realBg,padding:"9px 22px",borderRadius:30,fontSize:13,fontWeight:700,zIndex:300,pointerEvents:"none",letterSpacing:"0.4px",whiteSpace:"nowrap"},
    chip:{background:"none",border:`1px solid ${C.border}`,color:C.textSub,padding:"5px 14px",borderRadius:20,cursor:"pointer",fontSize:11,letterSpacing:"0.6px",textTransform:"uppercase",fontFamily:"'Cormorant Garamond',serif",transition:"all .2s"},
    chipActive:{background:C.gold,color:realBg,border:`1px solid ${C.gold}`},
  };

  const fragCard=(frag,src="collection")=>(
    <div key={frag.id}
      onClick={()=>{setDetail(frag);setDetailSource(src);}}
      style={{...S.card,cursor:"pointer",textAlign:"center",position:"relative",overflow:"hidden",transition:"all .25s"}}
      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.borderColor=C.gold+"66";}}
      onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.borderColor=C.border;}}>
      {src==="wishlist"&&<div style={{position:"absolute",top:8,right:8,fontSize:10,color:C.goldDim,letterSpacing:"0.5px",textTransform:"uppercase",border:`1px solid ${C.goldDim}44`,padding:"1px 6px",borderRadius:10}}>Wish</div>}
      <div style={{marginBottom:10}}><Bottle color={frag.bottleColor||"#c9a96e"} h={76}/></div>
      <div style={{fontSize:13,fontFamily:"'Playfair Display',serif",fontWeight:600,color:C.text,marginBottom:2,lineHeight:1.3}}>{frag.name}</div>
      <div style={{fontSize:11,color:C.textSub,letterSpacing:"0.3px",marginBottom:src==="wishlist"?0:6}}>{frag.brand}</div>
      {src!=="wishlist"&&<Stars value={frag.rating||0}/>}
      {frag.wearCount>0&&<div style={{fontSize:10,color:C.textMut||"#3a3025",marginTop:4}}>Worn {frag.wearCount}×</div>}
    </div>
  );

  const HomePage=()=>{
    const todayStr=new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"});
    const families=[...new Set(collection.map(f=>f.family).filter(Boolean))];
    const totalWears=collection.reduce((s,f)=>s+(f.wearCount||0),0);
    const mostWorn=collection.sort((a,b)=>(b.wearCount||0)-(a.wearCount||0))[0];
    return (
      <div>
        <div style={{marginBottom:28}}>
          <h1 style={{...S.h1,marginBottom:4}}>{todayStr}</h1>
          <p style={{color:C.textSub,fontSize:15,margin:0}}>What will you wear today?</p>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
          <div style={{...S.card,background:"linear-gradient(135deg,#1a1410,#0f0c08)"}}>
            <div style={{fontSize:10,letterSpacing:"1.8px",color:C.goldDim,textTransform:"uppercase",marginBottom:12}}>Today's Weather</div>
            {weather?(
              <div>
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
                  <span style={{fontSize:32,lineHeight:1}}>{WX_ICON[weather.code]||"🌡"}</span>
                  <div>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:30,fontWeight:400,lineHeight:1}}>{weather.temp}°C</div>
                    <div style={{color:C.textSub,fontSize:13,marginTop:2}}>{weather.desc}</div>
                  </div>
                </div>
                <div style={{display:"flex",gap:14,fontSize:12,color:C.textSub}}>
                  <span>Feels {weather.feels}°C</span><span>Humidity {weather.humidity}%</span>
                </div>
              </div>
            ):<div style={{color:C.textSub,fontStyle:"italic"}}>Fetching weather…</div>}
          </div>

          <div style={S.card}>
            <div style={{fontSize:10,letterSpacing:"1.8px",color:C.goldDim,textTransform:"uppercase",marginBottom:12}}>Today's Plan</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
              {ACTIVITIES.map(a=>(
                <button key={a.id} onClick={()=>{setActivity(a.id);setRec(null);setRecForced(false);}}
                  style={{...S.chip,...(activity===a.id?S.chipActive:{}),fontSize:11,padding:"4px 10px"}}>
                  {a.icon} {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{...S.card,background:"linear-gradient(135deg,#1a1208,#0e0b06)",marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
            <div>
              <div style={{fontSize:10,letterSpacing:"1.8px",color:C.goldDim,textTransform:"uppercase",marginBottom:3}}>Recommended Today</div>
              <div style={{fontSize:12,color:C.textSub}}>AI-powered · based on weather & activity</div>
            </div>
            <button onClick={()=>getRecommendation(true)} disabled={isGettingRec||collection.length===0}
              style={{...S.btnOut,fontSize:12,padding:"6px 14px",opacity:isGettingRec?0.5:1}}>
              ↺ Refresh
            </button>
          </div>
          {collection.length===0?(
            <div style={{textAlign:"center",padding:"20px 0",color:C.textSub}}>
              <div style={{fontSize:28,marginBottom:8,opacity:0.4}}>◈</div>
              <div style={{marginBottom:12}}>Add fragrances to get personalised recommendations</div>
              <button onClick={()=>setPage("add")} style={S.btn}>Add Your First Fragrance</button>
            </div>
          ):isGettingRec?(
            <div style={{textAlign:"center",padding:"24px 0",color:C.textSub,fontStyle:"italic"}}>Selecting the perfect scent…</div>
          ):rec?(
            <div style={{display:"flex",gap:20,alignItems:"center"}}>
              <div onClick={()=>{setDetail(rec.frag);setDetailSource("collection");}} style={{cursor:"pointer",flexShrink:0}}>
                <Bottle color={rec.frag?.bottleColor||"#c9a96e"} h={100}/>
              </div>
              <div style={{flex:1}}>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:400,marginBottom:2}}>{rec.frag?.name}</div>
                <div style={{fontSize:13,color:C.textSub,marginBottom:10}}>{rec.frag?.brand} · {rec.frag?.concentration}</div>
                <p style={{fontSize:14,lineHeight:1.75,color:C.text,fontStyle:"italic",margin:"0 0 12px 0",borderLeft:`2px solid ${C.gold}44`,paddingLeft:12}}>{rec.reason}</p>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>logWear(rec.frag?.id)} style={{...S.btn,fontSize:12,padding:"7px 16px"}}>✓ Wearing This</button>
                  <button onClick={()=>{setDetail(rec.frag);setDetailSource("collection");}} style={{...S.btnOut,fontSize:12,padding:"6px 14px"}}>Details</button>
                </div>
              </div>
            </div>
          ):(
            <div style={{textAlign:"center",padding:16}}>
              <button onClick={()=>getRecommendation(true)} style={S.btn}>Get Recommendation</button>
            </div>
          )}
        </div>

        {collection.length>0&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
            {[
              {l:"Collection",v:collection.length,icon:"◈"},
              {l:"Times Worn",v:totalWears,icon:"◎"},
              {l:"Families",v:families.length,icon:"⊛"},
              {l:"Wishlist",v:wishlist.length,icon:"♡"},
            ].map(s=>(
              <div key={s.l} style={{...S.card,textAlign:"center",padding:"14px 10px"}}>
                <div style={{fontSize:18,color:C.gold,marginBottom:4}}>{s.icon}</div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:400,color:C.goldLight,lineHeight:1}}>{s.v}</div>
                <div style={{fontSize:10,color:C.textSub,letterSpacing:"1px",textTransform:"uppercase",marginTop:4}}>{s.l}</div>
              </div>
            ))}
          </div>
        )}

        {wearLog.length>0&&(
          <div style={S.card}>
            <div style={{fontSize:10,letterSpacing:"1.8px",color:C.goldDim,textTransform:"uppercase",marginBottom:14}}>Recent Wears</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {wearLog.slice(0,5).map(e=>(
                <div key={e.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:13,paddingBottom:8,borderBottom:`1px solid ${C.divider}`}}>
                  <div>
                    <span style={{color:C.text,fontFamily:"'Playfair Display',serif"}}>{e.fragName}</span>
                    {e.activity&&<span style={{color:C.textSub,marginLeft:8,fontSize:12}}>· {e.activity}</span>}
                  </div>
                  <span style={{color:C.textSub,fontSize:12}}>{new Date(e.date).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const families=["all",...[...new Set([...collection,...wishlist].map(f=>f.family).filter(Boolean))].sort()];

  const CollectionPage=()=>{
    const allItems=[...collection.map(f=>({...f,_src:"collection"})),...wishlist.map(f=>({...f,_src:"wishlist"}))];
    const filtered=allItems.filter(f=>{
      const familyOk=familyFilter==="all"||f.family?.toLowerCase().includes(familyFilter.toLowerCase());
      const searchOk=!collSearch||f.name.toLowerCase().includes(collSearch.toLowerCase())||f.brand?.toLowerCase().includes(collSearch.toLowerCase());
      return familyOk&&searchOk;
    });
    return (
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:24}}>
          <div>
            <h1 style={S.h1}>My Collection</h1>
            <p style={{color:C.textSub,fontSize:14,margin:"4px 0 0"}}>{collection.length} owned · {wishlist.length} on wishlist</p>
          </div>
          <button onClick={()=>setPage("add")} style={S.btn}>+ Add Fragrance</button>
        </div>

        <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
          <input value={collSearch} onChange={e=>setCollSearch(e.target.value)} placeholder="Search your collection…"
            style={{...S.input,width:220,fontSize:13,padding:"7px 12px"}}
            onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border}/>
          {families.map(f=>(
            <button key={f} onClick={()=>setFamilyFilter(f)} style={{...S.chip,...(familyFilter===f?S.chipActive:{})}}>
              {f==="all"?"All":f}
            </button>
          ))}
        </div>

        {filtered.length===0?(
          <div style={{textAlign:"center",padding:"60px 0",color:C.textSub}}>
            <div style={{fontSize:36,opacity:0.3,marginBottom:12}}>◈</div>
            <div style={{fontSize:16,marginBottom:8}}>{collection.length===0?"Your collection is empty":"No matches found"}</div>
            {collection.length===0&&<button onClick={()=>setPage("add")} style={{...S.btn,marginTop:8}}>Add Your First</button>}
          </div>
        ):(
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:14}}>
            {filtered.map(f=>fragCard(f,f._src))}
          </div>
        )}
      </div>
    );
  };

  const GroupsPage=()=>{
    const groups=GROUP_KEYS[groupBy].map(k=>({
      key:k,
      frags:collection.filter(f=>{
        const arr=groupBy==="season"?f.seasons:groupBy==="occasion"?f.occasions:f.timeOfDay;
        return arr?.includes(k);
      })
    }));
    return (
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:24}}>
          <div>
            <h1 style={S.h1}>Fragrance Guide</h1>
            <p style={{color:C.textSub,fontSize:14,margin:"4px 0 0"}}>When to wear what</p>
          </div>
          <div style={{display:"flex",gap:6}}>
            {["season","occasion","time"].map(g=>(
              <button key={g} onClick={()=>setGroupBy(g)} style={{...S.chip,...(groupBy===g?S.chipActive:{})}}>
                {g==="time"?"Time of day":g.charAt(0).toUpperCase()+g.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {collection.length===0?(
          <div style={{textAlign:"center",padding:"60px 0",color:C.textSub}}>
            <div style={{fontSize:36,opacity:0.3,marginBottom:12}}>⊛</div>
            <div style={{marginBottom:8}}>Add fragrances to see them grouped here</div>
            <button onClick={()=>setPage("add")} style={{...S.btn,marginTop:8}}>Add Fragrances</button>
          </div>
        ):(
          <div style={{display:"grid",gap:16}}>
            {groups.map(({key,frags})=>(
              <div key={key} style={S.card}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:frags.length>0?14:0}}>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:17,fontWeight:600,color:C.goldLight}}>
                    {GROUP_ICONS[key]||""} {key.charAt(0).toUpperCase()+key.slice(1)}
                  </div>
                  <span style={{fontSize:12,color:C.textSub}}>{frags.length} fragrance{frags.length!==1?"s":""}</span>
                </div>
                {frags.length===0?(
                  <div style={{color:C.textSub,fontSize:13,fontStyle:"italic",paddingTop:4}}>None assigned yet — add more fragrances to fill this.</div>
                ):(
                  <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
                    {frags.map(f=>(
                      <div key={f.id} onClick={()=>{setDetail(f);setDetailSource("collection");}}
                        style={{display:"flex",alignItems:"center",gap:10,background:C.bg||realBg,padding:"8px 14px",borderRadius:8,cursor:"pointer",border:`1px solid ${C.divider}`,transition:"all .2s"}}
                        onMouseEnter={e=>{e.currentTarget.style.borderColor=C.gold+"66";}}
                        onMouseLeave={e=>{e.currentTarget.style.borderColor=C.divider;}}>
                        <Bottle color={f.bottleColor||"#c9a96e"} h={34}/>
                        <div>
                          <div style={{fontSize:13,fontFamily:"'Playfair Display',serif",fontWeight:600,color:C.text}}>{f.name}</div>
                          <div style={{fontSize:11,color:C.textSub}}>{f.brand}</div>
                        </div>
                        {(f.wearCount||0)>0&&<span style={{fontSize:10,color:C.textSub,marginLeft:4,alignSelf:"flex-start"}}>{f.wearCount}×</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const AddPage=()=>(
    <div style={{maxWidth:580,margin:"0 auto"}}>
      <h1 style={{...S.h1,marginBottom:4}}>Add a Fragrance</h1>
      <p style={{color:C.textSub,fontSize:14,margin:"0 0 24px"}}>Search by name or scan a QR code</p>

      <div style={{display:"flex",gap:8,marginBottom:24}}>
        {["search","qr"].map(m=>(
          <button key={m} onClick={()=>{setAddMode(m);if(m==="search"&&isScanning)stopScan();}}
            style={{...S.chip,...(addMode===m?S.chipActive:{}),flex:1,padding:"10px",borderRadius:8,fontSize:13}}>
            {m==="search"?"🔍  Search by name":"📷  Scan QR code"}
          </button>
        ))}
      </div>

      {addMode==="search"&&(
        <div>
          <div style={{display:"flex",gap:8,marginBottom:20}}>
            <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doSearch(query)}
              placeholder="e.g. Bleu de Chanel, Sauvage, Oud Wood…"
              style={{...S.input,flex:1}} onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border}/>
            <button onClick={()=>doSearch(query)} disabled={isSearching||!query.trim()} style={{...S.btn,opacity:isSearching||!query.trim()?0.5:1}}>
              {isSearching?"…":"Search"}
            </button>
          </div>

          {isSearching&&<div style={{textAlign:"center",padding:"40px 0",color:C.textSub,fontStyle:"italic"}}>Fetching fragrance details…</div>}

          {searchResult&&!isSearching&&(
            <div style={{...S.card,border:`1px solid ${C.gold}33`}}>
              <div style={{display:"flex",gap:20,alignItems:"flex-start",marginBottom:16}}>
                <Bottle color={searchResult.bottleColor||"#c9a96e"} h={110}/>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:400,marginBottom:4}}>{searchResult.name}</div>
                  <div style={{fontSize:13,color:C.textSub,marginBottom:8}}>{searchResult.brand} · {searchResult.year} · {searchResult.concentration}</div>
                  <p style={{fontSize:13,lineHeight:1.75,color:C.textSub,margin:"0 0 10px",fontStyle:"italic"}}>{searchResult.description}</p>
                  <div>{[searchResult.family,...(searchResult.subfamilies||[])].filter(Boolean).map((t,i)=><span key={i} style={S.tag}>{t}</span>)}</div>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14,fontSize:12,color:C.textSub}}>
                <div>Top: {(searchResult.topNotes||[]).slice(0,3).join(", ")}</div>
                <div>Heart: {(searchResult.middleNotes||[]).slice(0,3).join(", ")}</div>
                <div>Base: {(searchResult.baseNotes||[]).slice(0,3).join(", ")}</div>
                <div>Gender: {searchResult.gender||"—"}</div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>addFrag(searchResult,false)} style={{...S.btn,flex:1}}>+ Add to Collection</button>
                <button onClick={()=>addFrag({...searchResult,id:Date.now().toString(),addedDate:new Date().toISOString()},true)} style={{...S.btnOut}}>♡ Wishlist</button>
                <button onClick={()=>setSearchResult(null)} style={{...S.btnRed,padding:"9px 12px"}}>✕</button>
              </div>
            </div>
          )}
        </div>
      )}

      {addMode==="qr"&&(
        <div>
          <div style={{...S.card,textAlign:"center",marginBottom:14}}>
            <div style={{borderRadius:8,overflow:"hidden",marginBottom:12,background:"#000",minHeight:isScanning?200:120,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <video ref={videoRef} style={{width:"100%",maxHeight:280,objectFit:"cover",display:isScanning?"block":"none"}} playsInline muted/>
              <canvas ref={canvasRef} style={{display:"none"}}/>
              {!isScanning&&<div style={{color:C.textSub,padding:"20px 0"}}>
                <div style={{fontSize:36,marginBottom:8}}>📷</div>
                <div style={{fontSize:13}}>Camera preview will appear here</div>
              </div>}
            </div>
            {isScanning?<button onClick={stopScan} style={{...S.btnOut,width:"100%"}}>Stop Scanning</button>
              :<button onClick={startScan} style={{...S.btn,width:"100%"}}>Start Camera</button>}
          </div>
          <p style={{fontSize:12,color:C.textSub,textAlign:"center",lineHeight:1.7,margin:0}}>
            Scan a QR code containing a fragrance name or Fragrantica URL. Details will be fetched automatically.
          </p>
        </div>
      )}
    </div>
  );

  const DetailModal=()=>{
    if(!detail) return null;
    const live=detailSource==="collection"?collection.find(f=>f.id===detail.id)||detail:wishlist.find(f=>f.id===detail.id)||detail;
    const isWish=detailSource==="wishlist";
    return (
      <div style={S.modal} onClick={e=>{if(e.target===e.currentTarget)setDetail(null);}}>
        <div style={S.modalInner}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
            <div style={{display:"flex",gap:20,alignItems:"center"}}>
              <Bottle color={live.bottleColor||"#c9a96e"} h={100}/>
              <div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:400,marginBottom:3}}>{live.name}</div>
                <div style={{fontSize:13,color:C.textSub,marginBottom:8}}>{live.brand} · {live.year} · {live.concentration}</div>
                {!isWish&&<Stars value={live.rating||0} onChange={r=>rateF(live.id,r)}/>}
                {isWish&&<span style={{...S.tag,color:C.gold,borderColor:C.gold+"44"}}>♡ On wishlist</span>}
              </div>
            </div>
            <button onClick={()=>setDetail(null)} style={{background:"none",border:"none",color:C.textSub,cursor:"pointer",fontSize:20,padding:4,lineHeight:1}}>✕</button>
          </div>

          <p style={{fontSize:14,lineHeight:1.8,color:C.textSub,fontStyle:"italic",margin:"0 0 22px",borderLeft:`2px solid ${C.gold}44`,paddingLeft:14}}>{live.description}</p>

          <div style={{marginBottom:20}}>
            <div style={{fontSize:10,letterSpacing:"1.8px",color:C.goldDim,textTransform:"uppercase",marginBottom:12}}>Fragrance Pyramid</div>
            {[["Top Notes",live.topNotes,"#a8c8d4"],["Heart Notes",live.middleNotes,"#d4a8c8"],["Base Notes",live.baseNotes,"#c8d4a8"]].map(([label,notes,col])=>(
              <div key={label} style={{marginBottom:10}}>
                <div style={{fontSize:11,color:C.textSub,marginBottom:5,letterSpacing:"0.5px"}}>{label}</div>
                <div>{(notes||[]).map((n,i)=><Tag key={i} color={col}>{n}</Tag>)}</div>
              </div>
            ))}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:20}}>
            <div>
              <div style={{fontSize:10,letterSpacing:"1.8px",color:C.goldDim,textTransform:"uppercase",marginBottom:12}}>Performance</div>
              <div style={{marginBottom:10}}>
                <div style={{fontSize:12,color:C.textSub,marginBottom:5}}>Longevity</div>
                <Bar value={live.longevity||5}/>
              </div>
              <div>
                <div style={{fontSize:12,color:C.textSub,marginBottom:5}}>Sillage</div>
                <Bar value={live.sillage||5}/>
              </div>
            </div>
            <div>
              <div style={{fontSize:10,letterSpacing:"1.8px",color:C.goldDim,textTransform:"uppercase",marginBottom:12}}>Details</div>
              {[["Family",live.family],["Intensity",live.intensity],["Gender",live.gender],["Perfumer",live.perfumer||"—"],["Times Worn",!isWish?(live.wearCount||0):null]].filter(([,v])=>v!=null).map(([k,v])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",marginBottom:7,fontSize:13,borderBottom:`1px solid ${C.divider}`,paddingBottom:7}}>
                  <span style={{color:C.textSub}}>{k}</span>
                  <span style={{color:C.text,textTransform:"capitalize"}}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{marginBottom:20}}>
            <div style={{fontSize:10,letterSpacing:"1.8px",color:C.goldDim,textTransform:"uppercase",marginBottom:10}}>Best Worn</div>
            <div>
              {(live.seasons||[]).map(s=><Tag key={s} color="#8ad4c8">🌿 {s}</Tag>)}
              {(live.occasions||[]).map(o=><Tag key={o} color="#d4a8c8">◎ {o}</Tag>)}
              {(live.weather||[]).map(w=><Tag key={w} color="#a8c8d4">☁ {w}</Tag>)}
              {(live.timeOfDay||[]).map(t=><Tag key={t} color="#d4c8a8">◷ {t}</Tag>)}
            </div>
          </div>

          {live.similarTo?.length>0&&(
            <div style={{marginBottom:20}}>
              <div style={{fontSize:10,letterSpacing:"1.8px",color:C.goldDim,textTransform:"uppercase",marginBottom:8}}>Similar Fragrances</div>
              <div>{live.similarTo.map((s,i)=><span key={i} style={S.tag}>{s}</span>)}</div>
            </div>
          )}

          <div style={{display:"flex",gap:8,paddingTop:16,borderTop:`1px solid ${C.border}`}}>
            {isWish?(
              <>
                <button onClick={()=>moveToCollection(live.id)} style={{...S.btn,flex:1}}>Move to Collection</button>
                <button onClick={()=>removeFrag(live.id,"wishlist")} style={S.btnRed}>Remove</button>
              </>
            ):(
              <>
                <button onClick={()=>logWear(live.id)} style={{...S.btn,flex:1}}>✓ Log Wear</button>
                <button onClick={()=>removeFrag(live.id,"collection")} style={S.btnRed}>Remove</button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={S.app}>
      {toast&&<div style={S.toast}>{toast}</div>}

      <header style={S.header}>
        <div style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>setPage("home")}>
          <span style={{fontSize:20,color:C.gold}}>◈</span>
          <span style={{fontFamily:"'Playfair Display',serif",fontSize:21,fontWeight:600,letterSpacing:"2px",color:C.text}}>Sillage</span>
        </div>
        <nav style={S.nav}>
          {[["home","Home"],["collection","Collection"],["groups","Guide"]].map(([p,l])=>(
            <button key={p} onClick={()=>setPage(p)} style={{...S.navBtn,...(page===p?S.navActive:{})}}>{l}</button>
          ))}
        </nav>
        <button onClick={()=>setPage("add")} style={S.addBtn}>+ Add</button>
      </header>

      <main style={S.main}>
        {page==="home"&&<HomePage/>}
        {page==="collection"&&<CollectionPage/>}
        {page==="groups"&&<GroupsPage/>}
        {page==="add"&&<AddPage/>}
      </main>

      {detail&&<DetailModal/>}
    </div>
  );
}

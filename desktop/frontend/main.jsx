import React, {useEffect,useRef,useState} from "react";
import {createRoot} from "react-dom/client";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {create2DMapOptions,lockMapTo2D} from "../../atlas/src/map2d.js";
import {createMapPresentation,STYLE_THEME_KEY} from "../../atlas/src/mapPresentation.js";
import {observeGlobeRelief} from "../../atlas/src/globeRelief.js";
import {selectedReading} from "./gate-model.js";
import {ProjectedLocusReadout} from "../../atlas/src/ProjectedLocusReadout.jsx";
import "../../atlas/src/styles.css";
import "./gate.css";

const invoke=(command,args)=>{
  if (!window.__TAURI__?.core?.invoke) return Promise.reject("native bridge unavailable");
  return window.__TAURI__.core.invoke(command,args);
};
const methods=["value_hash_v1","webmercator_hash_v1","nearest_10000_towns_hash_v1"];
function App(){
 const container=useRef(null),runtime=useRef(null),scene=useRef({theme:"day",surface:"flat",selected:null,data:null}),frames=useRef(0);
 const [engine,setEngine]=useState({phase:"starting"}),[bridgeError,setBridgeError]=useState("");
 const [theme,setTheme]=useState("day"),[surface,setSurface]=useState("flat"),[manifest,setManifest]=useState([]);
 const [cipher,setCipher]=useState("AQ"),[method,setMethod]=useState(methods[1]),[data,setData]=useState(null);
 const [selected,setSelected]=useState(null),[value,setValue]=useState("177"),[mapError,setMapError]=useState("");
 const [glStatus,setGlStatus]=useState("WebGL2 initializing"),[dataError,setDataError]=useState("");
 scene.current={theme,surface,selected,data};
 useEffect(()=>{
   let disposed=false;
   const poll=()=>invoke("engine_status").then(s=>{if(!disposed)setEngine(s)}).catch(()=>{if(!disposed)setBridgeError("native engine bridge unavailable")});
   poll(); const id=setInterval(poll,250); return()=>{disposed=true;clearInterval(id)};
 },[]);
 useEffect(()=>{fetch("./data/manifest.json").then(r=>{if(!r.ok)throw Error();return r.json()}).then(setManifest).catch(()=>setDataError("numeric manifest unavailable"))},[]);
 useEffect(()=>{
   const entry=manifest.find(e=>e.cipher.toLowerCase()===cipher.toLowerCase()&&e.projection_method===method);
   if(!entry)return;
   const abort=new AbortController();setData(null);setSelected(null);setDataError("");
   fetch("."+entry.file,{signal:abort.signal}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(d=>{if(!abort.signal.aborted)setData(d)}).catch(e=>{if(e.name!=="AbortError")setDataError("numeric snapshot unavailable")});
   return()=>abort.abort();
 },[manifest,cipher,method]);
 useEffect(()=>{
   let map;
   try {
     map=new maplibregl.Map({...create2DMapOptions(container.current,{version:8,sources:{},layers:[]}),
       canvasContextAttributes:{contextType:"webgl2",preserveDrawingBuffer:true}});
   }catch{setMapError("WebGL2 renderer unavailable; gate failed. This window remains closable.");return;}
   const unlock=lockMapTo2D(map);
   const presentation=createMapPresentation(map,{palette:()=>({sky:scene.current.theme==="day"?"#ddd6c2":"#111d22",horizon:scene.current.theme==="day"?"#b69b62":"#254b51",graticule:scene.current.theme==="day"?"#756241":"#618d92"}),onError:setMapError});
   const relief=observeGlobeRelief(map);
   runtime.current={map,presentation};
   presentation.enter("constellation","numeric-domain",{fitFlat:m=>m.jumpTo({center:[0,12],zoom:0.4})});
   map.addControl(new maplibregl.NavigationControl({showCompass:false}),"top-left");
   map.on("render",()=>{frames.current++});
   map.on("error",e=>{if(e.sourceId==="osm")setMapError("basemap network unavailable; numeric atlas remains usable")});
   map.getCanvas().addEventListener("webglcontextlost",()=>setMapError("graphics context lost; renderer gate failed"));
   map.on("click",e=>{
     if(!map.getLayer("numeric-points"))return;
     const hit=map.queryRenderedFeatures(e.point,{layers:["numeric-points"]})[0];
     if(hit)setSelected(Number(hit.properties.value));
   });
   const report=()=>{
     const {surface,theme,selected,data}=scene.current,canvas=map.getCanvas();
     const gl=canvas.getContext("webgl2");
     if(!gl)return;
     const w=gl.drawingBufferWidth,h=gl.drawingBufferHeight;
     const pixels=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
     let nonzero=0; const colors=new Set();
     for(let i=0;i<pixels.length;i+=4*16){if(pixels[i+3])nonzero++;colors.add(pixels.slice(i,i+4).join(","))}
     const actual=map.getProjection()?.type;
     // Report after an actual rendered frame, not simply after a state setter.
     if((surface==="globe"&&actual!=="globe")||(surface==="flat"&&actual!=="mercator"))return;
     const report={surface,theme,webgl2:gl instanceof WebGL2RenderingContext,frames:frames.current,
       width:w,height:h,nonzero_pixels:nonzero,distinct_colors:colors.size,selected_value:selected,
       context_lost:gl.isContextLost(),features:data?.features.length??0};
     setGlStatus(`${report.webgl2?"WebGL2":"NOT WebGL2"} · ${surface} · ${report.distinct_colors} sampled colors`);
     invoke("renderer_report",{report}).catch(()=>setBridgeError("renderer evidence bridge unavailable"));
   };
   const id=setInterval(()=>{if(map.isStyleLoaded())map.once("render",report);map.triggerRepaint()},1500);
   return()=>{clearInterval(id);runtime.current=null;presentation.dispose();relief();unlock();map.remove()};
 },[]);
 useEffect(()=>{
   document.documentElement.dataset.theme=theme;
   const runtimeMap=runtime.current;if(!runtimeMap)return;
   const {map,presentation}=runtimeMap;
   const generation=presentation.beginStyle(theme);
   const source={type:"raster",tiles:["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],tileSize:256,
     attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'};
   map.setStyle({version:8,metadata:{[STYLE_THEME_KEY]:generation},sources:{osm:source},layers:[
     {id:"background",type:"background",paint:{"background-color":theme==="day"?"#d9d5c4":"#14252a"}},
     {id:"osm",type:"raster",source:"osm",paint:{"raster-opacity":0.8,"raster-saturation":theme==="day"?-0.7:-1,"raster-brightness-max":theme==="day"?1:0.35}}
   ]});
 },[theme]);
 useEffect(()=>{runtime.current?.presentation.setSurface(surface)},[surface]);
 useEffect(()=>{
   if(!runtime.current)return;const {map,presentation}=runtime.current;
   const add=()=>{
     if(!data)return;
     if(map.getSource("numeric"))map.getSource("numeric").setData(data);
     else map.addSource("numeric",{type:"geojson",data});
     if(!map.getLayer("numeric-points"))map.addLayer({id:"numeric-points",type:"circle",source:"numeric",paint:{"circle-radius":3,"circle-color":theme==="day"?"#be4a2a":"#efa959","circle-opacity":0.8}});
     const chosen=data.features.filter(f=>f.properties.value===selected);
     const selection={type:"FeatureCollection",features:chosen};
     if(map.getSource("selected"))map.getSource("selected").setData(selection);else map.addSource("selected",{type:"geojson",data:selection});
     if(!map.getLayer("selected-point"))map.addLayer({id:"selected-point",type:"circle",source:"selected",paint:{"circle-radius":9,"circle-color":"#f2a62d","circle-stroke-width":3,"circle-stroke-color":theme==="day"?"#17231f":"#fffbee"}});
     presentation.enter("constellation",`${cipher}:${method}`,{fitFlat:m=>m.jumpTo({center:[0,12],zoom:0.4})});
   };
   if(map.isStyleLoaded())add();map.on("style.load",add);return()=>map.off("style.load",add);
 },[data,selected,theme,cipher,method]);
 const select=(number,focus=false)=>{
   if(!data||!Number.isInteger(number)||number<1||number>2000)return;
   setSelected(number);
   if(focus){const feature=data.features.find(f=>f.properties.value===number);runtime.current?.presentation.focus(feature.geometry.coordinates,{zoom:2,duration:0})}
 };
 const reading=selectedReading(data,selected);
 const locus=reading?.locus??null,selectedKey=reading?.selectedKey??"";
 const action=(command)=>invoke(command).catch(e=>setBridgeError(String(e)));
 return <main className="gate" data-surface={surface}>
  <header className="gate-header"><div><p className="eyebrow">private desktop engineering gate · no source catalogue</p><h1>geogematria</h1></div><button onClick={()=>action("gate_close")}>Close window</button></header>
  <section className="gate-engine" aria-live="polite"><strong>Python engine · {engine.phase}</strong><span>generation {engine.generation??0} · owned PID {engine.pid??"none"}</span><button onClick={()=>action("engine_retry")}>Retry engine</button><button disabled={engine.phase!=="ready"} onClick={()=>action("engine_probe")}>Probe Python AQ 177</button><span>{engine.last_probe?`Python reply: ${engine.last_probe.result.latitude}, ${engine.last_probe.result.longitude}`:engine.error??"No source opened. No relation operations advertised."}</span></section>
  <nav className="gate-controls" aria-label="numeric atlas controls"><label>Cipher <select value={cipher} onChange={e=>setCipher(e.target.value)}>{[...new Set(manifest.map(e=>e.cipher))].map(c=><option key={c}>{c}</option>)}</select></label><label>Projection <select value={method} onChange={e=>setMethod(e.target.value)}>{methods.map(m=><option key={m}>{m}</option>)}</select></label><form onSubmit={e=>{e.preventDefault();select(Number(value),true)}}><label>Value <input aria-label="Value 1–2000" value={value} onChange={e=>setValue(e.target.value)} inputMode="numeric"/></label><button disabled={!data}>Select value</button></form><button aria-pressed={surface==="flat"} onClick={()=>setSurface("flat")}>Flat</button><button aria-pressed={surface==="globe"} onClick={()=>setSurface("globe")}>Globe</button><button onClick={()=>runtime.current?.presentation.overview()}>Whole view</button><button onClick={()=>setTheme(t=>t==="day"?"dark":"day")}>Theme · {theme==="day"?"day":"night"}</button></nav>
  <p className="gate-status" role="status">{glStatus} · {data?.features.length??0} numeric values · {method}</p>
  {(bridgeError||mapError||dataError)&&<p className="gate-error" role="alert">{bridgeError||mapError||dataError}</p>}
  <div className="gate-work"><div ref={container} className="gate-map" aria-label="MapLibre numeric atlas"/><aside className="gate-readout">{locus?<ProjectedLocusReadout locus={locus} selectedFeatureKey={selectedKey} projectionMethod={method} source="desktop numeric-only snapshot" onSelectValue={key=>{const member=locus.cliques.find(c=>c.featureKey===key);if(member)select(Number(member.details.value))}}/>:<><h2>Numeric readout</h2><p>Select an integer from 1–2000 or click a mapped point. Flat/globe and theme retain the reading.</p><p>All 24 snapshots are sanitized numeric geography. Phrase occupancy and source access are absent.</p></>}</aside></div>
  <footer>Bounded gate, not a Relations workspace. Map tiles use OpenStreetMap; basemap rendering is not fully offline. Python imports and four gazetteers are packaged; no owner DB or studies.</footer>
 </main>;
}
createRoot(document.getElementById("root")).render(<App/>);

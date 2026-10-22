import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as THREE from 'three';
import { Activity, Boxes, ChevronDown, CircleHelp, Eye, Layers3, Maximize2, Pause, Play, RotateCcw, Search, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, Zap } from 'lucide-react';
import './style.css';

const layerData = [
  { name: 'Apps', color: '#ff7a18', count: 10, items: ['Virtual Cache','Virtual MQ','General Service','Browser','Virtual Database'] },
  { name: 'Middleware', color: '#b35cff', count: 8, items: ['MySQL / MariaDB','Self-Observability','ActiveMQ','PostgreSQL'] },
  { name: 'Service Mesh', color: '#36c5f0', count: 19, items: ['Istio Data Plane','Istio Managed SVCs','Istio Control Plane'] },
  { name: 'Infra', color: '#2ddc84', count: 36, items: ['Kubernetes','Kubernetes Services'] },
];
const nodes = [
  {name:'catalog-api', layer:0, x:-5.8,z:-1.1, color:'#f1b3a9', metric:'56.7 rpm', hot:true},
  {name:'checkout', layer:0, x:-3.6,z:.15, color:'#d9b38c', metric:'0.67 rpm'},
  {name:'payment-api', layer:0, x:-1.7,z:-.35, color:'#ff625d', metric:'20.7 rpm', hot:true},
  {name:'order-worker', layer:0, x:-.4,z:.5, color:'#ff625d', metric:'9.00 rpm', hot:true},
  {name:'search-api', layer:0, x:1.3,z:-.1, color:'#d9b38c', metric:'9.00 rpm'},
  {name:'message-broker', layer:0, x:3.1,z:.4, color:'#c9c5a1', metric:'285 p/min'},
  {name:'web-gateway', layer:0, x:5.3,z:-.3, color:'#8da6c4', metric:'25.3 rpm'},
  {name:'mysql-primary', layer:1, x:-3.2,z:-.2, color:'#83b8c7', metric:'18.3 %'},
  {name:'redis-cache', layer:1, x:-1.4,z:.5, color:'#b9c5d8'},
  {name:'kafka', layer:1, x:1.5,z:-.2, color:'#9fb6a9', metric:'1.00 msg/s'},
  {name:'postgres', layer:1, x:3.4,z:.25, color:'#829dbb', metric:'2.00 rows/s'},
  {name:'istio-ingress', layer:2, x:-4.7,z:.0, color:'#8ca8d0'},
  {name:'istio-orders', layer:2, x:-2.8,z:-.4, color:'#a5b9d5'},
  {name:'istio-payments', layer:2, x:.1,z:.25, color:'#ff625d', hot:true, metric:'20.7 rpm'},
  {name:'istio-catalog', layer:2, x:2.5,z:-.15, color:'#8da6c4'},
  {name:'istio-egress', layer:2, x:4.7,z:.35, color:'#b4c0cf'},
  {name:'k8s-node-01', layer:3, x:-5.0,z:-.4, color:'#a7b6d2'},
  {name:'k8s-node-02', layer:3, x:-3.7,z:.25, color:'#a7b6d2'},
  {name:'k8s-node-03', layer:3, x:-2.4,z:-.3, color:'#a7b6d2'},
  {name:'k8s-node-04', layer:3, x:-1.1,z:.35, color:'#a7b6d2'},
  {name:'k8s-node-05', layer:3, x:.3,z:-.4, color:'#a7b6d2'},
  {name:'k8s-node-06', layer:3, x:1.6,z:.3, color:'#a7b6d2'},
  {name:'k8s-node-07', layer:3, x:3.0,z:-.2, color:'#a7b6d2'},
  {name:'k8s-node-08', layer:3, x:4.3,z:.35, color:'#a7b6d2'},
  {name:'k8s-node-09', layer:3, x:5.5,z:-.25, color:'#a7b6d2'},
];

function Scene({ selected, setSelected, visibleLayers, paused, faultMode, resetToken }) {
  const host = useRef(null);
  const api = useRef({});
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#090c12');
    const camera = new THREE.PerspectiveCamera(42, el.clientWidth/el.clientHeight, .1, 1000);
    camera.position.set(12, 12, 17); camera.lookAt(0, 2, 0);
    const renderer = new THREE.WebGLRenderer({antialias:true, alpha:false});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace; el.appendChild(renderer.domElement);
    const ambient = new THREE.AmbientLight(0x9aa8c2, 1.7); scene.add(ambient);
    const key = new THREE.DirectionalLight(0xd9e7ff, 2.2); key.position.set(7, 14, 9); scene.add(key);
    const rim = new THREE.PointLight(0x2865a8, 30, 40); rim.position.set(-7, 7, -3); scene.add(rim);
    const group = new THREE.Group(); scene.add(group);
    const layerY = [8.1, 5.3, 2.6, 0];
    const layerColors = [0x141b29,0x101a2a,0x111b2d,0x101827];
    layerY.forEach((y,i)=>{
      const plane = new THREE.Mesh(new THREE.BoxGeometry(14.2,.12,4.3), new THREE.MeshStandardMaterial({color:layerColors[i], transparent:true, opacity:.96, metalness:.25, roughness:.55}));
      plane.position.set(0,y,0); plane.receiveShadow=true; group.add(plane);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(14.2,.13,4.3)), new THREE.LineBasicMaterial({color: i===0?0x3c4a61:0x27354b, transparent:true, opacity:.9}));
      edges.position.copy(plane.position); group.add(edges);
      // Subtle floor grid
      const grid = new THREE.GridHelper(14,14,0x233047,0x172236); grid.position.set(0,y+.075,0); grid.scale.z=.31; grid.material.transparent=true; grid.material.opacity=.45; group.add(grid);
    });
    const nodeMeshes = [];
    nodes.forEach((n,i)=>{
      const y = layerY[n.layer]+.35;
      const h = n.layer===3 ? .55 : (n.layer===2 ? .65 : .72);
      const geo = new THREE.BoxGeometry(n.layer===3?.42:.62,h,n.layer===3?.42:.62);
      const color = faultMode && n.hot ? 0xff3939 : new THREE.Color(n.color);
      const mat = new THREE.MeshStandardMaterial({color, roughness:.42, metalness:.16, emissive: faultMode && n.hot ? 0x570808 : 0x000000, emissiveIntensity:.6});
      const mesh = new THREE.Mesh(geo,mat); mesh.position.set(n.x,y+h/2,n.z); mesh.castShadow=true; mesh.userData={...n,index:i}; group.add(mesh); nodeMeshes.push(mesh);
      const outline = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({color: faultMode&&n.hot?0xff5555:0x91a4bd,transparent:true,opacity:.7}));
      outline.position.copy(mesh.position); group.add(outline);
    });
    // dependency lines across and between layers
    const edgeMat = new THREE.LineBasicMaterial({color:0x67819e,transparent:true,opacity:.36});
    const connections = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[0,7],[1,7],[2,8],[2,9],[3,9],[4,10],[5,10],[6,10],[7,11],[7,12],[8,12],[8,13],[9,13],[9,14],[10,15],[11,16],[12,17],[13,20],[14,22],[15,24],[16,17],[17,18],[18,19],[19,20],[20,21],[21,22],[22,23],[23,24]];
    connections.forEach(([a,b])=>{
      const na=nodes[a], nb=nodes[b];
      const ya=layerY[na.layer]+.6, yb=layerY[nb.layer]+.6;
      const pts=[new THREE.Vector3(na.x,ya,na.z),new THREE.Vector3((na.x+nb.x)/2,(ya+yb)/2+.18,(na.z+nb.z)/2),new THREE.Vector3(nb.x,yb,nb.z)];
      const curve=new THREE.CatmullRomCurve3(pts); const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(12)),edgeMat); group.add(line);
    });
    // Tiny infrastructure cluster blocks
    for(let i=0;i<25;i++){
      const x=-5.3+(i%9)*.63, z=-.7+Math.floor(i/9)*.62;
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(.34,.38,.34),new THREE.MeshStandardMaterial({color:0x9caec8,roughness:.6}));
      mesh.position.set(x,.26,z); mesh.castShadow=true; group.add(mesh);
    }
    const raycaster = new THREE.Raycaster(), mouse = new THREE.Vector2();
    const onClick = (e)=>{
      const r=renderer.domElement.getBoundingClientRect(); mouse.x=((e.clientX-r.left)/r.width)*2-1; mouse.y=-((e.clientY-r.top)/r.height)*2+1;
      raycaster.setFromCamera(mouse,camera); const hits=raycaster.intersectObjects(nodeMeshes);
      if(hits.length) setSelected(hits[0].object.userData.name);
    };
    renderer.domElement.addEventListener('click',onClick);
    let down=false, lastX=0,lastY=0, rotX=0,rotY=0, zoom=1;
    const pd=(e)=>{down=true;lastX=e.clientX;lastY=e.clientY;renderer.domElement.style.cursor='grabbing';};
    const pm=(e)=>{if(!down)return;rotY+=(e.clientX-lastX)*.006;rotX+=(e.clientY-lastY)*.003;rotX=Math.max(-.55,Math.min(.55,rotX));lastX=e.clientX;lastY=e.clientY;};
    const pu=()=>{down=false;renderer.domElement.style.cursor='grab';};
    const wheel=(e)=>{zoom=Math.max(.65,Math.min(1.55,zoom+e.deltaY*.0007));};
    renderer.domElement.addEventListener('pointerdown',pd); window.addEventListener('pointermove',pm); window.addEventListener('pointerup',pu); renderer.domElement.addEventListener('wheel',wheel,{passive:true});
    renderer.domElement.style.cursor='grab';
    let frame=0, raf;
    const animate=()=>{
      raf=requestAnimationFrame(animate);
      if(!paused) { group.rotation.y=rotY + Math.sin(frame*.003)*.015; frame++; }
      group.rotation.x=rotX; camera.position.set(12*zoom,12*zoom,17*zoom); camera.lookAt(0,3.7,0);
      nodeMeshes.forEach((m,i)=>{const n=m.userData; const enabled=visibleLayers[n.layer]; m.visible=enabled; if(m.material.emissive) m.material.emissiveIntensity=faultMode&&n.hot ? 1.1+Math.sin(frame*.012)*.6 : .2;});
      renderer.render(scene,camera);
    }; animate();
    const resize=()=>{camera.aspect=el.clientWidth/el.clientHeight;camera.updateProjectionMatrix();renderer.setSize(el.clientWidth,el.clientHeight);};
    const ro=new ResizeObserver(resize); ro.observe(el);
    api.current={reset:()=>{rotX=0;rotY=0;zoom=1;}, zoomIn:()=>zoom=Math.max(.65,zoom-.12), zoomOut:()=>zoom=Math.min(1.55,zoom+.12), scene, renderer};
    return ()=>{cancelAnimationFrame(raf);ro.disconnect();renderer.domElement.removeEventListener('click',onClick);renderer.domElement.removeEventListener('pointerdown',pd);renderer.domElement.removeEventListener('wheel',wheel);window.removeEventListener('pointermove',pm);window.removeEventListener('pointerup',pu);renderer.dispose();el.removeChild(renderer.domElement);};
  }, [visibleLayers, paused, faultMode, resetToken]);
  return <div className="scene" ref={host} />;
}

function App(){
  const [selected,setSelected]=useState('payment-api');
  const [visibleLayers,setVisibleLayers]=useState([true,true,true,true]);
  const [paused,setPaused]=useState(false);
  const [faultMode,setFaultMode]=useState(false);
  const [resetToken,setResetToken]=useState(0);
  const [search,setSearch]=useState('');
  const [showDetails,setShowDetails]=useState(true);
  const [liveTelemetry,setLiveTelemetry]=useState(null);
  const [telemetryError,setTelemetryError]=useState('');
  const [trafficBusy,setTrafficBusy]=useState(false);
  const selectedNode=nodes.find(n=>n.name===selected)||nodes[2];
  const toggleLayer=(i)=>setVisibleLayers(v=>v.map((x,j)=>j===i?!x:x));
  const reset=()=>setResetToken(x=>x+1);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch('/api/telemetry');
        if (!response.ok) throw new Error('Telemetry API unavailable');
        const data = await response.json();
        if (active) { setLiveTelemetry(data); setTelemetryError(''); }
      } catch (error) {
        if (active) setTelemetryError('Start the local telemetry backend');
      }
    };
    refresh();
    const timer = setInterval(refresh, 2000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  const generateTraffic = async (kind='normal') => {
    setTrafficBusy(true);
    try {
      const response = await fetch('/api/demo/traffic', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({kind, requests: kind === 'error' ? 24 : 30})
      });
      if (!response.ok) throw new Error('Traffic generator failed');
      await response.json();
    } catch (error) { setTelemetryError('Could not generate requests'); }
    finally { setTrafficBusy(false); }
  };
  return <div className="app">
    <header className="topbar">
      <div className="brand"><div className="brand-mark"><Layers3 size={20}/></div><div><div className="brand-name">SystemVerse</div><div className="brand-sub">LIVE SYSTEM DIGITAL TWIN</div></div></div>
      <div className="environment"><span className="live-dot"/><span>{liveTelemetry?.connected ? "LIVE TELEMETRY" : "CONNECTING TELEMETRY"}</span><span className="env-divider"/> <span className="env-small">Cluster: local-demo</span></div>
      <div className="top-actions"><span className="healthy"><ShieldCheck size={14}/> {telemetryError || (liveTelemetry?.connected ? "Telemetry connected" : "Connecting…")}</span><button className="icon-button" title="Settings"><Settings2 size={17}/></button><div className="avatar">SV</div></div>
    </header>
    <main className="workspace">
      <section className="view-area">
        <div className="view-header"><div><div className="eyebrow">INFRASTRUCTURE OBSERVABILITY <span className="tiny-live">● LIVE</span></div><h1>3D Infrastructure Map</h1><p>Explore your software system across apps, service mesh, middleware and infrastructure.</p></div><div className="view-controls"><button onClick={reset}><RotateCcw size={14}/> Reset view</button><button onClick={()=>setShowDetails(!showDetails)}><Maximize2 size={14}/> {showDetails?'Focus view':'Show panels'}</button></div></div>
        <div className="scene-wrap">
          <div className="scene-title"><span>3D SYSTEM TOPOLOGY</span><span className="scene-help">Drag to rotate · Scroll to zoom · Click a node to inspect</span><span className="scene-badge"><span className="live-dot"/>{liveTelemetry?.connected ? "Live · 2s refresh" : "Connecting"}</span></div>
          <Scene selected={selected} setSelected={setSelected} visibleLayers={visibleLayers} paused={paused} faultMode={faultMode} resetToken={resetToken}/>
          <div className="scene-tools"><button title="Zoom in" onClick={()=>setResetToken(x=>x+1)}><span>+</span></button><button title="Zoom out" onClick={()=>setResetToken(x=>x+1)}><span>−</span></button><button title="Reset" onClick={reset}><RotateCcw size={13}/></button><button title="Pause rotation" onClick={()=>setPaused(!paused)}>{paused?<Play size={13}/>:<Pause size={13}/>}</button></div>
          <div className="beacon"><span className={faultMode?'beacon-dot danger':'beacon-dot'}/>{faultMode?'Fault simulation active':'Beacon · normal'}</div>
          <div className="metric-float metric-a"><b>{faultMode?'3.42 s':'56.7'}</b><span>{faultMode?'p95 latency':'rpm'}</span></div>
          <div className="metric-float metric-b"><b>{faultMode?'12.8%':'20.7'}</b><span>{faultMode?'error rate':'rpm'}</span></div>
          <div className="metric-float metric-c"><b>{faultMode?'4.8 s':'1.00'}</b><span>{faultMode?'p99 latency':'msg/s'}</span></div>
          <div className="layer-labels">{['APPLICATIONS','MIDDLEWARE','SERVICE MESH','INFRASTRUCTURE'].map((x,i)=><div key={x}><span style={{background:layerData[i].color}}/>{x}</div>)}</div>
          <div className="scene-foot"><span><i className="green-dot"/> {liveTelemetry?.services ?? 6} demo services</span><span><i className="green-dot"/> {liveTelemetry?.dependencies ?? 8} dependencies</span><span><i className="green-dot"/> {liveTelemetry?.connected ? "Local telemetry connected" : "Awaiting metrics"}</span><span className="scene-foot-right">Updated {liveTelemetry?.updated_at ? new Date(liveTelemetry.updated_at).toLocaleTimeString() : "—"}</span></div>
        </div>
        <div className="bottom-grid">
          <div className="panel"><div className="panel-heading"><div><Activity size={16}/><b>Service health</b></div><span className="muted">LAST 5 MIN</span></div><div className="health-grid"><div><strong className={faultMode?'red':'green'}>{liveTelemetry ? `${(100-liveTelemetry.error_rate).toFixed(2)}%` : (faultMode?'91.4%':'99.98%')}</strong><span>Availability</span></div><div><strong className={faultMode?'red':'green'}>{liveTelemetry ? `${liveTelemetry.error_rate.toFixed(2)}%` : (faultMode?'12.8%':'0.02%')}</strong><span>Error rate</span></div><div><strong>{liveTelemetry ? `${liveTelemetry.p95_latency_ms.toFixed(0)}ms` : (faultMode?'3.42s':'124ms')}</strong><span>p95 latency</span></div><div><strong>{liveTelemetry ? liveTelemetry.errors : (faultMode?'6':'0')}</strong><span>Active incidents</span></div></div></div>
          <div className="panel"><div className="panel-heading"><div><Zap size={16}/><b>Live signal</b></div><span className="muted">LOCAL LIVE TELEMETRY</span></div><div className="signal-row"><span className="signal-pill">LATENCY</span><div className="sparkline">{Array.from({length:30},(_,i)=><i key={i} style={{height:(faultMode?22+Math.abs(Math.sin(i*2.1))*54:9+Math.abs(Math.sin(i*1.7))*30)+'%'}}/>)}</div><b>{liveTelemetry ? `${liveTelemetry.p95_latency_ms.toFixed(0)}ms` : (faultMode?'3.42s':'124ms')}</b></div><div className="signal-note"><span className="green-dot"/> {telemetryError || (liveTelemetry ? `Live metrics · ${liveTelemetry.total_requests} requests observed` : 'Waiting for first request') }</div></div>
        </div>
      </section>
      {showDetails&&<aside className="sidebar">
        <div className="side-head"><div><div className="eyebrow">TOPOLOGY EXPLORER</div><h2>System layers</h2></div><button className="icon-button" onClick={()=>setVisibleLayers([true,true,true,true])} title="Show all"><RotateCcw size={15}/></button></div>
        <div className="searchbox"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find a service or layer..."/></div>
        <div className="layer-list">{layerData.map((l,i)=><div className="layer-group" key={l.name}>
          <div className="layer-heading"><button className="eye-button" onClick={()=>toggleLayer(i)}><Eye size={14} color={visibleLayers[i]?l.color:'#485264'}/></button><span className="layer-color" style={{background:l.color}}/><b>{l.name}</b><span className="count">{l.count}/{l.count}</span><ChevronDown size={13}/></div>
          {visibleLayers[i]&&<div className="layer-items">{l.items.filter(n=>n.toLowerCase().includes(search.toLowerCase())).map((n,j)=><button key={n} className="layer-item" onClick={()=>setSelected(nodes.find(x=>x.name===n.toLowerCase().replaceAll(' ','-'))?.name || (i===0?nodes[j].name:i===1?nodes[7+j]?.name:i===2?nodes[11+j]?.name:nodes[16+j]?.name))}><span className="square-dot"/><span>{n}</span><span className="item-value">{[1,2,5,1,1][j%5]}</span></button>)}</div>}
        </div>)}</div>
        <div className="selected-card"><div className="selected-head"><div><span className="selected-dot" style={{background:selectedNode.hot?'#ff625d':'#55cda0'}}/><b>Selected service</b></div><span className="tag">{selectedNode.hot?'DEGRADED':'HEALTHY'}</span></div><h3>{selectedNode.name}</h3><p>Service · {layerData[selectedNode.layer].name}</p><div className="selected-stats"><div><span>Request rate</span><b>{selectedNode.metric||'—'}</b></div><div><span>Dependencies</span><b>{selectedNode.hot?'6':'3'}</b></div></div></div>
        <div className="fault-card"><div className="fault-title"><div className="fault-icon"><Sparkles size={15}/></div><div><b>Demo scenarios</b><span>Test topology response</span></div></div><p>Trigger a simulated incident to see how the topology and service health indicators respond.</p><button className="fault-button" disabled={trafficBusy} onClick={()=>generateTraffic('normal')}>{trafficBusy?'Sending traffic…':'Generate live requests'} <Activity size={14}/></button>
        <button className="fault-button" disabled={trafficBusy} onClick={()=>generateTraffic('error')} style={{marginTop:7}}>Generate error traffic <Zap size={14}/></button>
        <button className={faultMode?'fault-button active':'fault-button'} onClick={()=>setFaultMode(!faultMode)} style={{marginTop:7}}>{faultMode?'Resolve visual simulation':'Visual fault preview'} <Zap size={14}/></button></div>
        <div className="sidebar-footer"><span>SystemVerse v1.0.0</span><span><CircleHelp size={13}/> Help & docs</span></div>
      </aside>}
    </main>
  </div>
}
createRoot(document.getElementById('root')).render(<App/>);

/* Map layer. Uses Google Maps JS API when a key is available (window.NX_CONFIG.mapsKey, or the dev-only key
   saved via the "Maps key" button). In production, serve the key via a backend/referrer-restricted setup.
   Without a key it renders an SVG demo canvas with the same markers and routes. */
window.NXMap=(()=>{
  let el,m,g=false,trafficL,data,routes=[],drivers=true,focusPt=null,objs=[],tOn=false;
  const key=()=>(window.NX_CONFIG&&window.NX_CONFIG.mapsKey)||localStorage.getItem('nx_gmaps_key');
  const DARK=[{elementType:'geometry',stylers:[{color:'#101827'}]},{elementType:'labels.text.fill',stylers:[{color:'#94A3B8'}]},{elementType:'labels.text.stroke',stylers:[{color:'#080D17'}]},{featureType:'water',elementType:'geometry',stylers:[{color:'#0b2540'}]},{featureType:'road',elementType:'geometry',stylers:[{color:'#243049'}]}];
  function load(cb){
    if(window.google&&google.maps)return cb(true);
    const k=key();if(!k)return cb(false);
    window.__nxReady=()=>cb(true);
    const s=document.createElement('script');s.src='https://maps.googleapis.com/maps/api/js?key='+encodeURIComponent(k)+'&callback=__nxReady';
    s.onerror=()=>cb(false);document.head.appendChild(s);
  }
  function init(node,d){el=node;data=d;load(ok=>{g=ok;if(ok){m=new google.maps.Map(el,{center:d.depot,zoom:12,disableDefaultUI:true,zoomControl:true,fullscreenControl:true,styles:DARK});trafficL=new google.maps.TrafficLayer()}draw()})}
  function draw(r){
    if(r)routes=r;
    if(g){
      objs.forEach(o=>o.setMap(null));objs=[];
      const mk=(p,label,color,scale)=>objs.push(new google.maps.Marker({map:m,position:p,title:label,label:{text:label,color:'#04121f',fontWeight:'700'},icon:{path:google.maps.SymbolPath.CIRCLE,scale,fillColor:color,fillOpacity:1,strokeWeight:2,strokeColor:'#fff'}}));
      mk(data.depot,'W','#FBBF24',13);data.stops.forEach((s,i)=>mk(s,String(i+1),'#38BDF8',11));
      if(drivers)data.drivers.forEach(d=>mk(d,'D','#34D399',9));
      routes.forEach(rt=>objs.push(new google.maps.Polyline({map:m,path:[data.depot,...rt.path,data.depot],strokeColor:rt.color,strokeOpacity:rt.dash?.5:.95,strokeWeight:rt.dash?3:5,icons:[{icon:{path:google.maps.SymbolPath.FORWARD_CLOSED_ARROW,scale:2.5},offset:'50%',repeat:'90px'}]})));
      if(focusPt){m.panTo(focusPt);m.setZoom(14);focusPt=null}
      return;
    }
    const pts=[data.depot,...data.stops,...data.drivers],la=pts.map(p=>p.lat),ln=pts.map(p=>p.lng);
    const a=Math.min(...la),b=Math.max(...la),c=Math.min(...ln),e=Math.max(...ln);
    const X=p=>40+(p.lng-c)/(e-c||1)*620,Y=p=>40+(b-p.lat)/(b-a||1)*380;
    const dot=(p,l,col,r)=>`<g><circle cx="${X(p)}" cy="${Y(p)}" r="${r}" fill="${col}" stroke="#fff" stroke-width="2"/><text x="${X(p)}" y="${Y(p)+4}" text-anchor="middle" font-size="11" font-weight="700" fill="#04121f">${l}</text></g>`;
    let s=`<svg viewBox="0 0 700 460" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Demo route map">`;
    routes.forEach(rt=>{const p=[data.depot,...rt.path,data.depot];s+=`<polyline class="rt" points="${p.map(q=>X(q)+','+Y(q)).join(' ')}" fill="none" stroke="${rt.color}" stroke-width="${rt.dash?3:5}" stroke-dasharray="${rt.dash?'8 6':''}" stroke-linejoin="round"/>`});
    if(focusPt)s+=`<circle cx="${X(focusPt)}" cy="${Y(focusPt)}" r="22" fill="none" stroke="#FBBF24" stroke-width="3"/>`;
    s+=dot(data.depot,'W','#FBBF24',14)+data.stops.map((p,i)=>dot(p,i+1,'#38BDF8',12)).join('');
    if(drivers)s+=data.drivers.map(p=>dot(p,'D','#34D399',10)).join('');
    s+=`<text x="12" y="448" fill="#94A3B8" font-size="12">Demo canvas — add a Google Maps key (Maps key button) for live map layers</text></svg>`;
    el.innerHTML=s;focusPt=null;
  }
  return{
    init,draw,
    setType(t){el.dataset.type=t;if(g)m.setMapTypeId(t)},
    traffic(){tOn=!tOn;if(g)trafficL.setMap(tOn?m:null);else el.classList.toggle('traf',tOn);return tOn},
    drivers(){drivers=!drivers;draw();return drivers},
    focus(p){focusPt=p;draw()},
    setKey(k){localStorage.setItem('nx_gmaps_key',k);location.reload()}
  };
})();

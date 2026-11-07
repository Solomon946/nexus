/* DEMO optimizer: greedy nearest-neighbour (high-priority stops weighted) + 2-opt on straight-line distance.
   It ignores live traffic, time windows, capacity and weather. Replace compare() with a backend call
   (e.g. Google Route Optimization API) when ready: same input/output shape. */
window.NXOpt=(()=>{
  const R=6371,rad=d=>d*Math.PI/180;
  const dist=(a,b)=>{const p=rad(b.lat-a.lat),q=rad(b.lng-a.lng),x=Math.sin(p/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(q/2)**2;return 2*R*Math.asin(Math.sqrt(x))};
  const total=(d,p)=>{let t=0,c=d;for(const s of p){t+=dist(c,s);c=s}return p.length?t+dist(c,d):0};
  function optimize(depot,stops){
    let left=[...stops],cur=depot,path=[];
    while(left.length){let bi=0,bs=Infinity;left.forEach((s,i)=>{const sc=dist(cur,s)*(s.prio==='High'?.6:1);if(sc<bs){bs=sc;bi=i}});cur=left.splice(bi,1)[0];path.push(cur)}
    for(let better=true;better;){better=false;
      for(let i=0;i<path.length-1;i++)for(let j=i+1;j<path.length;j++){
        const n=[...path.slice(0,i),...path.slice(i,j+1).reverse(),...path.slice(j+1)];
        if(total(depot,n)<total(depot,path)-1e-9){path=n;better=true}}}
    return path;
  }
  function compare(depot,orig){
    let opt=optimize(depot,orig);const a=total(depot,orig);let b=total(depot,opt);
    if(b>=a){opt=orig;b=a}
    const km=a-b;return{opt,origKm:a,optKm:b,km,min:km/30*60,fuel:km*.11,cost:km*.11*1.6};
  }
  return{dist,total,optimize,compare};
})();

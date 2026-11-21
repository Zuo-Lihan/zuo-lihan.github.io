// (azimuth, amplitude, wavelength, phase), in world units.
const swells = [
  [.31, .087, 5.9, .8], [-.71, .058, 3.7, 4.2], [1.08, .031, 2.35, 2.1],
  [-1.15, .023, 1.5, 1.9], [.48, .018, .91, 5.2], [-.25, .011, .54, .7]
].map(([angle, amplitude, length, phase]) => {
  const k = 2 * Math.PI / length;
  return [Math.sin(angle) * k, Math.cos(angle) * k, amplitude, phase, Math.sqrt(9.81 * k)];
});
const RIPPLE_COUNT = 12;
const LIMIT = .30;
const LENS = .13;
const FOV = .48;
// World-space light direction, shared by the optical pass and the coastal models.
export const SUN = [.15,.061,.987];
const NEAR = .05, FAR = 160;
const HUT = [-.72, 4.21], BOAT = [2.24, 2.65];
const GRID = 120, FIELD = 24, FIELD_X = -6, FIELD_Z = -7;
const FISH_GROUPS = 3, FISH_GROUP_SIZE = 10, SHOAL = FISH_GROUPS*FISH_GROUP_SIZE;
const TRACK_X = -8, TRACK_Z = -4.5, TRACK_SIZE = 9;
const OUTCROPS = [
  [3,5.6,1.45,1.32,.62], [4.5,1.8,1.24,.88,.37], [5.6,-2.25,2.08,1.37,.86],
  [.3,-1.75,1.18,.91,.4], [6.06,8.3,2.03,1.64,.39], [9.05,6.7,1.76,1.87,.48]
];
function shoreX(z) {
  return -2.4+.52*z+Math.sin(.4*z+.7)*1.28+Math.cos(z*.78)*.41;
}
function bedOnLand([x,z]) {
  return x-shoreX(z)<-.18;
}
const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
function smooth(low, high, value) {
  const t = clamp((value - low) / (high - low));
  return t * t * (3 - 2 * t);
}
// R: limestone height, G: exposed stone, B: sand channel, A: light reaching the bed.
// Physics and the optical pass bilinearly sample the same world-space relief.
const lagoonBounds={x:2,z:2,w:10,h:13,nx:256,nz:320};
const banks=[
  [4.39,4.37,1.04,.59,-.35,.42], [4.86,4.56,.54,.40,.62,.28],
  [4.56,5.08,.66,.35,.25,.27], [5.03,4.13,.31,.22,.2,.17],
  [4.96,5.23,.29,.15,-.47,.105], [4.12,5.65,.40,.24,-.2,.17],
  [6.63,6.85,.74,.47,-.64,.43], [7.17,7.22,.78,.52,.13,.48],
  [7.52,6.80,.40,.27,.36,.22], [6.39,6.38,.34,.21,-.21,.19],
  [8.37,9.6,.96,.61,.63,.53], [9.02,10.1,1.28,.59,-.34,.69]
];
const clip=x=>Math.max(0,Math.min(1,x));
const ease=x=>(x=clip(x),x*x*(3-2*x));
let tile;
function lagoonTile(){
  if(tile)return tile;
  const {x,z,w,h,nx,nz}=lagoonBounds,dx=w/nx,dz=h/nz;
  const data=new Uint8Array(nx*nz*4);
  for(let j=0;j<nz;j++){
    const wz=z+(j+.5)*dz,c=5.26+.41*(wz-4.8)+.32*Math.sin(.95*(wz-4.9));
    for(let i=0;i<nx;i++){
      const wx=x+(i+.5)*dx,k=4*(j*nx+i);
      const edge=ease((wz-z)/1.35)*ease((z+h-wz)/1.5)*ease((x+w-wx)/1.5);
      data[k+2]=Math.round(255*edge*ease((1.34-Math.abs(wx-c))/.96));
      data[k+3]=255;
    }
  }
  banks.forEach(([cx,cz,rx,rz,angle,rise],id)=>{
    const ca=Math.cos(angle),sa=Math.sin(angle),range=1.32*Math.max(rx,rz);
    for(let j=Math.max(0,Math.floor((cz-range-z)/dz));j<Math.min(nz,(cz+range-z)/dz);j++)
      for(let i=Math.max(0,Math.floor((cx-range-x)/dx));i<Math.min(nx,(cx+range-x)/dx);i++){
        const xx=x+(i+.5)*dx-cx,zz=z+(j+.5)*dz-cz;
        const u=(ca*xx+sa*zz)/rx,v=(ca*zz-sa*xx)/rz;
        const radius=Math.hypot(u,v),a=Math.atan2(v,u);
        const r=radius*(1+.082*Math.sin(a*3+id)+.057*Math.cos(a*5-id)+.031*Math.sin(a*9+.8));
        if(r>1.15)continue;
        const crack=.054*Math.exp(-((u+.28*v+.08*Math.sin(v*9)-.31)**2)/.0014);
        const rough=.023*Math.sin(u*16+v*3)*Math.cos(v*13-u*2)+.014*Math.cos(u*29+v*18);
        const f=(.82+.11*u+.07*v+rough-crack)*ease((1.09-r)/.37)+.12*ease((1.14-r)/.36);
        const k=4*(j*nx+i);
        data[k]=Math.max(data[k],Math.round(255*clip(f*rise)));
        data[k+1]=Math.max(data[k+1],Math.round(255*ease((1.07-r+rough)/.15)));
      }
  });
  for(let j=0;j<nz-18;j++)for(let i=0;i<nx-8;i++){
    const k=4*(j*nx+i);
    let shade=0;
    for(const d of [2,5,9,17]){
      const sample=k+4*(d*nx+Math.round(d*.35));
      shade=Math.max(shade,(data[sample]-data[k])/255-d*dz*.31);
    }
    data[k+3]=Math.round(255*(1-.53*ease(shade/.22)));
  }
  tile=data;return data;
}
function lagoonRelief(x,z){
  const b=lagoonBounds;
  if(x<=b.x || z<=b.z || x>=b.x+b.w || z>=b.z+b.h)return 0;
  const data=lagoonTile(),u=(x-b.x)*b.nx/b.w-.5,v=(z-b.z)*b.nz/b.h-.5;
  const i=Math.max(0,Math.min(b.nx-2,Math.floor(u))),j=Math.max(0,Math.min(b.nz-2,Math.floor(v)));
  const f=clip(u-i),g=clip(v-j),a=4*(j*b.nx+i),c=a+4*b.nx;
  const elev=k=>data[k]-.59*data[k+2];
  return ((1-g)*((1-f)*elev(a)+f*elev(a+4))+g*((1-f)*elev(c)+f*elev(c+4)))/255;
}
export {lagoonBounds,lagoonTile};
export function reefPasses(random=Math.random){
  let phase=1.62,quiet=0,clock=0,start=1.6+random()*2,span=10,side=1,roaming=4;
  return (dt,ray)=>{
    clock+=dt;
    if(quiet>0){quiet-=dt;phase+=dt*.026;}
    else phase+=dt*.33;
    if(phase>=2*Math.PI){phase-=2*Math.PI;quiet=5+12*random();}
    const a=phase,rx=4.3,rz=2.02;
    ray.set(12.65+rx*Math.cos(a),-1.17+.12*Math.sin(a+.32),8.92+rz*Math.sin(a),
      Math.atan2(-rx*Math.sin(a),rz*Math.cos(a)));
    let t=clamp((clock-start)/span);
    if(t===1){start=clock+4+9*random();span=9+4*random();side=random()>.45 ? 1 : -1;roaming=3+Math.floor(random()*3);t=0;}
    return {travel:Math.sin(t*Math.PI)**2,bend:Math.sin(t*2*Math.PI)*Math.sin(t*Math.PI)**2,side,roaming,clock};
  };
}
function seabed(x,z) {
  const d=x-shoreX(z);
  let rock=0;
  for(const [cx,cz,rx,rz,h] of OUTCROPS)
    rock+=h*(1-smooth(.08,1,((x-cx)/rx)**2+((z-cz)/rz)**2));
  return clamp(-.27*d-5.5*smooth(.8,12.5,d),-9,.88)
    +(1-smooth(-8.5,-1.1,d))*(.39*Math.sin(x*.48-z*.26)*Math.sin(z*.28+.6)-.045)
    +rock*smooth(1.25,3,d)+lagoonRelief(x,z)
    -1.58*smooth(5.4,8.3,z)*(1-smooth(14,18,z))*smooth(.65,2.75,d);
}

// Reserve the swept wings and tail, not just the point at the centre of the ray.
const mantleProbes=[[0,0],[-1,-.18],[1,-.18],[-.55,.25],[.55,.25],[0,.55],[0,-.78],[0,-1.45]];
function mantaPatrol() {
  const lanes=[{},{}];
  function point(lane,a,out) {
    const {cx,cz,rx,rz}=lane;
    return out.set(cx+rx*Math.sin(a),-.81+.052*Math.sin(2*a),cz+rz*Math.cos(a),
      Math.atan2(rx*Math.cos(a),-rz*Math.sin(a)));
  }
  function fit(lane,i,narrow,out) {
    lane.narrow=narrow;
    lane.scale=i ? .86-.25*narrow : .94-.24*narrow;
    lane.rx=(i ? .69 : .63)*(1-.40*narrow);
    lane.rz=i ? .66 : .53;
    lane.cx=i ? 5.60-3.54*narrow : 4.33-2.43*narrow;
    lane.cz=i ? -2.16-2.36*narrow : .89-2.42*narrow;
    // Fit the entire loop once. Per-frame position projection used to cancel
    // forward speed at the ends of turns and make the ray hang in place.
    for(let pass=0;pass<70;pass++,lane.cx+=.065){
      let clear=true;
      for(let k=0;k<56 && clear;k++){
        point(lane,2*Math.PI*k/56,out);
        const sn=Math.sin(out.w),cs=Math.cos(out.w);
        for(const [side,forward] of mantleProbes){
          const x=out.x+lane.scale*(cs*side+sn*forward),z=out.z+lane.scale*(-sn*side+cs*forward);
          const y=seabed(x,z)+.61+.34*lane.scale+.14;
          const boatDistance=Math.hypot(x-BOAT[0],Math.max(0,Math.abs(z-BOAT[1])-.98));
          if(y>out.y || boatDistance<.90){clear=false;break;}
        }
      }
      if(clear)break;
    }
  }
  return (i,time,aspect,out)=>{
    const lane=lanes[i],narrow=1-smooth(.58,1.30,aspect);
    if(lane.narrow!==narrow)fit(lane,i,narrow,out);
    point(lane,time*(i ? .24 : .23)+(i ? .86 : 0.),out);
    return lane.scale;
  };
}
function height(x, z, t) {
  let h = 0;
  for (const [kx, kz, a, phase, w] of swells) {
    const s = Math.sin(x * kx + z * kz + phase - t * w);
    h += a * (s + .28 * (s * s - .5));
  }
  return h;
}

function lensRay(u, v, aspect, pitch, yaw=0) {
  const y = v * FOV;
  const x = u * FOV * aspect;
  const ry = y * Math.cos(pitch) + Math.sin(pitch);
  const rz = Math.cos(pitch) - y * Math.sin(pitch);
  const n = Math.hypot(x, ry, rz);
  return [(x*Math.cos(yaw)+rz*Math.sin(yaw))/n,ry/n,(rz*Math.cos(yaw)-x*Math.sin(yaw))/n];
}
function pickWater(ray, eye, time) {
  const [dx, dy, dz] = ray;
  const [x, y, z] = eye;
  let t = LENS;
  const side = Math.sign(y + dy * t - height(x + dx * t, z + dz * t, time)) || 1;
  if (Math.abs(y) > LIMIT && y * dy >= 0) return null;
  if (Math.abs(y) > LIMIT) t = Math.max(t, (Math.sign(y) * LIMIT - y) / dy);
  for (let i = 0; i < 40 && t < 32; i++) {
    const px = x + dx * t, pz = z + dz * t;
    const gap = y + dy * t - height(px, pz, time);
    if (side * gap < .009) return [px, pz];
    if (Math.abs(y + dy * t) > LIMIT + .02 && side * dy > 0) break;
    t += Math.max(.022, Math.abs(gap) * 1.03 / (.62 + Math.abs(dy)));
  }
  return null;
}

// Centered difference solution of h_tt + damping*h_t = c^2 * Laplacian(h).
// The grid uses a fixed step below the 2D Courant limit.
function rippleField(THREE) {
  let current = new Float32Array(GRID*GRID);
  let previous = new Float32Array(current.length);
  const pixels = new Uint8Array(current.length*4);
  pixels.fill(128);
  const loss = new Float32Array(current.length);
  const stepSize = FIELD/GRID;
  const rate = 1/60;
  const c2 = (2.4*rate/stepSize)**2;
  const texture = new THREE.DataTexture(pixels,GRID,GRID);
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  let accumulator = 0, until = -1;
  for (let y=0;y<GRID;y++) for (let x=0;x<GRID;x++) {
    const edge = Math.min(x,y,GRID-1-x,GRID-1-y);
    const sand = bedOnLand([FIELD_X+(x+.5)*stepSize,FIELD_Z+(y+.5)*stepSize]);
    loss[y*GRID+x] = .992 - .24*(1-smooth(1,8,edge)) - (sand ? .21 : 0);
  }
  function splash(x,z,strength,time) {
    const u=(x-FIELD_X)/stepSize-.5, v=(z-FIELD_Z)/stepSize-.5;
    const cx=Math.round(u), cy=Math.round(v);
    if (cx<4 || cx>=GRID-4 || cy<4 || cy>=GRID-4) return false;
    for(let j=-3;j<=3;j++) for(let i=-3;i<=3;i++) {
      const d=(cx+i-u)**2+(cy+j-v)**2;
      current[(cy+j)*GRID+cx+i] += strength*.22*Math.exp(-d*.54);
    }
    until = time+4.4;
    return true;
  }
  function advance(delta,time) {
    if (time>until) return;
    accumulator += Math.min(delta,.048);
    if (accumulator<rate) return;
    while (accumulator>=rate) {
      accumulator -= rate;
      for (let y=1;y<GRID-1;y++) for (let x=1;x<GRID-1;x++) {
        const i=y*GRID+x, h=current[i];
        previous[i]=h+(h-previous[i])*loss[i]+c2*(current[i-1]+current[i+1]+current[i-GRID]+current[i+GRID]-4*h);
      }
      [previous,current]=[current,previous];
    }
    for (let y=1;y<GRID-1;y++) for (let x=1;x<GRID-1;x++) {
      const i=y*GRID+x, off=i*4;
      pixels[off]=clamp(Math.round(128+current[i]*1370),0,255);
      pixels[off+1]=clamp(Math.round(128+(current[i+1]-current[i-1])*1450),0,255);
      pixels[off+2]=clamp(Math.round(128+(current[i+GRID]-current[i-GRID])*1450),0,255);
    }
    texture.needsUpdate = true;
  }
  return {texture,splash,advance};
}

function shoaling(THREE) {
  const groups=[[3.75,3.38,-.64],[9.63,9.22,-3.18],[7.08,-2.45,-.93]];
  const fish = Array.from({length:SHOAL},(_,i) => {
    const group=Math.floor(i/FISH_GROUP_SIZE);
    const angle=i*2.399;
    const r=.24+(i%10)*.114;
    const [x,z,y]=groups[group];
    return {
      group,
      position:new THREE.Vector3(x+Math.cos(angle)*r,y,z+Math.sin(angle)*r),
      velocity:new THREE.Vector3(.40*Math.cos(angle),0,.40*Math.sin(angle)),
      facing:new THREE.Vector2(Math.cos(angle),Math.sin(angle)),
      size:.133+((i*17)%13)*.008,
      hiddenUntil: -1
    };
  });
  const models=fish.map(f=>new THREE.Vector4(...f.position.toArray(),f.size));
  const directions=fish.map(f=>f.facing);
  const accel=new THREE.Vector3();
  function update(delta,time,disturbance,bait,baitWeight) {
    if (delta<=0) return;
    for (let i=0;i<fish.length;i++) {
      const f=fish[i], p=f.position, v=f.velocity, g=f.group;
      const phase=time*(.32-g*.033)+g*2.5+i*.39;
      const [gx,gz,gy]=groups[g];
      const x=gx+Math.cos(phase)*(.52+(i%4)*.28);
      const z=gz+Math.sin(phase)*(.57+(i%5)*.17);
      const baitPull=baitWeight*(g===0 ? .90 : g===1 ? .18 : .035);
      const orbit=.40+(i%5)*.12;
      const bx=bait.x+Math.cos(phase*1.65)*orbit, bz=bait.y+Math.sin(phase*1.65)*orbit;
      const y=gy+.15*Math.sin(phase*1.39+i);
      accel.set((x+(bx-x)*baitPull-p.x)*.76, (y+(-.30-y)*baitPull-p.y)*1.7, (z+(bz-z)*baitPull-p.z)*.76);
      for(let j=0;j<fish.length;j++){
        if(j===i || fish[j].group!==g) continue;
        const other=fish[j].position;
        const dx=p.x-other.x, dy=p.y-other.y, dz=p.z-other.z;
        const d=Math.hypot(dx,dy,dz);
        if(d>.65 || d<.001) continue;
        const push=(.65-d)*.96/d;
        accel.x+=dx*push;accel.y+=dy*push*.28;accel.z+=dz*push;
      }
      const dx=p.x-disturbance.x,dz=p.z-disturbance.y;
      const dist=Math.hypot(dx,dz);
      const dodge=(1-smooth(.16,1.79,dist))*Math.exp(-Math.max(0,time-disturbance.z)*1.9);
      accel.x += dx/Math.max(dist,.10) * dodge*4.1;
      accel.z += dz/Math.max(dist,.10) * dodge*4.1;
      accel.y -= dodge*.83;
      v.multiplyScalar(Math.exp(-delta*(.92+dodge*.09))).addScaledVector(accel,delta);
      if(v.lengthSq()>3.55) v.setLength(1.88);
      p.addScaledVector(v,delta);
      p.y=clamp(p.y,-3.3,-.22);
      if(Math.hypot(v.x,v.z)>.085){
        const speed=Math.hypot(v.x,v.z), blend=1-Math.exp(-delta*(3.8+dodge*4));
        f.facing.set(f.facing.x+(v.x/speed-f.facing.x)*blend,f.facing.y+(v.z/speed-f.facing.y)*blend).normalize();
      }
      models[i].set(p.x,p.y,p.z,time<f.hiddenUntil ? 0 : f.size);
    }
  }
  function nearRay(origin,ray) {
    let nearest=.105, point;
    for(let i=0;i<fish.length;i++){
      if(models[i].w===0) continue;
      const p=models[i];
      const x=p.x-origin.x,y=p.y-origin.y,z=p.z-origin.z, t=x*ray[0]+y*ray[1]+z*ray[2];
      if(t<.1 || t>25) continue;
      const d=Math.hypot(x-t*ray[0],y-t*ray[1],z-t*ray[2])/Math.max(2,t);
      if(d<nearest){nearest=d;point=[p.x,p.z];}
    }
    return point;
  }
  function catchNear(x,z,time) {
    let closest=2.5, prey;
    for(const [i,candidate] of fish.entries()){
      if(candidate.hiddenUntil>time || models[i].y<-.93) continue;
      const d=Math.hypot(models[i].x-x,models[i].z-z);
      if(d<closest){prey=candidate;closest=d;}
    }
    if(!prey) return false;
    prey.hiddenUntil=time+15;
    return true;
  }
  return {models,directions,update,nearRay,catchNear};
}

function turtleCoast(THREE) {
  const size=320, step=TRACK_SIZE/size;
  const pixels=new Uint8Array(size*size*2);
  const texture=new THREE.DataTexture(pixels,size,size,THREE.RGFormat);
  texture.magFilter=texture.minFilter=THREE.LinearFilter;
  texture.needsUpdate=true;
  const active=new Set(), touched=new Float32Array(size*size);
  const turtles=[0,1].map(i=>({
    x:0,z:0,y:0,heading:0,crawl:0,phase:0,stampX:Infinity,stampZ:0,
    length:i ? .86 : 1.16, feet:Array.from({length:4},()=>new THREE.Vector4())
  }));
  function stamp(x,z,yaw,wide,long,force,time) {
    if(x-shoreX(z)>.14)return;
    const px=(x-TRACK_X)/step-.5,pz=(z-TRACK_Z)/step-.5;
    const range=Math.ceil(1.45*Math.max(wide,long)/step);
    const ix=Math.round(px),iz=Math.round(pz);
    const sy=Math.sin(yaw),cy=Math.cos(yaw);
    for(let j=Math.max(0,iz-range);j<=Math.min(size-1,iz+range);j++)
      for(let i=Math.max(0,ix-range);i<=Math.min(size-1,ix+range);i++){
        const dx=(i-px)*step,dz=(j-pz)*step;
        const u=(dx*cy-dz*sy)/wide,v=(dx*sy+dz*cy)/long;
        const r=Math.hypot(u+.22*v*v,v);
        if(r>1.39)continue;
        const k=j*size+i;
        const trench=force*(1-smooth(.15,1,r));
        const berm=force*.58*(1-smooth(.02,.31,Math.abs(r-1.02)))*(.64+.31*clamp(-v,-1,1));
        pixels[k*2]=Math.max(pixels[k*2],Math.round(255*trench));
        pixels[k*2+1]=trench>.25 ? 0 : Math.max(pixels[k*2+1],Math.round(255*berm));
        touched[k]=time;
        active.add(k);
      }
  }
  function pose(t,j,time) {
    // Bend along the surf, linger between strokes and return by a different arc.
    const path=now=>{
      const u=now*(j ? .081 : .111)-(j ? 1.91 : .96);
      const a=u+.19*Math.sin(u*2.72+j)+.07*Math.sin(now*.59+j);
      const lane=(j ? -2.48 : 1.18)+.67*Math.cos(a)+.33*Math.sin(.7*a+j)
        +.29*Math.cos(now*.208+j)+.12*Math.sin(now*.39+j*2);
      const d=.19-1.83*Math.sin(a)-.20*Math.sin(1.7*a+j);
      return [shoreX(lane)+d,lane,d];
    };
    const [x,z,d]=path(time),[nx,nz]=path(time+.07);
    const dx=nx-x,laneSpeed=nz-z;
    const crawl=1-smooth(-.18,.57,d), s=t.length;
    t.x=x;t.z=z;t.heading=Math.atan2(dx,laneSpeed);t.crawl=crawl;
    t.phase=time*(j ? 2.20 : 2.44)+.42*Math.sin(time*.58+j)+j*1.8;
    t.y=Math.max(-.48,seabed(x,z)+(.076+.14*(1-crawl))*s)+.009*crawl*Math.cos(t.phase*2);
    const sy=Math.sin(t.heading),cy=Math.cos(t.heading);
    const gx=(seabed(x+.06,z)-seabed(x-.06,z))/.12*crawl;
    const gz=(seabed(x,z+.06)-seabed(x,z-.06))/.12*crawl;
    t.crossSlope=gx*cy-gz*sy;t.forwardSlope=gx*sy+gz*cy;
    if(crawl>.35 && Math.hypot(x-t.stampX,z-t.stampZ)>.035){
      stamp(x-sy*.16*s,z-cy*.16*s,t.heading,.133*s,.18*s,.58*crawl,time);
      t.stampX=x;t.stampZ=z;
    }
    for(let k=0;k<4;k++){
      const side=k%2 ? 1 : -1, front=k<2;
      const phase=t.phase+(k%2)*Math.PI+(front ? 0 : Math.PI-.37);
      const push=Math.sin(phase), lift=Math.max(0,Math.cos(phase));
      const reach=front ? .495 : .253, sweep=front ? .185 : .083;
      const fx=side*(reach-.075*push*push),fz=(front ? .025 : -.239)+sweep*push;
      let fy=-.084+.12*lift*crawl+.115*Math.cos(phase)*(1-crawl);
      const wx=x+s*(fx*cy+fz*sy),wz=z+s*(-fx*sy+fz*cy);
      // Do not swing through the sloping bottom in ankle-deep water.
      const contactY=(seabed(wx,wz)-t.y)/s-fx*t.crossSlope-fz*t.forwardSlope;
      fy=Math.max(fy,contactY+.021-.035*crawl);
      t.feet[k].set(fx,fy,fz,side);
      if(crawl<.38 || lift>.18)continue;
      if(t.y+s*(fy+fx*t.crossSlope+fz*t.forwardSlope)>seabed(wx,wz)+.052)continue;
      stamp(wx,wz,t.heading+side*(front ? .87 : .51),s*(front ? .058 : .044),
        s*(front ? .138 : .079),(front ? .96 : .65)*crawl,time);
    }
  }
  let lastUpload=-Infinity;
  function update(dt,time) {
    for(let j=0;j<turtles.length;j++)pose(turtles[j],j,time);
    if(time-lastUpload<.066)return;
    lastUpload=time;
    for(const k of active){
      const age=time-touched[k];
      const z=TRACK_Z+(Math.floor(k/size)+.5)*step;
      const d=TRACK_X+(k%size+.5)*step-shoreX(z);
      // Wet sand slumps on a passing crest; dry sand retains the print for over a minute.
      const hold=1.1+80*(1-smooth(-.86,.04,d));
      if(age<hold)continue;
      const off=k*2,wear=d>-.43 ? 4 : 1;
      pixels[off]=Math.max(0,pixels[off]-wear);
      pixels[off+1]=Math.max(0,pixels[off+1]-wear);
      if(!pixels[off]&&!pixels[off+1])active.delete(k);
    }
    texture.needsUpdate=true;
  }
  update(0,0);
  return {turtles,texture,update};
}

function seabirdFlight(THREE,count) {
  const floorHeight=i=>3.23+i*.40;
  const roam=(i,time,out)=>{
    const a=time*(.162-i*.016)+i*1.62+.74;
    return out.set(3.36+i*.76+Math.sin(a)*(4.0+i*.57),
      floorHeight(i)+.48+.29*Math.sin(a*1.65+i*.57),
      9.6+i*1.92+Math.cos(a)*(4.54+i*.67));
  };
  const birds=Array.from({length:count},(_,i)=>{
    const position=roam(i,0,new THREE.Vector3());
    const next=roam(i,.15,new THREE.Vector3());
    return {position,heading:Math.atan2(next.x-position.x,next.z-position.z),bank:0,pitch:0,speed:1.28,vertical:0};
  });
  const skyTarget=new THREE.Vector3(), home=new THREE.Vector3(), target=new THREE.Vector3();
  const lookAhead=new THREE.Vector3(), routePoint=new THREE.Vector3();
  let lastMove=-100;
  let steer=0;
  let mission=null, cue=null;
  function aim(origin,ray,time) {
    const reach=clamp((4.28-origin.y)/Math.max(.045,ray[1]),11,28);
    const x=clamp(origin.x+ray[0]*reach,-8.4,17.5);
    const y=clamp(origin.y+ray[1]*reach,3.62,8.0);
    const z=clamp(origin.z+ray[2]*reach,5.5,26.5);
    if (skyTarget.distanceToSquared(target.set(x,y,z))>.011) {
      skyTarget.copy(target);
      lastMove=time;
    }
  }
  function release() {lastMove=-100;}
  function encounter(kind,x,z,time) {
    if(mission) return false;
    let index=0, score=Infinity;
    birds.forEach((bird,i)=>{
      const dx=x-bird.position.x, dz=z-bird.position.z;
      const ahead=Math.sin(bird.heading)*dx+Math.cos(bird.heading)*dz;
      const cost=Math.hypot(dx,dz)-ahead*.23;
      if(cost<score){score=cost;index=i;}
    });
    const b=birds[index], from=b.position;
    const side=from.x > x ? 1 : -1, fishing=kind==='catch';
    const point=new THREE.Vector3(x, fishing ? .19 : 2.31,z);
    const waypoints=[
      from.clone(),
      from.clone().add(new THREE.Vector3(Math.sin(b.heading)*1.3,.02,Math.cos(b.heading)*1.3)),
      new THREE.Vector3(x+side*1.71,fishing ? 1.32 : 2.91,z+.83),
      point,
      new THREE.Vector3(x-side*1.61,fishing ? 1.69 : 2.92,z-1.26),
      new THREE.Vector3(x-side*3.35,4.12,z+1.01)
    ];
    const curve=new THREE.CatmullRomCurve3(waypoints,false,'centripetal');
    const lengths=curve.getLengths(150);
    mission={kind,index,point,curve,time,length:lengths[150],moment:lengths[90],sent:false};
    return true;
  }
  function takeCue() {const result=cue;cue=null;return result;}
  function step(delta,time) {
    if(delta<=0) return;
    const age=time-lastMove;
    const arrival=birds.some(bird=>bird.position.distanceToSquared(skyTarget)<1.8);
    const request=age<2.55 && !(age>.37 && arrival);
    steer+=(Number(request)-steer)*(1-Math.exp(-delta*(request ? 3.8 : 2.15)));
    for(let i=0;i<birds.length;i++){
      const b=birds[i];
      if(mission?.index===i){
        const {kind,index,curve,moment,point,length}=mission;
        const travel=(time-mission.time)*(kind==='catch' ? 4.15 : 3.55);
        const u=clamp(travel/length);
        curve.getPointAt(u,routePoint);
        curve.getTangentAt(u,lookAhead);
        const heading=Math.atan2(lookAhead.x,lookAhead.z);
        const mean=heading-b.heading;
        const turn=Math.atan2(Math.sin(mean),Math.cos(mean));
        b.heading+=turn*(1-Math.exp(-delta*9.0));
        b.pitch+=(-Math.asin(clamp(lookAhead.y,-.85,.85))*.74-b.pitch)*(1-Math.exp(-delta*6.5));
        b.bank+=(clamp(turn*.9,-.53,.53)-b.bank)*(1-Math.exp(-delta*5.));
        b.position.copy(routePoint);
        b.position.y=Math.max(kind==='catch' ? .18 : 2.22, b.position.y);
        b.vertical=lookAhead.y*2.;
        if(!mission.sent && travel>=moment){
          cue={kind,index,x:point.x,z:point.z};
          mission.sent=true;
          if(kind==='catch') b.carryUntil=time+2.65;
        }
        if(u>=1) mission=null;
        continue;
      }
      roam(i,time+1.7,home);
      target.set(skyTarget.x+(i-1)*1.09,Math.max(floorHeight(i)+.22,skyTarget.y+(i-1)*.33),skyTarget.z+i*.94);
      target.lerp(home,1-steer);
      const dx=target.x-b.position.x,dz=target.z-b.position.z;
      const needed=Math.atan2(dx,dz)-b.heading;
      const turn=Math.atan2(Math.sin(needed),Math.cos(needed));
      const yawRate=clamp(turn*1.48,-.88,.88);
      b.heading+=yawRate*delta;
      const speed=clamp(.91+(.25+steer*.24)*Math.hypot(dx,dz),.90,3.25);
      b.speed+=(speed-b.speed)*(1-Math.exp(-delta*1.38));
      const climb=clamp((target.y-b.position.y)*.69,-.72,.94);
      b.vertical+=(climb-b.vertical)*(1-Math.exp(-delta*2.1));
      b.position.x+=Math.sin(b.heading)*b.speed*delta;
      b.position.z+=Math.cos(b.heading)*b.speed*delta;
      b.position.y=Math.max(floorHeight(i),b.position.y+b.vertical*delta);
      b.bank+=(yawRate*.49-b.bank)*(1-Math.exp(-delta*3.65));
      b.pitch+=(Math.atan2(b.vertical,b.speed)*-.40-b.pitch)*(1-Math.exp(-delta*3.0));
    }
  }
  return {birds,aim,release,step,encounter,takeCue};
}

export {swells,RIPPLE_COUNT,LIMIT,LENS,FOV,NEAR,FAR,HUT,BOAT,FIELD,FIELD_X,FIELD_Z,SHOAL,FISH_GROUPS,FISH_GROUP_SIZE,TRACK_X,TRACK_Z,TRACK_SIZE,OUTCROPS,seabed,mantaPatrol,bedOnLand,clamp,smooth,height,lensRay,pickWater,rippleField,shoaling,seabirdFlight,turtleCoast};

import {swells,RIPPLE_COUNT,LIMIT,LENS,FOV,NEAR,FAR,FIELD,FIELD_X,FIELD_Z,SHOAL,FISH_GROUPS,FISH_GROUP_SIZE,TRACK_X,TRACK_Z,TRACK_SIZE,OUTCROPS,lagoonBounds,SUN} from './ocean-simulation.js';

// Five vertebral plates, paired costals and a narrow ring of marginal scutes.
function shellTexture(T) {
  const sites=[];
  for(let j=-2;j<=2;j++)sites.push([.023*Math.sin(j*2),j*.39]);
  for(const side of [-1,1]){
    for(let j=0;j<4;j++)sites.push([side*(.56-.08*Math.abs(j-1.5)),(j-1.5)*.43]);
    for(let j=0;j<12;j++){
      const a=(j+.5)*Math.PI/12;
      sites.push([side*.97*Math.sin(a),.99*Math.cos(a)]);
    }
  }
  const w=192,h=256,data=new Uint8Array(w*h*4);
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){
    const x=(i+.5)*2/w-1,z=(j+.5)*2/h-1;
    const u=x+.012*Math.sin(z*19+x*11),v=z+.007*Math.sin(x*27-z*10);
    let first=10,second=10,id=0;
    for(let k=0;k<sites.length;k++){
      const dx=u-sites[k][0],dz=(v-sites[k][1])*1.25,d=dx*dx+dz*dz;
      if(d<first){second=first;first=d;id=k;}else if(d<second)second=d;
    }
    const dx=u-sites[id][0],dz=v-sites[id][1],r=Math.sqrt(first),a=Math.atan2(dz,dx);
    const seam=Math.min(1,(Math.sqrt(second)-r)*34);
    const streak=Math.sin(12*a+2.8*Math.sin(a*5+id)+r*8)*.5+.5;
    const ring=.5+.5*Math.cos(r*117+2*Math.sin(a*3+id));
    const honey=.23+.24*Math.sin(id*2.4)+streak*.28+ring*.10;
    const offset=(j*w+i)*4;
    for(const [ch,lo,hi] of [[0,50,151],[1,52,127],[2,32,68]])
      data[offset+ch]=(lo+(hi-lo)*honey)*(.47+.53*seam)+19*Math.exp(-((seam-.64)**2)/.032);
    data[offset+3]=255*seam;
  }
  const t=new T.DataTexture(data,w,h);
  t.generateMipmaps=true;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;
  t.needsUpdate=true;
  return t;
}

function causticTexture(THREE) {
  const size = 192, cells = 12;
  let seed = 7703;
  const random = () => {
    seed = (Math.imul(seed,1664525)+1013904223) >>> 0;
    return seed / 4294967296;
  };
  const dots = Array.from({length: cells*cells},() => [.12+random()*.76,.12+random()*.76]);
  const wrap = v => (v+cells)%cells;
  const data = new Uint8Array(size*size*4);
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const x = i*cells/size, y = j*cells/size;
    const ix = Math.floor(x), iy = Math.floor(y);
    let a = 10, b = 10;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const [px,py] = dots[wrap(iy+dy)*cells+wrap(ix+dx)];
      const d = (x-ix-dx-px)**2 + (y-iy-dy-py)**2;
      if (d < a) {b = a; a = d;}
      else if (d < b) b = d;
    }
    const edge = Math.sqrt(b)-Math.sqrt(a);
    const offset = (j*size+i)*4;
    data[offset] = Math.round(255*Math.exp(-edge*edge*53));
    data[offset+3] = 255;
  }
  const texture = new THREE.DataTexture(data,size,size);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

// Keep projection and the coarse wave field identical for picking and rendering.

function detailTexture(THREE) {
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  let seed = 183405;
  for (let i = 0; i < data.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    data[i] = seed >>> 24;
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function waterShader() {
  const decimal = n => n.toFixed(7);
  const waveTerms = swells.map(([x, z, a, p, w]) => `
    k = vec2(${decimal(x)}, ${decimal(z)});
    phase = dot(k, p) + ${decimal(p)} - time * ${decimal(w)};
    s = sin(phase);
    h += ${decimal(a)} * (s + .28 * (s*s - .5));
    if (slopes) grad += k * (${decimal(a)} * cos(phase) * (1. + .56*s));
  `).join('');
  return `
    varying vec2 vScreen;
    uniform float aspect, time, pitch, yaw;
    uniform vec3 eye;
    uniform sampler2D detail, caustics, disturbance, tracks;
    uniform sampler2D sandAlbedo, sandNormal, sandRoughness;
    uniform float sandReady;
    uniform vec2 boat, floatPoint, hut;
    uniform float boatYaw;
    uniform vec4 fishModels[${SHOAL}];
    uniform vec2 fishDirections[${SHOAL}];
    uniform vec4 shoalBounds[${FISH_GROUPS}];
    uniform vec4 turtleModels[2], turtleTerrain[2], feet[8], rays[3];
    uniform vec2 rayScale;
    uniform sampler2D shellAtlas,lagoon,limestoneMap;
    uniform float stoneReady;
    uniform vec4 ripples[${RIPPLE_COUNT}];
    const float lens = ${decimal(LENS)};
    const float limit = ${decimal(LIMIT)};
    const vec3 sunColor = vec3(1., .63, .257);

    float waves(vec2 p, bool slopes, out vec2 grad) {
      float h = 0., phase, s;
      vec2 k;
      grad = vec2(0.);
      ${waveTerms}
      return h;
    }
    float gapAt(vec3 p) {
      vec2 ignored;
      return p.y - waves(p.xz, false, ignored);
    }

    // March inside the swell height band, then refine the first crossing.
    float surfaceHit(vec3 ro, vec3 rd, float side) {
      if (abs(ro.y) > limit && ro.y * rd.y >= 0.) return -1.;
      float t = 0.;
      if (abs(ro.y) > limit) t = (sign(ro.y) * limit - ro.y) / rd.y;
      float previous = t;
      for (int i = 0; i < 22; i++) {
        if (t > 125.) break;
        vec3 p = ro + rd*t;
        if (abs(p.y) > limit + .025 && side*rd.y > 0.) return -1.;
        float gap = side*gapAt(p);
        if (gap < .007) {
          if (gap >= 0.) return t;
          float a = previous, b = t;
          for (int j = 0; j < 4; j++) {
            float middle = (a+b)*.5;
            if (side*gapAt(ro+rd*middle) > 0.) a = middle;
            else b = middle;
          }
          return (a+b)*.5;
        }
        previous = t;
        t += max(.022, gap * 1.03 / (.62 + abs(rd.y)));
      }
      float plane = -ro.y / (abs(rd.y) > .0001 ? rd.y : -.0001);
      return plane > 0. && plane < 180. ? plane : -1.;
    }

    // Dispersive packets travel in world space and feed the optical normal.
    vec3 wake(vec2 p) {
      vec2 uv = (p-vec2(${FIELD_X.toFixed(1)},${FIELD_Z.toFixed(1)}))/${FIELD.toFixed(1)};
      vec3 sum = (texture2D(disturbance,uv).rgb*255.-128.) * vec3(.000730,.001724,.001724);
      for (int i = 0; i < ${RIPPLE_COUNT}; i++) {
        vec4 pulse = ripples[i];
        float age = time - pulse.z;
        if (pulse.w <= 0. || age > 2.7) continue;
        vec2 delta = p - pulse.xy;
        float radius = length(delta);
        float anisotropy = dot(delta,vec2(.59,-.43))/max(radius,.12);
        float front = radius - age * (2.05 + anisotropy*.36) + .12*sin(delta.x*2.2+delta.y*1.61)*min(age,1.);
        float width = .19 + age * .37;
        float q = front / width;
        if (abs(q) > 3.) continue;
        float phase = radius*23. - age*53.;
        float envelope = pulse.w * exp(-q*q - age*1.6) * smoothstep(0., .11, radius)
          * smoothstep(0., .07, age) * (1. - smoothstep(2.1, 2.7, age)) / sqrt(1. + radius*2.);
        sum.x += envelope * sin(phase);
        sum.yz += envelope * (23.*cos(phase) - 2.*q/width*sin(phase)) * delta/max(radius, .01);
      }
      return sum;
    }

    float grain(vec2 p) {
      vec2 cell = floor(p), f = fract(p);
      f = f*f*(3.-2.*f);
      return texture2D(detail, (cell + f + .5)/128.).r;
    }
    float shore(vec2 p) {
      return p.x + 2.4 - .52*p.y - sin(.40*p.y+.7)*1.28 - cos(p.y*.78)*.41;
    }
    bool insideHull(vec2 p) {
      vec2 forward=vec2(-sin(boatYaw),cos(boatYaw));
      vec2 delta=p-boat;
      float along=(dot(delta,forward)+.73)/1.69;
      float width=pow(max(.0001,sin(3.141593*(.10+clamp(along,0.,1.)*.90))),.74)*(.312+.059*(1.-along));
      return along>.012 && along<.984 && abs(dot(delta,vec2(forward.y,-forward.x)))<width*.81;
    }
    float mound(vec2 p, vec2 c, vec2 r) {
      vec2 q = (p-c)/r;
      return 1.-smoothstep(.08,1.,dot(q,q));
    }
    float outcrops(vec2 p) {
      return ${OUTCROPS.map(([x,z,rx,rz,h])=>`${decimal(h)}*mound(p,vec2(${decimal(x)},${decimal(z)}),vec2(${decimal(rx)},${decimal(rz)}))`).join('+')};
    }
    vec2 sandPrint(vec2 p){
      vec2 uv=(p-vec2(${decimal(TRACK_X)},${decimal(TRACK_Z)}))/${decimal(TRACK_SIZE)};
      if(any(lessThan(uv,vec2(0.))) || any(greaterThan(uv,vec2(1.))))return vec2(0.);
      return texture2D(tracks,uv).rg;
    }
    vec4 bankAt(vec2 p) {
      vec2 uv=(p-vec2(${decimal(lagoonBounds.x)},${decimal(lagoonBounds.z)}))/vec2(${decimal(lagoonBounds.w)},${decimal(lagoonBounds.h)});
      if(any(lessThanEqual(uv,vec2(0.))) || any(greaterThanEqual(uv,vec2(1.))))return vec4(0.,0.,0.,1.);
      return texture2D(lagoon,uv);
    }
    float bed(vec2 p) {
      float s = shore(p);
      float sand = -.27*s - 5.5*smoothstep(.8,12.5,s);
      float ridge = sin(p.x*.48-p.y*.26)*sin(p.y*.28+.6);
      float dunes = (1.-smoothstep(-8.5,-1.1,s))*(ridge*.39-.045);
      float relief=s<.25 ? dot(sandPrint(p),vec2(-.047,.029)) : 0.;
      vec4 bank=bankAt(p);
      return clamp(sand,-9.,.88) + dunes + outcrops(p)*smoothstep(1.25,3.,s)+relief+bank.r-.59*bank.b
        -1.58*smoothstep(5.4,8.3,p.y)*(1.-smoothstep(14.,18.,p.y))*smoothstep(.65,2.75,s);
    }
    float reef(vec2 p, vec2 center, vec2 shape) {
      vec2 q = (p-center)/shape;
      return 1.-smoothstep(.38,1.15,dot(q,q)+(grain(p*3.4)-.43)*.59);
    }
    float reefs(vec2 p) {
      return max(max(reef(p,vec2(3.0,5.6),vec2(1.35,1.10)),reef(p,vec2(4.5,1.8),vec2(1.17,.86))),
        max(reef(p,vec2(5.6,-2.25),vec2(1.88,1.22)),
        max(reef(p,vec2(.3,-1.75),vec2(1.1,.88)),
        max(reef(p,vec2(6.06,8.3),vec2(2.34,1.81)),reef(p,vec2(9.05,6.7),vec2(1.76,1.87))))));
    }
    float floorHit(vec3 ro, vec3 rd) {
      float previous = rd.y < -.001 ? max(0.,(1.44-ro.y)/rd.y) : 0.;
      if (previous>40. || (ro.y>1.44 && rd.y>=-.001)) return -1.;
      float d = previous + .095;
      for (int i=0;i<31;i++) {
        vec3 p = ro+rd*d;
        if (p.y < bed(p.xz)) {
          float a=previous, b=d;
          for (int j=0;j<8;j++) {
            float t = (a+b)*.5;
            vec3 q = ro+rd*t;
            if (q.y>bed(q.xz)) a=t;
            else b=t;
          }
          return (a+b)*.5;
        }
        previous = d;
        if (d>=44.) break;
        d = min(44.,d+min(3.1,.105+d*.126));
      }
      return -1.;
    }
    float focusLight(vec2 p, float depth) {
      vec2 q = p + vec2(sin(p.y*2.25-time*1.27),cos(p.x*2.10+time*1.2))*.11;
      vec2 r = vec2(.8*q.x-.6*q.y,.6*q.x+.8*q.y);
      float a = texture2D(caustics,q*.179+vec2(.007,-.004)*time).r;
      float b = texture2D(caustics,r*.144+vec2(-.006,.008)*time+.41).r;
      return (.67*a*a + .46*b*b + .33*a*b)*exp(-depth*.28);
    }
    float triangle(vec2 p, vec2 a, vec2 b, vec2 c) {
      vec2 ab=b-a, bc=c-b, ca=a-c;
      float x=dot(p-a,vec2(-ab.y,ab.x))/length(ab);
      float y=dot(p-b,vec2(-bc.y,bc.x))/length(bc);
      float z=dot(p-c,vec2(-ca.y,ca.x))/length(ca);
      return smoothstep(-.05,.025,min(min(x,y),z));
    }
    vec4 school(vec3 ro, vec3 rd,inout float maximum) {
      vec4 result = vec4(0.);
      float closest = min(maximum,24.);
      for (int group=0;group<${FISH_GROUPS};group++) {
        int start=group*${FISH_GROUP_SIZE};
        vec3 center=shoalBounds[group].xyz;
        float enclosing=shoalBounds[group].w;
        vec3 toCenter = center-ro;
        float forward = dot(toCenter,rd);
        if (forward < -enclosing || forward > closest+enclosing || length(toCenter-rd*forward)>enclosing) continue;
        for (int i=0;i<${FISH_GROUP_SIZE};i++) {
          float id = float(i+start);
          vec4 fish = fishModels[start+i];
          if(fish.w<=0.) continue;
          vec3 point = fish.xyz;
          vec2 dir = fishDirections[start+i];
          vec2 crossDir = vec2(dir.y,-dir.x);
          vec3 relative = ro-point;
          vec3 o = vec3(dot(relative.xz,dir),relative.y,dot(relative.xz,crossDir));
          vec3 v = vec3(dot(rd.xz,dir),rd.y,dot(rd.xz,crossDir));
          float size = fish.w*(i==0 ? 1.21 : 1.)*(group==2 ? (1.+fract(id*.19)*.39) : 1.);
          if (length(relative-rd*dot(relative,rd)) > size*1.62) continue;
          float type=mod(id,3.);
          vec3 radii = size*(type<1. ? vec3(.92,.147,.111) : type<2. ? vec3(.68,.26,.125) : vec3(.80,.19,.142));
          vec3 a = o/radii, b = v/radii;
          float aq = dot(b,b), bq = dot(a,b);
          float discriminant = bq*bq-aq*(dot(a,a)-1.);
          float t = discriminant > 0. ? (-bq-sqrt(discriminant))/aq : 1e4;
          float finT = -o.z/(abs(v.z)>.002 ? v.z : .002);
          vec2 f = (o+v*finT).xy/size;
          float wag = sin(time*10.+id)*.22;
          float tail = max(triangle(f,vec2(-1.17,-.23+wag),vec2(-.62,0.),vec2(-.99,.021+wag)),
            triangle(f,vec2(-.99,.021+wag),vec2(-.62,0.),vec2(-1.22,.24+wag)));
          float dorsal = triangle(f,vec2(-.47,.088),vec2(.38,.127),vec2(-.21,.30));
          float fin = max(tail,dorsal*.72);
          vec3 tint = mod(id,5.) < 1. ? vec3(.65,.28,.09) : mix(vec3(.102,.24,.233),vec3(.32,.56,.54),fract(id*.42));
          if(group==2) tint=type<1. ? vec3(.47,.60,.62) : type<2. ? vec3(.51,.435,.18) : vec3(.12,.31,.48);
          if (finT > .01 && finT < closest && fin > .1) {
            closest = finT;
            result = vec4(tint*.67,fin*.54);
          }
          if (t > .01 && t < closest) {
            closest = t;
            vec3 q = (o+v*t)/radii;
            float lit = .56+.38*max(0.,dot(normalize(q),vec3(-.2,.83,.51)));
            float scaleBand = grain(vec2(q.x*30.+q.y*2.,q.y*18.));
            tint = mix(tint,vec3(.52,.71,.61),scaleBand*.16 + smoothstep(.09,.23,-q.y)*.23);
            if(type>=1. && type<2.) tint *= .66+.34*smoothstep(-.38,.42,sin((q.x+q.y*.22)*13.));
            tint *= 1.-.76*(1.-smoothstep(.007,.045,dot(q.xy-vec2(.78,.23),q.xy-vec2(.78,.23))));
            result = vec4(tint*lit*exp(-t*.028),.96);
          }
        }
      }
      if(result.a>.1)maximum=closest;
      return result;
    }
    float ellipsoid(vec3 o,vec3 rd,vec3 radii) {
      vec3 a=o/radii,b=rd/radii;
      float h=dot(a,b),s=dot(b,b);
      float det=h*h-s*(dot(a,a)-1.);
      if(det<0.)return 1e4;
      float root=sqrt(det),entry=(-h-root)/s;
      return entry>.0001 ? entry : (-h+root)/s;
    }
    vec3 turtleSkin(vec3 p,vec3 n,float light) {
      vec2 q=vec2(p.x+p.y*.52,p.z-p.y*.28);
      float scales=texture2D(caustics,q*2.4).r;
      vec3 dorsal=mix(vec3(.083,.092,.042),vec3(.30,.273,.143),grain(q*55.)*.56+scales*.40);
      return mix(dorsal,vec3(.46,.393,.226),.63*smoothstep(.14,.85,-n.y))*light;
    }
    vec4 turtles(vec3 ro,vec3 rd,inout float nearest) {
      vec4 color=vec4(0.);
      for(int i=0;i<2;i++){
        vec4 pose=turtleModels[i], terrain=turtleTerrain[i];
        float size=terrain.z;
        vec3 to=pose.xyz-ro;
        float forward=dot(rd,to);
        if(forward<-.7 || forward>nearest+.86 || length(to-rd*forward)>.70*size)continue;
        vec2 z=vec2(sin(pose.w),cos(pose.w)),x=vec2(z.y,-z.x);
        vec3 o=vec3(-dot(to.xz,x),-to.y,-dot(to.xz,z))/size;
        vec3 r=vec3(dot(rd.xz,x),rd.y,dot(rd.xz,z))/size;
        o.y-=dot(o.xz,terrain.xy);r.y-=dot(r.xz,terrain.xy);
        vec2 azimuth=vec2(${decimal(SUN[0])},${decimal(SUN[2])});
        vec3 light=normalize(vec3(dot(azimuth,x),.61,dot(azimuth,z)));
        vec3 org=o-vec3(0.,.055,0.);
        vec3 shell=vec3(.253,.15,.348);
        float t=ellipsoid(org,r,shell);
        if(t>.001 && t<nearest+.13){
          float span=clamp((org.z+r.z*t)/shell.z,-1.,1.);
          shell.x*=1.+.13*span-.10*span*span;
          t=ellipsoid(org,r,shell);
          if(t>.001 && t<nearest){
            vec3 p=(org+r*t)/shell;
            vec3 n=normalize(p/shell);
            vec2 uv=p.xz*.492+.5;
            vec4 atlas=texture2D(shellAtlas,uv);
            float facing=max(0.,dot(n,light));
            float rim=1.-smoothstep(-.15,.07,n.y);
            vec3 pigment=mix(pow(atlas.rgb,vec3(1.80)),vec3(.40,.316,.172),rim);
            float gloss=pow(max(0.,dot(n,normalize(light-normalize(r)))),24.);
            color=vec4(pigment*(.52+.60*facing)+vec3(.125,.118,.088)*gloss,1.);
            nearest=t;
          }
        }
        float headLift=.012*sin(terrain.w-.6);
        for(int j=0;j<2;j++){
          vec3 radii=j==0 ? vec3(.066,.061,.147) : vec3(.079,.068,.111);
          vec3 delta=o-vec3(0.,.025+headLift,j==0 ? .305 : .439);
          float h=ellipsoid(delta,r,radii);
          if(h<=.001 || h>=nearest)continue;
          vec3 p=delta+r*h,n=normalize(p/(radii*radii));
          vec3 c=turtleSkin(p,n,.63+.52*max(0.,dot(n,light)));
          if(j==1){
            vec3 q=p/radii;
            float eye=1.-smoothstep(.13,.23,length(vec3(abs(q.x)-.81,q.y-.42,q.z-.39)));
            float beak=smoothstep(.56,.92,q.z);
            c=mix(c,vec3(.375,.311,.182),beak*.64);
            c*=1.-.85*eye;
          }
          color=vec4(c,1.);nearest=h;
        }
        for(int j=0;j<4;j++){
          float side=mod(float(j),2.)==0. ? -1. : 1.;
          bool front=j<2;
          vec3 root=vec3(side*(front ? .163 : .132),-.007,front ? .194 : -.184);
          vec3 tip=feet[i*4+j].xyz;
          vec3 dir=normalize(tip-root), crossDir=normalize(cross(dir,vec3(0.,1.,0.)));
          vec3 up=cross(crossDir,dir);
          // Join the muscular shoulder to a swept, pointed distal paddle.
          vec3 elbow=mix(root,tip,.44)+crossDir*side*.034;
          for(int piece=0;piece<2;piece++){
            vec3 a=piece==0 ? root : elbow,b=piece==0 ? elbow : tip;
            vec3 axis=normalize(b-a),lateral=normalize(cross(axis,vec3(0.,1.,0.))),normal=cross(lateral,axis);
            vec3 d=o-(a+b)*.5;
            vec3 origin=vec3(dot(d,axis),dot(d,normal),dot(d,lateral));
            vec3 v=vec3(dot(r,axis),dot(r,normal),dot(r,lateral));
            vec3 radii=vec3(length(b-a)*.67,piece==0 ? .034 : .023,(piece==0 ? .068 : .056)*(front ? 1. : .83));
            float f=ellipsoid(origin,v,radii);
            if(f<=.0001 || f>=nearest)continue;
            vec3 q=(origin+v*f)/(radii*radii);
            vec3 n=normalize(axis*q.x+normal*q.y+lateral*q.z);
            color=vec4(turtleSkin(o+r*f,n,.61+.53*max(0.,dot(n,light))),1.);nearest=f;
          }
        }
      }
      if(color.a>.5){
        vec3 p=ro+rd*nearest;
        float depth=max(0.,-p.y);
        color.rgb=mix(color.rgb,vec3(.043,.21,.205),min(.35,depth*.30));
        color.rgb+=vec3(.10,.13,.10)*focusLight(p.xz,depth)*smoothstep(0.,.16,depth);
      }
      return color;
    }
    float finHeight(float x,float z,float phase) {
      float span=min(1.,abs(x));
      return sin(phase-1.78*span-.91*z)*(.30*span*span) + .13*(1.-span)*exp(-z*z*5.);
    }
    float mantaShell(vec3 p,float phase) {
      float span=abs(p.x);
      float bow=.55-.72*pow(span,1.42)-.12*exp(-span*18.);
      float stern=-.46+.25*sin(span*1.73);
      float width=clamp((bow-p.z)/max(.11,bow-stern),0.,1.);
      float camber=.032+.139*exp(-span*span*9.);
      float thickness=camber*max(.34,4.*width*(1.-width))*max(.24,1.-span*.75);
      float edge=max(span-1.0,max(p.z-bow,stern-p.z));
      float solid=max(edge,abs(p.y-finHeight(p.x,p.z,phase))-thickness);
      vec3 lobe=(vec3(abs(p.x),p.y,p.z)-vec3(.126,.102,.39))/vec3(.042,.032,.112);
      float horn=(length(lobe)-1.)*.041;
      float join=clamp(.5+.5*(horn-solid)/.071,0.,1.);
      solid=mix(horn,solid,join)-.071*join*(1.-join);
      if(p.z < -.35){
        float end=clamp((-p.z-.39)/1.03,0.,1.);
        float curl=.13*sin(end*2.64+phase*.62)*end;
        float strand=length(p.xy-vec2(curl,.058+end*.081))-(.026-.019*end);
        solid=min(solid,max(strand,max(p.z+.40,-1.44-p.z)));
      }
      return solid;
    }
    vec4 raySwim(vec3 ro,vec3 rd,inout float maximum) {
      vec4 result=vec4(0.);
      float nearest=min(maximum,31.);
      for(int i=0;i<3;i++) {
        float id=float(i);
        vec3 center=rays[i].xyz;
        vec3 delta=center-ro;
        float reach=dot(delta,rd);
        float radial=dot(delta,delta)-reach*reach;
        float scale=i==2 ? .83 : (i==0 ? rayScale.x : rayScale.y);
        float radius=1.53*scale;
        if(reach<-.60 || reach>nearest+radius || radial>radius*radius) continue;
        float interval=sqrt(max(0.,radius*radius-radial));
        float end=min(nearest,reach+interval);
        vec2 heading=vec2(sin(rays[i].w),cos(rays[i].w));
        vec2 side=vec2(-heading.y,heading.x);
        vec3 rel=ro-center;
        vec3 o=vec3(dot(rel.xz,side),rel.y,dot(rel.xz,heading))/scale;
        vec3 v=vec3(dot(rd.xz,side),rd.y,dot(rd.xz,heading))/scale;
        float phase=time*(1.92-id*.34)+id*3.1;
        float t=max(.12,reach-interval);
        for(int j=0;j<42;j++){
          if(t>end) break;
          vec3 p=o+v*t;
          float d=mantaShell(p,phase);
          if(d<.0025){
            vec2 e=vec2(.004,0.);
            vec3 n=normalize(vec3(
              mantaShell(p+e.xyy,phase)-mantaShell(p-e.xyy,phase),
              mantaShell(p+e.yxy,phase)-mantaShell(p-e.yxy,phase),
              mantaShell(p+e.yyx,phase)-mantaShell(p-e.yyx,phase)
            )+vec3(0.,.00001,0.));
            float belly=smoothstep(-.10,.61,-n.y);
            float lit=.59+.33*max(0.,dot(n,vec3(-.24,.92,.31)));
            float grainy=grain(p.xz*21.+p.y*8.)*.54+grain(p.xz*49.)*.46;
            float mantle=smoothstep(.22,.73,grain(p.xz*5.0));
            vec3 ink=mix(vec3(.022,.079,.118),vec3(.105,.235,.268),mantle*.71);
            vec3 pale=mix(vec3(.23,.365,.346),vec3(.61,.70,.62),smoothstep(.16,.73,.77-abs(p.x)));
            vec3 tint=mix(ink,pale,belly)*(.83+.28*grainy);
            float gill=exp(-abs(abs(p.x)-.112)*41.)*smoothstep(.02,.15,p.z)*
              (1.-smoothstep(.20,.34,p.z))*(.5+.5*sin(p.z*91.));
            float eyes=(1.-smoothstep(.0005,.0055,dot(vec2(abs(p.x)-.186,p.z-.342),vec2(abs(p.x)-.186,p.z-.342))));
            tint*=1.-.43*gill*belly-.41*eyes*(1.-belly);
            float detailLight=focusLight((ro+rd*t).xz,1.1);
            vec3 distanceColor=mix(vec3(.025,.146,.186),tint*(lit+detailLight*.17),exp(-t*.055));
            result=vec4(distanceColor,1.);
            nearest=t;
            maximum=t;
            break;
          }
          t+=max(.006,d*scale*.61);
        }
      }
      return result;
    }
    vec3 grassCurve(vec3 root,vec2 bend,vec2 sway,float length,float u) {
      vec2 offset=bend*(.12*u+.88*u*u) + sway*(u*u*u);
      return root+vec3(offset.x,length*(u-.28*u*u*u),offset.y);
    }
    vec4 reefLife(vec3 ro, vec3 rd, float maximum, vec3 sun) {
      if (maximum < .65 || maximum > 20.) return vec4(0.);
      vec3 groundPoint=ro+rd*maximum;
      if(shore(groundPoint.xz)<1.50) return vec4(0.);
      vec2 plot=groundPoint.xz-rd.xz*.18;
      vec2 cell=floor(plot/.84)*.84;
      float seed=grain(cell*4.23);
      if(seed<.54 || grain(cell*.79)<.38) return vec4(0.);
      vec2 root=cell+vec2(seed*.36+.22,grain(cell*3.16+16.)*.36+.22);
      vec3 base=vec3(root.x,bed(root)-.011,root.y);
      float reach=dot(base+vec3(0.,.19,0.)-ro,rd);
      if(reach<.4 || reach>maximum+.31 || length(ro+rd*reach-base-vec3(0.,.19,0.))>.44) return vec4(0.);
      vec4 result=vec4(0.);
      float closest=maximum+.012;
      for(int i=0;i<8;i++){
        float phase=float(i)*2.399+seed*10.;
        float size=.20+fract(phase*.73)*.31;
        vec2 direction=vec2(cos(phase),sin(phase));
        vec2 bend=direction*(.075+fract(phase*.57)*.163);
        vec2 sway=vec2(sin(time*1.87+root.x*.8),cos(time*1.32+root.y*.9))*(.047+.045*seed);
        vec3 origin=base+vec3(direction.x*.022,0.,direction.y*.022);
        vec3 chord=grassCurve(origin,bend,sway,size,1.)-origin;
        vec3 projected=chord-rd*dot(chord,rd);
        vec3 toRay=ro-origin;
        float u=clamp(dot(toRay,projected)/max(.00001,dot(projected,projected)),0.,1.);
        for(int j=0;j<4;j++){
          vec3 center=grassCurve(origin,bend,sway,size,u);
          vec2 d=bend*(.12+1.76*u)+sway*3.*u*u;
          vec3 tangent=vec3(d.x,size*(1.-.84*u*u),d.y);
          vec3 screenTangent=tangent-rd*dot(tangent,rd);
          vec3 miss=ro+rd*dot(center-ro,rd)-center;
          float slide=dot(miss,screenTangent)/max(.0001,dot(screenTangent,screenTangent));
          u=clamp(u+clamp(slide,-.32,.32),0.,1.);
        }
        vec3 p=grassCurve(origin,bend,sway,size,u);
        float t=dot(p-ro,rd);
        if(t<.53 || t>closest || u<.008 || u>.997) continue;
        vec2 d=bend*(.12+1.76*u)+sway*3.*u*u;
        vec3 tangent=normalize(vec3(d.x,size*(1.-.84*u*u),d.y));
        vec3 binormal=normalize(cross(tangent,vec3(direction.x,.21,direction.y)));
        vec3 normal=normalize(cross(binormal,tangent)+binormal*sin(phase+u*2.7)*.26);
        vec3 gap=ro+rd*t-p;
        float across=dot(gap,binormal), thickness=dot(gap,normal);
        float blade=(.010+.021*seed)*pow(max(.001,sin(3.14159*u)),.66);
        float metric=abs(across)+abs(thickness)*1.72;
        float mask=(1.-smoothstep(blade*.68,blade,metric))*smoothstep(.57,1.05,t);
        if(mask>.08){
          closest=t;
          float light=abs(dot(normal,sun))*.51+.38+focusLight(p.xz+sun.xz*max(0.,-p.y)*.34,-p.y)*.42;
          float vein=(1.-smoothstep(.08,.27,abs(across)/blade))*.14;
          float stripes=grain(vec2(phase*2.+across*360.,u*20.))*.15;
          vec3 green=mix(vec3(.023,.079,.056),vec3(.18,.30,.121),u*.53+seed*.34+vein);
          result=vec4(green*(light+stripes),mask*.94);
        }
      }
      return result;
    }
    vec4 coralGarden(vec3 ro,vec3 rd,float floorDistance,vec3 sun) {
      vec4 color=vec4(0.);
      float nearest=min(floorDistance,20.);
      for(int i=0;i<6;i++){
        vec2 place;
        if(i==0) place=vec2(5.13,5.64);
        else if(i==1) place=vec2(7.18,6.0);
        else if(i==2) place=vec2(5.58,8.17);
        else if(i==3) place=vec2(8.14,8.28);
        else if(i==4) place=vec2(3.15,5.34);
        else place=vec2(4.4,1.88);
        vec3 root=vec3(place.x,bed(place)-.040,place.y);
        float k=float(i);
        float phase=k*1.53+.19*sin(time*.84+k);
        vec3 tangent=vec3(cos(phase),.10*sin(k*3.2),sin(phase));
        vec3 up=normalize(vec3(.15*sin(time*.84+k),1.,.12*cos(k)));
        vec3 normal=normalize(cross(tangent,up));
        tangent=normalize(cross(up,normal));
        float denominator=dot(rd,normal);
        if(abs(denominator)<.035) continue;
        float t=dot(root-ro,normal)/denominator;
        if(t<1.17 || t>nearest+.08)continue;
        vec3 center=ro+rd*t-root;
        float h=.425+.13*sin(k*2.5);
        float v=dot(center,up)/h;
        float u=dot(center,tangent)/(.28+.064*sin(k));
        if(v<0. || v>1.04 || abs(u)>1.13)continue;
        float fanWidth=(.075+.77*sin(pow(clamp(v,0.,1.),.84)*2.50));
        float rim=1.-smoothstep(.90,1.01,abs(u)/max(fanWidth,.05));
        float heightCut=1.-smoothstep(.90,1.,v+.085*abs(u)+.07*sin(u*22.+k));
        float div=atan(u,v+.078);
        float radial=pow(1.-abs(sin(div*8.2+v*1.07)),7.);
        vec2 warp=vec2(div*.61+v*.39,v*.82+.036*sin(u*18.));
        float mesh=texture2D(caustics,warp*.94+vec2(k*.13,.18)).r;
        float ribs=max(radial*.79,mesh*.55+radial*.21);
        float weave=smoothstep(.28,.59,ribs);
        float trunk=(1.-smoothstep(.013,.046,abs(u+.031*sin(v*5.))))*(1.-smoothstep(.47,.82,v));
        float alpha=max(rim*heightCut*weave,trunk)*smoothstep(1.25,1.85,t);
        if(alpha<.09)continue;
        vec3 rusty=k<1. || k>2.9 ? vec3(.49,.20,.155) : vec3(.39,.27,.42);
        vec3 tips=mix(rusty,vec3(.72,.45,.33),v*.49);
        float light=.68+.33*abs(dot(normal,sun))+.22*focusLight((root+center).xz,max(0.,-root.y));
        color=vec4(tips*(light+.16*radial),alpha*.92);
        nearest=t;
      }
      return color;
    }
    vec3 bottom(vec3 ro, vec3 rd, vec3 sun, float distance) {
      vec2 p = ro.xz+rd.xz*distance;
      float s = shore(p);
      float depth = max(0.,-bed(p));
      float layers = grain(p*.82)*.48 + grain(p*3.24)*.28 + grain(p*11.4)*.16 + grain(p*80.)*.08;
      float ridges = sin(p.y*34. + p.x*7. + grain(p*.66)*15.);
      float grit = smoothstep(.69,.87,grain(p*71.4)+grain(p*39.6)*.18);
      float shell = smoothstep(.78,.88,grain(p*17.7)+grain(p*12.6)*.18);
      vec3 sand = mix(vec3(.59,.423,.267), vec3(.99,.896,.719), clamp(.33+layers*.65+ridges*.044*grain(p*.71),0.,1.));
      sand *= .98+.073*grit-.079*shell;
      sand = mix(sand,sand*vec3(.93,.87,.77),grain(p*.38)*.16);
      float wet=exp(-pow((s+.12+sin(time*1.17+p.y*.62)*.13)/.67,2.));
      sand *= 1.-.23*wet;
      if(sandReady>.5){
        vec2 uv=mat2(.936,.351,-.351,.936)*p*.095+vec2(.31,.54);
        vec2 fineUV=vec2(.82*p.x-.57*p.y,.57*p.x+.82*p.y)*.24;
        vec3 albedo=texture2D(sandAlbedo,uv).rgb;
        vec3 tiny=texture2D(sandAlbedo,fineUV).rgb;
        float shade=dot(albedo,vec3(.24,.65,.11));
        float fineShade=dot(tiny,vec3(.24,.65,.11));
        vec3 relief=texture2D(sandNormal,uv).rgb*2.-1.;
        vec3 grains=texture2D(sandNormal,fineUV).rgb*2.-1.;
        vec3 n=normalize(vec3(relief.x*.66+grains.x*.28, max(.52,relief.z), -relief.y*.66-grains.y*.28));
        float diffuse=.80+.26*max(0.,dot(n,sun));
        float roughness=mix(texture2D(sandRoughness,uv).r,.38,wet*.73);
        float gloss=pow(max(0.,dot(n,normalize(sun-rd))),15.+46.*(1.-roughness));
        vec3 radiance=sand*(.76+.61*shade+.29*fineShade)*diffuse;
        radiance+=vec3(.095,.074,.044)*gloss*wet;
        sand=mix(sand,radiance,.78);
      }
      if(s<.22){
        vec2 print=sandPrint(p);
        if(max(print.r,print.g)>.008){
          vec2 relief=vec2(-.047,.029);
          float sx=dot(sandPrint(p+vec2(.027,0.))-sandPrint(p-vec2(.027,0.)),relief)/.054;
          float sz=dot(sandPrint(p+vec2(0.,.027))-sandPrint(p-vec2(0.,.027)),relief)/.054;
          float slope=dot(normalize(vec3(-sx,1.,-sz)),sun)-sun.y;
          sand*=clamp(1.+.78*slope-.32*print.r+.09*print.g,.46,1.42);
        }
      }
      float stones = smoothstep(.74,.87,grain(p*2.84)+grain(p*13.)*.16);
      float berm = (1.-smoothstep(.04,.64,abs(s+.58)))*smoothstep(.34,.72,grain(p*.93));
      sand = mix(sand,vec3(.40,.35,.26),stones*(berm*.84+.15*smoothstep(.38,.70,layers)));
      float scrub = (1.-smoothstep(-4.6,-1.7,s))*smoothstep(5.8,10.5,p.y)
        * smoothstep(.45,.73,grain(p*.74)+grain(p*5.5)*.16);
      sand = mix(sand,mix(vec3(.17,.23,.13),vec3(.40,.43,.23),grain(p*4.5)),scrub*.80);
      float rock = reefs(p) * smoothstep(.3,1.3,s);
      vec3 reefTint = mix(vec3(.046,.142,.157),vec3(.18,.205,.31),grain(p*1.34));
      reefTint *= .64 + grain(p*8.8)*.47 + grain(p*23.)*.28;
      float coral = smoothstep(.45,.73,grain(p*3.12)+grain(p*12.)*.19)*rock;
      float labyrinth=texture2D(caustics,(p+vec2(sin(p.y*18.),sin(p.x*11.))*.019)*.86).r;
      float polyps=smoothstep(.57,.82,grain(p*75.5));
      vec3 colony=mix(vec3(.27,.17,.205),vec3(.60,.37,.226),grain(p*4.2))*(.72+labyrinth*.24+polyps*.31);
      reefTint = mix(reefTint,colony,coral*.93);
      float ledge = reefs(p-vec2(.24,-.17));
      reefTint *= .78 + .50*max(rock-ledge,0.) + .30*grain(p*13.);
      vec3 col = mix(sand,reefTint,rock*.95);
      vec4 bank=bankAt(p);
      float phase=p.y*39.+p.x*14.+2.8*sin(p.x*2.3+p.y*.65)+grain(p*1.6)*5.;
      float ribs=sin(phase)+.22*sin(phase*2.-.7);
      float alias=1.-smoothstep(.42,2.1,fwidth(phase));
      vec3 shellSand=sand*vec3(.81,.95,.91)*(.87+.12*alias*ribs);
      col=mix(col,shellSand,bank.b*(1.-bank.g));
      if(bank.g>.005){
        float y=ro.y+rd.y*distance;
        vec2 mineral=vec2(p.x*.84+p.y*.36,y*.92-p.y*.13);
        float b=grain(mineral*5.7)*.44+grain(mineral*15.)*.34+grain(mineral*48.)*.22;
        float pores=smoothstep(.64,.82,grain(p*37.)*.61+grain(p*87.)*.39);
        float bedding=sin(y*48.+p.x*4.+2.8*grain(p*2.2));
        vec3 limestone=mix(vec3(.155,.197,.183),vec3(.56,.50,.388),clamp((b-.28)*2.5,0.,1.));
        limestone*=.94+.07*bedding-.38*pores;
        vec3 norm=normalize(vec3(bed(p-vec2(.03,0.))-bed(p+vec2(.03,0.)),.06,
          bed(p-vec2(0.,.03))-bed(p+vec2(0.,.03))));
        if(stoneReady>.5){
          vec3 stone=texture2D(limestoneMap,p*.79+vec2(.16,.27)).rgb;
          stone=mix(stone,texture2D(limestoneMap,vec2(p.y*.64,y*.81)).rgb,abs(norm.x)*.77);
          limestone=mix(limestone,stone*vec3(1.06,1.11,1.07)*(.89+.09*bedding),.82);
        }
        col=mix(col,limestone*(.64+.57*max(0.,dot(norm,sun))),bank.g);
      }
      if (rock>.07) {
        float h=bed(p);
        vec3 groundNormal=normalize(vec3((h-bed(p+vec2(.041,0.)))*24.,1.,(h-bed(p+vec2(0.,.041)))*24.));
        col *= .62+.39*max(0.,dot(groundNormal,sun));
      }
      float light = focusLight(p+sun.xz*depth*.34,depth);
      float sandLight=focusLight(p*2.82+vec2(.28,-.17)*depth,depth)*(.64+.19*ribs*alias);
      light=mix(light,sandLight,max(bank.b,bank.g*.76));
      col=(col+vec3(.62,.80,.64)*light*smoothstep(-.11,.76,s)*(.69+rock*.27))*bank.a;
      vec2 hullShadow = (p-boat+sun.xz*depth*.43)/vec2(.36,.91);
      float shade = dot(hullShadow,hullShadow);
      col *= .65+.35*smoothstep(.24,2.3,shade);
      vec2 porch = (p-hut+sun.xz*.62)/vec2(.89,.72);
      col *= .69+.31*smoothstep(.63,1.55,max(abs(porch.x),abs(porch.y)));
      vec2 palmShadow = p-hut+vec2(1.18,.04)+sun.xz*1.85;
      float angle = atan(palmShadow.y,palmShadow.x);
      float fan = pow(.5+.5*sin(angle*8.+length(palmShadow)*1.9),9.);
      col *= 1.-.23*fan*(1.-smoothstep(.31,1.09,length(palmShadow)));
      for(int i=0;i<2;i++){
        vec4 pose=turtleModels[i];
        vec2 dir=vec2(sin(pose.w),cos(pose.w));
        vec2 delta=p-pose.xz+sun.xz*clamp(pose.y-ro.y-rd.y*distance+.08,0.,.8)*.62;
        vec2 q=vec2(dot(delta,vec2(dir.y,-dir.x))/.30,dot(delta,dir)/.39)/turtleTerrain[i].z;
        col*=1.-.35*(1.-smoothstep(.38,1.40,dot(q,q)));
      }
      return col;
    }
    float clouds(vec2 p) {
      vec2 q = p + vec2(grain(p*.32), grain(p*.37+41.)) * 2.3;
      return grain(q)*.54 + grain(q*2.03+17.)*.27 + grain(q*4.17+34.)*.13 + grain(q*8.41)*.06;
    }
    vec3 seaHaze(vec3 rd, vec3 sun) {
      float west=max(dot(rd.xz,sun.xz)/max(.001,length(rd.xz)),0.);
      return mix(vec3(.22,.33,.40),vec3(.72,.46,.31),pow(west,7.));
    }
    vec3 dome(vec3 rd, vec3 sun, bool reflected) {
      float y = max(rd.y, 0.);
      float facing = max(dot(rd, sun), 0.);
      float az = atan(rd.x,rd.z);
      float west = pow(facing,3.);
      float air = exp(-y*8.7);
      vec3 blue = mix(vec3(.53,.66,.79),vec3(.16,.365,.63),smoothstep(.06,.63,y));
      vec3 horizon = mix(vec3(.72,.57,.50),vec3(1.18,.51,.155),west);
      vec3 col = mix(blue,horizon,air);
      col += vec3(.55,.22,.045)*pow(facing,21.)*exp(-y*5.);
      float transmission = 1.;
      if (y > .002) {
        vec2 wind = vec2(time*.009,-time*.003);
        // Angular coordinates keep cloud banks recognizable near the horizon.
        vec2 field = vec2(az*4.4,log(1.+y*7.)*3.85);
        vec2 tile = field+vec2(27.,8.)+wind;
        float sheet = clouds(tile);
        float coverage = smoothstep(.483,.62,sheet)*smoothstep(.002,.023,y);
        float wisps = clouds(vec2(field.x*.81,field.y*2.02-field.x*.44)+vec2(3.,51.)-wind*.52);
        col = mix(col, mix(vec3(.86,.91,.99),vec3(1.20,.86,.59),exp(-y*3.)*west),
          smoothstep(.51,.72,wisps)*.54);
        float lightSide = clamp(.51+4.6*(sheet-clouds(tile+vec2((sun.x-rd.x)*.27,-.24))),0.,1.);
        float rim = (1.-smoothstep(.53,.66,sheet))*(.35+.65*lightSide);
        float warm = west*(.37+.63*exp(-y*3.8));
        vec3 shade = mix(vec3(.32,.39,.52),vec3(.57,.38,.33),warm);
        vec3 edge = mix(vec3(.97,.94,.91),vec3(1.57,.86,.36),warm);
        col = mix(col,mix(shade,edge,clamp(.62*lightSide+.60*rim,0.,1.)),coverage);
        transmission = 1.-coverage*.86;
      }
      float separation=length(rd-sun);
      float disk=1.-smoothstep(.008,.011,separation);
      col += transmission*(vec3(.71,.32,.075)*exp(-separation*12.)
        + vec3(1.03,.68,.24)*exp(-separation*46.) + vec3(3.5,2.95,1.96)*disk);
      // Two overlapping spurs taper to below sea level; visibility follows the
      // crest vertically, not a horizontal opacity threshold at the cape.
      vec3 axis=(vec3(az)+vec3(.48,.27,.125))*vec3(5.2,6.5,7.1);
      vec3 hills=exp(-axis*axis);
      float ridge=dot(hills,vec3(.035,.018,.0071));
      float detail=.83+.20*grain(vec2(az*112.,43.))+.12*grain(vec2(az*294.,41.));
      float crest=ridge*detail-.002;
      float distant=dot(hills,vec3(.013,.019,.012))-.0018;
      float farLand=1.-smoothstep(distant-.0009,distant+.0009,rd.y);
      float nearLand=1.-smoothstep(crest-.0007,crest+.0007,rd.y);
      vec3 haze=mix(vec3(.40,.47,.54),vec3(.67,.54,.48),west);
      col=mix(col,haze,farLand*(reflected ? .40 : .82));
      vec3 land=mix(haze,vec3(.235,.32,.355),.42+.21*smoothstep(0.,.026,rd.y));
      col=mix(col,land,nearLand*(reflected ? .42 : .90));
      return mix(seaHaze(rd,sun),col,smoothstep(-.00075,.00075,rd.y));
    }

    vec2 microSlopes(vec2 p, float farFade) {
      vec2 a = texture2D(detail, (p*vec2(2.7, 5.1) - time*vec2(.35,.71))/128.).gb - .5;
      vec2 b = texture2D(detail, (vec2(p.y,-p.x)*vec2(6.2,8.2)+time*vec2(.81,-.43))/128.).ba - .5;
      vec2 c = vec2(sin(dot(p,vec2(10.7,15.6)) - time*7.4), cos(dot(p,vec2(-18.4,9.1)) - time*8.3));
      return (a*.145 + b*.085 + c*.037) * farFade;
    }
    float fresnel(float cosine) {
      return .0204 + .9796*pow(1.-clamp(cosine,0.,1.), 5.);
    }
    vec3 waterVolume(vec3 ro, vec3 rd, vec3 sun, float distanceToSurface) {
      float distance = min(distanceToSurface, 55.);
      vec3 p = ro + rd * min(distance*.51, 7.);
      float depth = max(0., -p.y);
      vec3 light = -refract(-sun, vec3(0.,1.,0.), 1./1.333);
      vec2 source = p.xz + light.xz * depth / light.y;
      float a = grain(source*3.2 + time*.23);
      float b = grain(source.yx*3.9 - time*.18 + 30.);
      float focus = pow(1.-abs(a-b), 6.);
      float beam = smoothstep(.25,.72,grain(source*.76+vec2(time*.16,18.)));
      float shafts = pow(grain(vec2(source.x*.81+source.y*.4, source.y*.27)-vec2(time*.12,6.)),3.);
      float angle = max(0., dot(rd, light));
      vec3 ambient = mix(vec3(.002,.022,.060), vec3(.003,.091,.16), exp(-depth*.57));
      float rays=0.;
      for(int i=0;i<5;i++){
        vec3 s=ro+rd*(min(distance,16.)*(float(i)+.48)/5.);
        vec2 opening=s.xz+light.xz*max(0.,-s.y)/light.y;
        float streak=sin(opening.x*3.8-opening.y*1.5+.4*sin(opening.y*1.62)+time*.21);
        float aperture=exp(-pow((opening.x-.47*opening.y-4.9)/2.1,2.));
        rays+=aperture*(.26+.74*pow(.5+.5*streak,5.))*exp(-max(0.,-s.y)*.39);
      }
      return ambient+vec3(.031,.21,.27)*rays*.20*(1.-exp(-distance*.48))
        +vec3(.045,.21,.26)*(beam*.27+focus*.13+shafts*.41)*exp(-depth*.52)*(angle*angle*.7+.23);
    }

    vec3 aboveWater(vec3 rd, vec3 n, vec3 sun, float distance, vec3 p) {
      vec3 reflected = reflect(rd,n);
      reflected.y = abs(reflected.y);
      vec3 through = refract(rd,n,1./1.333);
      float f = fresnel(dot(-rd,n));
      float bottomDistance = floorHit(p+through*.035,through);
      vec3 deep = vec3(.012,.109,.17);
      vec3 color = deep;
      if (bottomDistance >= 0.) {
        vec3 base = bottom(p+through*.035,through,sun,bottomDistance);
        vec4 life = reefLife(p+through*.035,through,bottomDistance,sun);
        base = mix(base,life.rgb,life.a);
        vec4 coral = coralGarden(p,through,bottomDistance,sun);
        base = mix(base,coral.rgb,coral.a*.83);
        vec3 absorbed = exp(-bottomDistance*vec3(.71,.24,.172))*(1.-smoothstep(19.,39.,bottomDistance));
        color = mix(deep,base,absorbed);
      }
      float turtleDepth=bottomDistance>=0. ? bottomDistance : 22.;
      vec4 fish = school(p,through,turtleDepth);
      color = mix(color,fish.rgb,fish.a*.85);
      vec4 manta=raySwim(p,through,turtleDepth);
      color=mix(color,manta.rgb,manta.a);
      vec4 turtle=turtles(p,through,turtleDepth);
      color=mix(color,turtle.rgb,turtle.a);
      color = mix(color, dome(reflected,sun,true), f*.75+.028);
      vec3 halfLight = normalize(sun-rd);
      float nh = max(dot(n,halfLight),0.);
      float glitter = grain(p.xz*21. + vec2(-time*1.16,time*1.54));
      float rough = 64. + glitter*136.;
      float gloss = pow(nh,460.)*1.46 + pow(nh,rough)*(.09+.45*pow(glitter,3.));
      float grazing = smoothstep(0.,.105,dot(n,sun));
      color += sunColor * gloss * grazing * (1. + f*3.3);
      float tidal = shore(p.xz);
      float advancing = sin(time*1.68 + p.z*.62)*.26 + grain(p.xz*3.)*.16;
      float edge = 1.-smoothstep(.045,.26,abs(tidal-.55+advancing));
      float lace = texture2D(caustics,p.xz*.31+vec2(time*-.017,time*.012)).r;
      color = mix(color,vec3(.81,.91,.85),edge*(.15+.55*lace)*smoothstep(.21,.65,grain(p.xz*3.5)));
      float mist = smoothstep(19.,180.,distance);
      return mix(color,seaHaze(rd,sun),mist);
    }
    vec3 belowWater(vec3 ro, vec3 rd, vec3 n, vec3 sun, float distance,out float sceneDepth) {
      vec3 volume = waterVolume(ro,rd,sun,distance < 0. ? 55. : distance);
      float bottomDistance = floorHit(ro,rd);
      if (bottomDistance >= 0. && (distance < 0. || bottomDistance < distance)) {
        vec3 ground = bottom(ro,rd,sun,bottomDistance);
        vec4 life = reefLife(ro,rd,bottomDistance,sun);
        ground = mix(ground,life.rgb,life.a);
        vec4 coral = coralGarden(ro,rd,bottomDistance,sun);
        ground = mix(ground,coral.rgb,coral.a);
        vec3 transmission = exp(-bottomDistance*vec3(.44,.167,.124))*(1.-smoothstep(13.,34.,bottomDistance));
        vec4 fish = school(ro,rd,bottomDistance);
        vec3 color = mix(mix(volume,ground,transmission),fish.rgb,fish.a*.73);
        vec4 manta = raySwim(ro,rd,bottomDistance);
        vec4 turtle=turtles(ro,rd,bottomDistance);
        sceneDepth=bottomDistance;
        return mix(mix(color,manta.rgb,manta.a),turtle.rgb,turtle.a);
      }
      float hit=distance<0. ? 36. : distance;
      vec4 fish = school(ro,rd,hit);
      vec4 manta=raySwim(ro,rd,hit), turtle=turtles(ro,rd,hit);
      sceneDepth=max(fish.a,max(manta.a,turtle.a))>.1 ? hit : distance;
      if (distance < 0.) return mix(mix(mix(volume,fish.rgb,fish.a*.75),manta.rgb,manta.a),turtle.rgb,turtle.a);
      float cosIn = clamp(dot(rd,n),0.,1.);
      float ior = 1.333;
      float sinOut = ior*ior*(1.-cosIn*cosIn);
      vec3 env = volume*.62 + vec3(.010,.044,.057);
      if (sinOut < 1.) {
        vec3 through = refract(rd,-n,ior);
        float transmission = (1.-fresnel(sqrt(1.-sinOut))) * smoothstep(0.,.09,1.-sinOut);
        vec3 sky = dome(through,sun,false) * vec3(.42,.76,.82);
        env = mix(env,sky,transmission*.86);
      }
      vec3 upSun = -refract(-sun,n,1./ior);
      float glint = pow(max(dot(rd,upSun),0.),54.);
      env += vec3(.73,.78,.54) * glint * .68;
      vec3 clarity = exp(-distance*vec3(.35,.151,.084));
      return mix(mix(mix(mix(volume,env,clarity),fish.rgb,fish.a*.77),manta.rgb,manta.a),turtle.rgb,turtle.a);
    }
    void main() {
      vec2 v = (vScreen*2.-1.) * ${decimal(FOV)};
      float sp = sin(pitch), cp = cos(pitch);
      vec3 ray = normalize(vec3(v.x*aspect, v.y*cp+sp, cp-v.y*sp));
      ray.xz=mat2(cos(yaw),-sin(yaw),sin(yaw),cos(yaw))*ray.xz;
      vec3 ro = eye + ray*lens;
      float wet = gapAt(ro);
      float side = wet >= 0. ? 1. : -1.;
      float distance = surfaceHit(ro,ray,side);
      vec3 sun = normalize(vec3(${SUN.map(decimal).join(',')}));
      vec3 p = ro + ray*max(distance,0.);
      vec3 n = vec3(0.,1.,0.);
      if (distance >= 0.) {
        vec2 slope;
        p.y = waves(p.xz,true,slope);
        float nearDetail = 1.-smoothstep(8.,55.,distance);
        vec3 ripple = distance < 33. ? wake(p.xz) : vec3(0.);
        float incidence = ray.y - dot(ray.xz,slope);
        if (abs(incidence) > .075 && abs(ripple.x) > .001) {
          p.xz += ray.xz * clamp(ripple.x/incidence,-.12,.12);
          p.y = waves(p.xz,true,slope) + ripple.x;
        }
        slope = (slope+ripple.yz+microSlopes(p.xz, nearDetail))*(1.-smoothstep(43.,164.,distance));
        n = normalize(vec3(-slope.x,1.,-slope.y));
      }
      vec3 color;
      float sceneDepth=distance;
      if (side > 0.) {
        float land = distance < 0. || shore(p.xz) < .85 ? floorHit(ro,ray) : -1.;
        vec3 ground = ro+ray*land;
        if (land >= 0. && ground.y > .014 && (distance < 0. || land < distance)) {
          color = bottom(ro,ray,sun,land);
          if(land>27.) color=mix(color,dome(ray,sun,false),smoothstep(27.,43.,land));
          sceneDepth=land;
        } else {
          color = distance < 0. ? dome(ray,sun,false) : aboveWater(ray,n,sun,distance,p);
        }
        float exposedDepth=sceneDepth<0. ? 36. : sceneDepth;
        vec4 exposed=turtles(ro,ray,exposedDepth);
        if(exposed.a>.5){color=exposed.rgb;sceneDepth=exposedDepth;}
      } else color = belowWater(ro,ray,n,sun,distance,sceneDepth);
      // A thin refracting meniscus softens the lens crossing without fading between scenes.
      float meniscus = 1.-smoothstep(.003,.028,abs(wet));
      color = mix(color,vec3(.044,.23,.30),meniscus*.63);
      color = color/(1.+.17*color);
      float viewZ=(sceneDepth+lens)*dot(ray,vec3(sin(yaw)*cp,sp,cos(yaw)*cp));
      bool dryInterior = side>0. && distance>=0. && sceneDepth==distance && insideHull(p.xz);
      gl_FragDepth=sceneDepth<0. || dryInterior ? 1. : clamp(${decimal(FAR/(FAR-NEAR))}-${decimal(FAR*NEAR/(FAR-NEAR))}/max(viewZ,${decimal(NEAR)}),0.,1.);
      gl_FragColor = vec4(color,1.);
      #include <colorspace_fragment>
    }
  `;
}

export {causticTexture,detailTexture,shellTexture,waterShader};

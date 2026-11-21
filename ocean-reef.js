import {seabed,SUN} from './ocean-simulation.js';

// Small benthic animals are anchored to the same terrain as the optical pass.
export function reefResidents(T,physics,caustics) {
  const scene=new T.Scene(), tau=2*Math.PI, up=new T.Vector3(0,1,0);
  scene.fog=new T.FogExp2(0x286077,.105);
  scene.add(new T.HemisphereLight(0xc6eee6,0x31636a,1.55));
  const light=new T.DirectionalLight(0xe0efe1,1.68);
  const horizontal=1/(1.333*Math.hypot(...SUN));
  light.position.set(-SUN[0]*horizontal,Math.sqrt(1-(SUN[0]**2+SUN[2]**2)*horizontal**2),SUN[2]*horizontal);
  scene.add(light);
  const fill=new T.DirectionalLight(0xc5e4eb,1.62);
  fill.position.set(1,1.4,-2);scene.add(fill);
  const tissue=new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:.74});
  const clay=new T.Color(),pigment=new T.Color(),rgb=(a,b,w)=>clay.set(a).lerp(pigment.set(b),w).toArray();
  function patch(parent,m,n,sample,material=tissue) {
    const positions=[],colors=[],uv=[],indices=[];
    for(let j=0;j<=n;j++)for(let i=0;i<=m;i++){
      const [x,y,z,c]=sample(i/m,j/n);
      positions.push(x,y,z);colors.push(...c);uv.push(i/m,j/n);
      if(i<m && j<n){
        const a=j*(m+1)+i;
        indices.push(a,a+m+1,a+1,a+1,a+m+1,a+m+2);
      }
    }
    const g=new T.BufferGeometry();
    g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    g.setAttribute('color',new T.Float32BufferAttribute(colors,3));
    g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
    g.setIndex(indices);g.computeVertexNormals();
    const mesh=new T.Mesh(g,material);parent.add(mesh);
    return mesh;
  }
  function anchor(x,z,angle,size) {
    const group=new T.Group(), animal=new T.Group(), e=.035;
    const normal=new T.Vector3((seabed(x+e,z)-seabed(x-e,z))/(2*e),1,
      -(seabed(x,z+e)-seabed(x,z-e))/(2*e)).normalize();
    group.position.set(-x,seabed(x,z)-.012,z);
    group.quaternion.setFromUnitVectors(up,normal);
    animal.rotation.y=angle;animal.scale.setScalar(size);
    scene.add(group);group.add(animal);return animal;
  }
  const fans=[],swimmers=[],clock={value:0};
  function underwaterLight(material){
    const previous=material.onBeforeCompile.bind(material);
    material.onBeforeCompile=shader=>{
      previous(shader);
      shader.uniforms.reefClock=clock;shader.uniforms.waterLight={value:caustics};
      shader.vertexShader='varying vec3 reefPos;\n'+shader.vertexShader.replace('#include <project_vertex>',
        'reefPos=(modelMatrix*vec4(transformed,1.)).xyz;\n#include <project_vertex>');
      shader.fragmentShader='varying vec3 reefPos;uniform sampler2D waterLight;uniform float reefClock;\n'+shader.fragmentShader.replace('#include <opaque_fragment>',`
        vec2 uv=vec2(-reefPos.x,reefPos.z)*.72-reefPos.y*vec2(.16,.22);
        float beam=texture2D(waterLight,uv+vec2(.008,-.011)*reefClock).r;
        outgoingLight*=.92+.28*beam*beam;
        #include <opaque_fragment>`);
    };
  }
  underwaterLight(tissue);
  function seaFan(x,z,angle,size,seed) {
    const g=anchor(x,z,angle,size),pos=[],color=[],idx=[];
    physics.solid(x,seabed(x,z)+size*.25,z,size*.44,size*.26,size*.075,-angle);
    const V=(x,y,z)=>new T.Vector3(x,y,z);
    const curve=(a,t)=>{
      const r=.52+.075*Math.sin(3.8*a+seed)+.029*Math.cos(10.1*a);
      return V(Math.sin(a)*r*t**1.38+.054*t*t,.028+r*t*(.70+.32*Math.cos(a)),
        .064*t*t*Math.sin(a*3.2+seed)+.018*t*Math.sin(a*11+3*t));
    };
    function twig(pts,start,end,colorA,colorB) {
      const offset=pos.length/3;
      pts.forEach((p,j)=>{
        const u=j/(pts.length-1),r=start*(1-u)+end*u;
        const tangent=pts[Math.min(pts.length-1,j+1)].clone().sub(pts[Math.max(j-1,0)]).normalize();
        const cross=new T.Vector3().crossVectors(tangent,V(0,0,1)).normalize();
        const normal=new T.Vector3().crossVectors(tangent,cross);
        for(let k=0;k<5;k++){
          const a=k*tau/5,point=p.clone().addScaledVector(cross,r*Math.cos(a)).addScaledVector(normal,r*Math.sin(a));
          pos.push(...point.toArray());color.push(...rgb(colorA,colorB,.22+.64*u+.08*Math.sin(j*9+k)));
          if(j>0){
            const b=offset+j*5+k,c=offset+j*5+(k+1)%5;
            idx.push(b-5,c-5,b,c-5,c,b);
          }
        }
      });
    }
    const count=25;
    const theta=i=>-1.29+2.59*i/(count-1)+.028*Math.sin(i*2.8+seed);
    for(let i=0;i<count;i++){
        const a=theta(i),begin=i%4===0 ? .01 : .22+.11*Math.sin(i*2.3);
      const pts=[];
      for(let j=0;j<=12;j++){
        const t=begin+(1-begin)*j/12;
        const parent=theta(Math.min(count-1,Math.round(i/4)*4));
        pts.push(curve(a+(parent-a)*Math.exp(-11*(t-begin)),t));
      }
      twig(pts,i%4===0 ? .0087 : .0056,.0019,0xb27866,0xf1a98a);
      if(i===count-1)continue;
      for(let j=0;j<6;j++){
        const t=.32+j*.101+.021*Math.cos(i*1.27+j*2);
        const b=theta(i+1),k=.04+.02*Math.sin(j+i*.35);
        twig([curve(a,t),curve((a+b)*.5,t+k),curve(b,t+k*.48)],.0039,.0024,0xbf876e,0xe5ab87);
      }
    }
    const geom=new T.BufferGeometry();
    geom.setAttribute('position',new T.Float32BufferAttribute(pos,3));geom.setAttribute('color',new T.Float32BufferAttribute(color,3));
    geom.setIndex(idx);geom.computeVertexNormals();g.add(new T.Mesh(geom,tissue));fans.push({g,angle,seed});
  }
  seaFan(4.37,5.15,-.69,.44,.9);seaFan(6.47,6.87,.35,.70,2.8);

  // Foliose colonies grow from one attachment; only their chalky outer lips lift off the rock.
  const plateMat=new T.MeshStandardMaterial({vertexColors:true,roughness:.83,side:T.DoubleSide});
  plateMat.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec2 reefUV;\n'+shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nreefUV=uv;');
    shader.fragmentShader='varying vec2 reefUV;\n'+shader.fragmentShader.replace('#include <color_fragment>',`
      #include <color_fragment>
      vec2 q=vec2(cos(reefUV.x*6.28318),sin(reefUV.x*6.28318))*reefUV.y;
      float lamina=sin(reefUV.y*126.+2.1*sin(q.x*16.)+.92*cos(q.y*18.));
      float detail=1.-smoothstep(.27,1.65,fwidth(reefUV.y)*126.);
      vec2 cell=fract(q*56.+vec2(sin(q.y*34.),cos(q.x*23.))*.25)-.5;
      float pores=exp(-20.*dot(cell,cell))*(1.-smoothstep(.25,.94,fwidth(q.x)*56.));
      diffuseColor.rgb*=1.+.085*lamina*detail-.14*pores;
    `);
  };
  underwaterLight(plateMat);
  function plate(cx,cz,rx,rz,rise,bearing,seed,mauve){
    const base=seabed(cx,cz),ca=Math.cos(bearing),sa=Math.sin(bearing);
    physics.solid(cx+.57*rx*ca,base+rise*.65,cz+.57*rx*sa,rx*1.18,rise*.68+.037,rz*1.11,-bearing);
    const root=new T.Group();root.position.set(-cx,base,cz);scene.add(root);
    patch(root,70,20,(u,v)=>{
      const a=tau*u,top=v<=.80,t=top ? v/.80 : 1-(v-.80)/.20;
      const lip=1+.11*Math.sin(a*3+seed)+.071*Math.cos(a*5-.7*seed)+.028*Math.sin(a*11+seed);
      const ex=rx*t*(.63+lip*Math.cos(a)),ez=rz*t*Math.sin(a)*lip;
      const wx=ex*ca-ez*sa,wz=ex*sa+ez*ca;
      const flutes=.019*Math.cos(5*a+seed)+.014*Math.sin(8*a+seed+t*2);
      const y=rise*(.09+.91*t**.72)+t*t*(.022+.68*rz*flutes*4)-.020
        -.072*(top ? 0 : 1-t)-.019*(1-t)*Math.sin(a+seed);
      const tip=Math.min(1,Math.max(0,(t-.84)/.16));
      const hue=.44+.20*Math.cos(a*3+seed+t*7)+.10*Math.sin(t*43+.7*Math.cos(a*7));
      const c=rgb(mauve ? 0x695f70 : 0x646d61,mauve ? 0xaa9098 : 0x9caa92,hue);
      const pale=rgb(0xc4b9a7,0xd8cfba,.49+.22*Math.cos(9*a));
      return [-wx,y,wz,c.map((value,k)=>(value*(1-.86*tip)+pale[k]*tip*.86)*(top ? 1 : .57+.28*t))];
    },plateMat);
  }
  const colonies=[
    [4.45,4.35,.36,.27,.13,-.22,1,1],[4.53,4.45,.29,.23,.22,.78,4,1],
    [4.48,4.26,.24,.17,.19,-1.04,2,0],[4.76,4.52,.28,.20,.105,.22,3,1],
    [4.78,4.62,.21,.16,.14,1.16,7,0],[4.85,4.39,.19,.14,.076,-.70,2,1],
    [5.13,5.04,.21,.15,.14,.56,4,0],[5.23,5.08,.16,.11,.088,-.48,3,0],
    [6.76,6.94,.32,.22,.12,.33,6,0],[6.79,6.83,.24,.18,.16,-.58,2,1],
    [7.07,7.23,.27,.19,.11,1.34,5,0],[8.69,9.73,.28,.18,.11,.24,1,1]
  ];
  colonies.forEach(([x,z,rx,rz,h,...rest])=>plate(x,z,rx*.72,rz*.79,h*.75,...rest));
  function thicket(x,z,size,hue,seed){
    const group=new T.Group();group.position.set(-x,seabed(x,z),z);scene.add(group);
    physics.solid(x,seabed(x,z)+size*.29,z,size*.64,size*.33,size*.55);
    const points=[],colors=[],indices=[],sides=7;
    let state=seed*137+19;
    const rnd=()=>(state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296;
    const hues=[[0x655573,0xb7a1d0,0xdbd7e8],[0x97735b,0xe0b384,0xefdbb3],[0x9d6065,0xc58b90,0xe9bdaf]];
    const [dark,skin,tip]=hues[hue];
    function finger(start,dir,len,r,depth){
      const tangent=dir.clone().normalize(),side=new T.Vector3().crossVectors(tangent,new T.Vector3(0,0,1)).normalize();
      const normal=new T.Vector3().crossVectors(tangent,side);
      const offset=points.length/3,bend=(rnd()-.42)*len*.38,phase=rnd()*tau;
      const at=t=>start.clone().addScaledVector(tangent,len*t).addScaledVector(side,bend*t*t);
      for(const [j,t] of [0,.32,.68,.90,1].entries()){
        const center=at(t),radius=r*(1-.36*t)*(t>.98 ? .70 : 1);
        for(let k=0;k<sides;k++){
          const a=tau*k/sides+phase,scar=.90+.15*rnd();
          const p=center.clone().addScaledVector(side,radius*Math.cos(a)*scar).addScaledVector(normal,radius*Math.sin(a)*scar);
          points.push(...p.toArray());
          colors.push(...(t>.88 ? rgb(skin,tip,.38+.49*t) : rgb(dark,skin,.18+.49*t+.22*rnd())));
          if(j){
            const v=offset+j*sides+k,w=offset+j*sides+(k+1)%sides;
            indices.push(v-sides,w-sides,v,v,w-sides,w);
          }
        }
      }
      for(let k=1;k<sides-1;k++)indices.push(offset+4*sides,offset+4*sides+k,offset+4*sides+k+1);
      if(!depth)return;
      const branches=depth===2 ? 4 : 2;
      for(let k=0;k<branches;k++){
        const a=k*2.39+phase+.3*rnd(),d=tangent.clone().multiplyScalar(.57)
          .addScaledVector(side,.68*Math.cos(a)).addScaledVector(normal,.59*Math.sin(a));
        d.y=Math.max(.31,d.y+.20);
        finger(at(.22+.65*(k+rnd()*.6)/branches),d,len*(.42+.23*rnd()),r*.56,depth-1);
      }
    }
    for(let j=0;j<12;j++){
      const a=j*2.399+.14*rnd(),r=size*.32*Math.sqrt(j/12);
      const ox=r*Math.cos(a),oz=r*Math.sin(a);
      finger(new T.Vector3(ox,seabed(x-ox,z+oz)-group.position.y-.024,oz),
        new T.Vector3(.67*Math.cos(a),.81+.48*rnd(),.67*Math.sin(a)),size*(.51+.30*rnd()),size*(.027+.015*rnd()),2);
    }
    const geom=new T.BufferGeometry();geom.setIndex(indices);geom.setAttribute('position',new T.Float32BufferAttribute(points,3));
    geom.setAttribute('color',new T.Float32BufferAttribute(colors,3));geom.computeVertexNormals();group.add(new T.Mesh(geom,tissue));
  }
  for(const p of [[4.66,4.62,.46,0,2],[4.89,5.25,.45,1,3],[5.22,5.05,.31,2,9],
    [5.14,5.73,.58,0,5],[5.29,5.99,.37,1,7],[5.52,6.42,.48,2,13],
    [5.72,6.66,.39,0,8],[6.52,6.73,.54,1,11],[7.12,7.43,.43,0,19]])thicket(...p);
  // Thin ridged shell fragments catch the light at the foot of the shelf.
  for(const [i,[cx,cz]] of [[4.99,4.73],[5.08,4.68],[5.13,4.79],[5.27,4.91],
    [5.35,5.19],[5.55,5.47],[6.48,6.25],[6.59,6.28],[6.68,6.42]].entries()){
    const r=.024+.024*((i*7)%11)/11,pivot=anchor(cx,cz,i*2.399,1);
    patch(pivot,22,5,(u,v)=>{
      const a=-1.31+2.53*u,rad=v*r*(1+.065*Math.cos(15*a));
      const ridge=.5+.5*Math.cos(15*a+i*.41);
      return [rad*Math.sin(a),.011+.018*(1-v*v)+.004*ridge*v,rad*Math.cos(a),
        rgb(0xa99a81,0xe5dac2,.31+.36*ridge+.21*v)];
    });
  }

  const finMat=new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:.68,transparent:true,opacity:.83});
  const pupil=new T.MeshStandardMaterial({color:0x171f21,roughness:.32});
  const iris=new T.MeshStandardMaterial({color:0xb99962,roughness:.55});
  function butterfly(i) {
    const fish=new T.Group(),tail=new T.Group();
    scene.add(fish);fish.add(tail);tail.position.x=-.139;
    // Laterally compressed body, extended snout, eye stripe and oblique chevrons.
    patch(fish,96,64,(u,v)=>{
      const a=v*tau,s=Math.sin(a),env=Math.max(.001,Math.sin(Math.PI*u))**.66;
      const nose=Math.exp(-((u-.92)**2)/.006);
      const x=-.147+.319*u+.023*nose;
      const y=.003+.113*env*s*(1-.62*nose)-.015*nose;
      const z=.048*env*Math.cos(a);
      const stripe=Math.exp(-((u-.796+s*.045)**2)/.00074);
        const chevron=.5+.5*Math.cos(u*61-6*Math.abs(s+.06)+.51*Math.sin(u*19));
      const flank=Math.min(1,Math.max(0,(u-.16)*1.6))*(1-Math.min(1,Math.abs(s)**2.2));
      const spot=Math.exp(-((u-.18)**2/.0024+(s-.53)**2/.043));
      const c=rgb(0xe5a837,0xf3e8b9,Math.min(.95,.09+.72*flank+.15*chevron));
      const factor=(1-.90*stripe)*(1-.84*spot)*(1-.39*chevron**4*flank)*(1-.09*Math.max(s,0));
      return [x,y,z,c.map(c=>c*factor)];
    });
    patch(tail,18,18,(u,v)=>{
      const ray=.5+.5*Math.cos(v*63+u*.58),w=(v-.5)*2;
      return [-u*(.068-.014*w*w),w*(.014+.036*u),.004*Math.sin(Math.PI*v)*u,
        rgb(0xd19d42,0xf3d67c,.25+.35*ray+.20*u)];
    },finMat);
    for(const sign of [-1,1]){
      patch(fish,38,8,(u,v)=>{
        const x=-.132+.206*u,base=.113*Math.sin(Math.PI*(x+.147)/.319)**.66;
        const web=.032*(1-u)*Math.sin(Math.PI*u)**.45;
        const filament=sign>0 ? .057*Math.exp(-((u-.21)**2)/.0036) : 0;
        return [x-(web+filament)*v*.75,sign*(base*.92+(web+filament)*v),0,
          rgb(0xd7a138,0xffdf85,.2+.35*v+.16*Math.cos(90*u))];
      },finMat);
    }
    for(const side of [-1,1]){
      for(const [radius,mat,offset] of [[.011,iris,.000],[.0075,pupil,.005]]){
        const eye=new T.Mesh(new T.SphereGeometry(radius,12,8),mat);
        eye.position.set(.115,.022,side*(.034+offset));eye.scale.z=.56;fish.add(eye);
      }
      patch(fish,9,10,(u,v)=>[.035-u*.067,(v-.5)*u*.047-.018*u,
        side*(.039+.024*u),rgb(0xbda669,0xe4d59b,.56+.25*Math.cos(46*v))],finMat);
    }
    fish.scale.setScalar(i ? .80 : 1.11);
    const s=fish.scale.x;
    swimmers.push({fish,tail,i,motion:physics.swimmer(.051*s,.138*s,.205*s,{speed:.174,turn:.77,acceleration:.31,response:1.55})});
  }
  butterfly(0);butterfly(1);
  const clownfish=[];
  const ocellaris=new T.Group(),rudder=new T.Group();ocellaris.add(rudder);rudder.position.x=-.103;
  patch(ocellaris,76,38,(u,v)=>{
    const a=tau*v,s=Math.sin(a),body=Math.max(.002,Math.sin(u*Math.PI))**.65;
    const x=-.108+.232*u,y=.066*body*s,z=.036*body*Math.cos(a);
    const bands=Math.min(Math.abs(u-.208-.025*s)/.036,Math.abs(u-.506+.038*s-.040*s*s)/(.064+.016*s),
      Math.abs(u-.777+.043*s)/.054);
    const gold=rgb(0xe16627,0xffa044,.37+.24*Math.cos(a)+.18*u);
    const c=bands<.87 ? [.83,.80,.70] : bands<1.34 ? [.026,.036,.032] : gold;
    return [x,y,z,c];
  });
  patch(rudder,10,18,(u,v)=>[-u*(.045+.013*Math.sin(Math.PI*v)),(2*v-1)*(.010+.028*u),
    .001*Math.sin(tau*v),u>.79 ? [.082,.060,.042] : rgb(0xdb6627,0xf9a254,.30+.31*Math.cos(48*v))],finMat);
  for(const side of [-1,1]){
    patch(ocellaris,18,5,(u,v)=>[-.067+.135*u,.045*Math.sin(Math.PI*u)**.6+v*.028*Math.sin(Math.PI*u),.003*side,
      v>.81 ? [.085,.058,.040] : rgb(0xc5612a,0xf49b4b,.45+.25*Math.sin(59*u))],finMat);
    patch(ocellaris,10,8,(u,v)=>[.046-u*.044,(v-.5)*u*.039-.006*u,side*(.029+.021*u),
      u>.81 ? [.08,.068,.045] : rgb(0xdf752a,0xf6b46f,.41+.25*Math.cos(40*v))],finMat);
    const eye=new T.Mesh(new T.SphereGeometry(.008,10,7),pupil);
    eye.position.set(.086,.011,side*.026);ocellaris.add(eye);
  }
  for(let i=0;i<5;i++){
    const f=i===0 ? ocellaris : ocellaris.clone(),s=.78+.24*((i*7)%11)/10;
    scene.add(f);f.scale.setScalar(s);
    clownfish.push({f,tail:f.children[0],motion:physics.swimmer(.041*s,.073*s,.146*s)});
  }

  function star(x,z,r,a) {
    const base=seabed(x,z),ridges=[1,.88,1.05,.94,.84];
    const s=new T.Group();s.position.set(-x,base,z);scene.add(s);
    patch(s,160,18,(u,v)=>{
      const k=Math.round(u*5)%5,phase=tau*(u*5-Math.round(u*5));
      const spine=(.5+.5*Math.cos(phase))**4.0;
      const ang=a+u*tau+.13*v*v*Math.sin(k*2.1)*spine;
      const d=r*v*(.27+.73*spine*ridges[k]);
      const wx=x+Math.cos(ang)*d,wz=z+Math.sin(ang)*d;
      const knobs=(.5+.5*Math.cos(d*261)*Math.cos(phase*5))**4;
      const h=r*(.17*(1-v**2)**.66+.017*knobs*(1-v));
      return [x-wx,seabed(wx,wz)-base+.012+h,wz-z,rgb(0xb47552,0xe6ac79,.25+knobs*.45+.16*spine)];
    });
  }
  star(4.86,4.62,.14,1.32);

  const bells=[],bellMaterial=new T.MeshPhongMaterial({color:0xaccfd3,vertexColors:true,
    specular:0xc1deda,shininess:43,side:T.DoubleSide,transparent:true,opacity:.42,depthWrite:false});
  const silk=new T.MeshBasicMaterial({color:0xdad1c9,transparent:true,opacity:.49,depthWrite:false});
  for(const [i,[x,y,z,scale]] of [[8.79,-1.59,11.5,.19]].entries()){
    const bell=new T.Group();scene.add(bell);
    patch(bell,52,13,(u,v)=>{
      const a=u*tau,r=Math.sin(v*1.72),edge=v**5;
      const w=r*(1+.025*edge*Math.cos(16*a));
      const canals=Math.pow(.5+.5*Math.cos(16*a+.24*Math.sin(v*7)),12);
      return [w*Math.cos(a),.63*Math.cos(v*1.72)-.055*edge*Math.cos(16*a),w*Math.sin(a),
        rgb(0x7199ac,0xf2eae4,.19+.39*edge+.33*canals)];
    },bellMaterial);
    for(let k=0;k<4;k++){
      const a=tau*k/4;
      const arc=new T.Mesh(new T.TorusGeometry(.154,.021,5,23,Math.PI*1.62),silk);
      arc.rotation.set(Math.PI/2,0,a-.91);arc.position.set(Math.cos(a)*.22,.34,Math.sin(a)*.22);bell.add(arc);
      patch(bell,4,13,(u,v)=>{
        const phase=a+v*4.8,wide=(1-v*.82)*.079;
        return [Math.cos(phase)*(.19-.08*v)+(u-.5)*wide,-.025-v*(.53+.12*Math.sin(a+.55)),
          Math.sin(phase)*(.19-.08*v)+(u-.5)*wide*Math.sin(phase),[.64,.69,.71]];
      },bellMaterial);
    }
    bells.push({bell,x,y,z,scale,i});
  }
  // One draw call for the pelagic shoal, including its forked tails.
  const baitShape=new T.BufferGeometry(),verts=[],tri=[];
  for(const [j,[x,h,w]] of [[-.14,.029,.006],[-.095,.011,.008],[-.057,.029,.020],
    [.041,.036,.024],[.091,.024,.017],[.124,.002,.002]].entries()){
    for(let i=0;i<8;i++){
      const a=i*tau/8;
      verts.push(x+(j===0 ? .040*(1-Math.abs(Math.sin(a))) : 0),Math.sin(a)*h,Math.cos(a)*w);
      if(j){const n=j*8+i,b=j*8+(i+1)%8;tri.push(n-8,b-8,n,b-8,b,n);}
    }
  }
  baitShape.setAttribute('position',new T.Float32BufferAttribute(verts,3));baitShape.setIndex(tri);baitShape.computeVertexNormals();
  const silver=new T.MeshStandardMaterial({color:0xc0d2d3,roughness:.32,metalness:.16,side:T.DoubleSide});
  const school=new T.InstancedMesh(baitShape,silver,23),pose=new T.Object3D(),flash=new T.Color();
  school.frustumCulled=false;school.instanceMatrix.setUsage(T.DynamicDrawUsage);scene.add(school);
  const formation=Array.from({length:school.count},(_,i)=>{
    const a=i*2.39996,r=Math.sqrt((i+.5)/school.count);
    return [1.15*r*Math.cos(a),.245*r*Math.sin(a),.39*Math.sin(a*1.73),.73+.25*Math.cos(a*2.6)];
  });
  const silverBodies=formation.map(([, , ,s])=>physics.swimmer(.025*s,.037*s,.139*s));
  function update(time,visit){
    clock.value=time;
    const orbit=.205*time-.71;
    for(let i=0;i<formation.length;i++){
      const [dx,dy,dz,scale]=formation[i],p=orbit+dx*.19,turn=Math.cos(p);
      const x=11.64+3.50*Math.sin(p)+dx*.54,z=11.14+1.45*Math.cos(p)+dz;
      const y=-2.13+dy+.24*Math.sin(p-.32)+.033*Math.cos(time*2.1+i);
      silverBodies[i].aim(x,y,z,Math.atan2(3.5*turn,-1.45*Math.sin(p)));
      flash.setRGB(.48,.67,.69).multiplyScalar(.87+.82*Math.exp(-((Math.sin(p)+.72)**2)/.014));
      school.setColorAt(i,flash);
    }
    school.instanceColor.needsUpdate=true;
    for(const {g,angle,seed} of fans){
      g.rotation.set(.034*Math.sin(.93*time+seed),angle,.019*Math.cos(time*.76+seed));
    }
    for(const {tail,i,motion} of swimmers){
      const a=visit.clock*.206+i*1.03+.25,dx=.62*Math.cos(a),dz=-.43*Math.sin(a);
      const x=5.51+.62*Math.sin(a)+.14*i,z=5.68+.43*Math.cos(a)+.24*i;
      motion.aim(x,Math.max(seabed(x,z)+.32,-2.56+.063*Math.sin(a*1.45+i)),z,Math.atan2(dx,dz));
      tail.rotation.y=(.18+.068*Math.sin(.63*time+i))*Math.sin(time*5.4+i);
    }
    clownfish.forEach(({motion,tail},i)=>{
      const a=visit.clock*.64+i*2.399,travel=i<visit.roaming ? visit.travel : 0;
      const x=5.36+.19*Math.cos(a)+.11*i+travel*(.92+.055*i);
      const z=5.92+.21*Math.sin(a)+.107*i+travel*.76+visit.bend*visit.side*.34;
      const y=Math.max(seabed(x,z)+.28,-2.68+.087*Math.sin(a*1.07)+travel*.16);
      motion.aim(x,y,z,Math.atan2(-Math.sin(a),Math.cos(a)));
      tail.rotation.y=(.30+.14*travel)*Math.sin(time*(8.8+i*.19)+i);
    });
    for(const {bell,x,y,z,scale,i} of bells){
      const beat=time*2.22+i*2.7,k=Math.sin(beat);
      bell.scale.set(scale*(1-.115*k),scale*(1+.17*k),scale*(1-.115*k));
      bell.position.set(-x+.18*Math.sin(time*.34+i),y+.105*Math.sin(time*.51+i)-.034*Math.cos(beat),z+.24*Math.cos(time*.26+i));
      bell.rotation.z=.22+.10*Math.sin(time*.42+i);
    }
  }
  function apply(time){
    for(const {fish,i,motion} of swimmers){
      const p=motion.body.position;
      fish.position.set(-p.x,p.y,p.z);fish.rotation.set(.067*Math.sin(time*.69+i),-Math.PI/2-motion.yaw,.051*Math.cos(time*.52+i));
    }
    for(const [i,{f,motion}] of clownfish.entries()){
      const p=motion.body.position;
      f.position.set(-p.x,p.y,p.z);f.rotation.set(.062*Math.sin(time*.92+i),-Math.PI/2-motion.yaw,.047*Math.cos(time*.83+i));
    }
    for(let i=0;i<silverBodies.length;i++){
      const f=silverBodies[i],p=f.body.position;
      pose.position.set(-p.x,p.y,p.z);
      pose.rotation.set(.075*Math.cos(time*3.6+i),-Math.PI/2-f.yaw,.28*Math.sin(time*.205+i*.037));
      pose.scale.setScalar(formation[i][3]);pose.updateMatrix();school.setMatrixAt(i,pose.matrix);
    }
    school.instanceMatrix.needsUpdate=true;
  }
  function dispose(){
    scene.traverse(o=>o.geometry?.dispose());
    school.dispose();silver.dispose();tissue.dispose();plateMat.dispose();finMat.dispose();iris.dispose();pupil.dispose();bellMaterial.dispose();silk.dispose();
  }
  return {scene,update,apply,dispose};
}

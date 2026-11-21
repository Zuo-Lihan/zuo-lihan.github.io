import {HUT,smooth,SUN} from './ocean-simulation.js';

function timberMaps(T) {
  const size = 128, albedo = new Uint8Array(size*size*4), relief = new Uint8Array(albedo.length);
  const tau = 2*Math.PI;
  let seed = 150097;
  for (let y=0;y<size;y++) for (let x=0;x<size;x++) {
    const u=x/size*tau, v=y/size*tau;
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const grit=(seed>>>24)/255;
    const warp=.16*Math.sin(u)+.10*Math.sin(u*3+2*v)+.048*Math.sin(u*6-v);
    const grain=.5+.5*Math.sin((v+warp)*17);
    const fib=.5+.5*Math.sin((v+warp*.61)*39+.31*Math.sin(u*8));
    const value=.75+grain*.092+fib*.042+grit*.090+.035*Math.sin(5*v+Math.sin(u));
    const i=(y*size+x)*4;
    albedo[i]=value*255; albedo[i+1]=value*249; albedo[i+2]=value*233; albedo[i+3]=255;
    relief[i]=relief[i+1]=relief[i+2]=(grain*.45+fib*.21+grit*.32)*255;
    relief[i+3]=255;
  }
  const make = (pixels,colorSpace) => {
    const tex = new T.DataTexture(pixels,size,size);
    tex.colorSpace = colorSpace;
    tex.wrapS=tex.wrapT=T.RepeatWrapping;
    tex.generateMipmaps=true;
    tex.minFilter=T.LinearMipmapLinearFilter;
    tex.magFilter=T.LinearFilter;
    tex.needsUpdate=true;
    return tex;
  };
  const color = make(albedo,T.SRGBColorSpace), bump=make(relief,T.NoColorSpace);
  return {map:color,bumpMap:bump,bumpScale:.015};
}

function coastalObjects(T) {
  const scene = new T.Scene();
  const timber = timberMaps(T);
  const wood = new T.MeshStandardMaterial({color: 0xb68153, roughness: .91, ...timber});
  const board = new T.MeshStandardMaterial({color: 0xd0a877, roughness: .82, ...timber});
  const roof = new T.MeshStandardMaterial({color: 0x456368, roughness: .83});
  const trim = new T.MeshStandardMaterial({color: 0xf7e7c9, roughness: .8});
  const hull = new T.MeshStandardMaterial({color: 0xe9e2cd, roughness: .64, side:T.DoubleSide, vertexColors:true});
  const keel = new T.MeshStandardMaterial({color: 0x214c53, roughness: .57});
  const window = new T.MeshStandardMaterial({color: 0x315265, emissive: 0xf6ab48, emissiveIntensity: 0});
  const green = new T.MeshStandardMaterial({color: 0x56794e, roughness: .9, side: T.DoubleSide});
  const cliff = new T.MeshStandardMaterial({color: 0x828372, roughness: .97, flatShading:false});
  const shirt = new T.MeshStandardMaterial({color: 0x355b62, roughness: .93});
  const skin = new T.MeshStandardMaterial({color: 0xc4875d, roughness: .86});
  const shorts = new T.MeshStandardMaterial({color: 0x3d403a, roughness: .88});
  const buoy = new T.MeshStandardMaterial({color: 0xe36843, roughness: .48});
  const sun = new T.DirectionalLight(0xffcf99,2.25);
  sun.position.set(-SUN[0],SUN[1],SUN[2]);
  scene.add(sun,new T.HemisphereLight(0xd9e6fa,0xb9977f,1.52));

  function mesh(parent, geometry, material, x=0,y=0,z=0) {
    const result = new T.Mesh(geometry,material);
    result.position.set(x,y,z);
    parent.add(result);
    return result;
  }
  const box = (parent, mat, w,h,d,x=0,y=0,z=0) => mesh(parent,new T.BoxGeometry(w,h,d),mat,x,y,z);
  const sphere = (parent, mat, r,x,y,z) => mesh(parent,new T.SphereGeometry(r,12,8),mat,x,y,z);
  function bar(parent,mat,a,b,r,top=r) {
    const start = new T.Vector3(...a), end = new T.Vector3(...b);
    const part = mesh(parent,new T.CylinderGeometry(top,r,start.distanceTo(end),8),mat);
    part.position.copy(start).lerp(end,.5);
    part.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),end.sub(start).normalize());
    return part;
  }
  const plumage = new T.MeshStandardMaterial({color:0xf3efe5,roughness:.95});
  const overwing = new T.MeshStandardMaterial({color:0xa9b5b9,roughness:.96});
  const beak = new T.MeshStandardMaterial({color:0xc7a46c,roughness:.74});
  const pinion = new T.MeshStandardMaterial({roughness:.91,side:T.DoubleSide,vertexColors:true});
  const gulls = [];
  for(let i=0;i<3;i++){
    const bird=new T.Group();
    scene.add(bird);
    const torso=sphere(bird,plumage,.082,0,-.005,-.008);
    torso.scale.set(.70,.74,1.79);
    const back=sphere(bird,overwing,.071,0,.017,-.039);
    back.scale.set(.73,.63,1.53);
    const neck=sphere(bird,plumage,.050,0,.024,.093);
    neck.scale.set(.86,.92,1.13);
    const head=sphere(bird,plumage,.044,0,.033,.127);
    head.scale.set(.87,.89,1.07);
    bar(bird,beak,[0,.026,.148],[0,.023,.204],.015,.004);
    for(const side of [-1,1]){
      sphere(bird,keel,.0058,side*.037,.043,.143);
      bar(bird,beak,[side*.021,-.039,-.051],[side*.028,-.047,-.131],.006,.003);
    }
    const tailPositions=[];
    for(let j=0;j<9;j++){
      const feather=j/8-.5;
      const a=[feather*.081,.005,-.132];
      const b=[feather*.16,-.012,-.244+.034*Math.abs(feather*2.)];
      tailPositions.push(...a,b[0]-.012,b[1],b[2],...b,b[0]+.015,b[1],b[2]+.010,...b,...a);
    }
    const tail=new T.BufferGeometry();
    tail.setAttribute('position', new T.Float32BufferAttribute(tailPositions,3));
    tail.computeVertexNormals();
    mesh(bird,tail,new T.MeshStandardMaterial({color:0xdedfd9,side:T.DoubleSide,roughness:.96}));

    const wings=[];
    for(const side of [-1,1]){
      const root=new T.Group(), wrist=new T.Group();
      root.position.set(side*.044,.020,.028);
      wrist.position.set(side*.209,.044,.046);
      root.add(wrist);
      bird.add(root);
      function panel(parent,profile,outer){
        const positions=[],colors=[];
        const edge=(j,v,camber=0)=>{
          const [x,y,front,back]=profile[j];
          return [side*x,y+camber,front+(back-front)*v];
        };
        function triangle(a,b,c,underside=false) {
          for(const v of [a,b,c]){
            positions.push(...v);
            const dark=outer ? smooth(.074,.227,Math.abs(v[0])) : 0;
            const base=underside ? .87 : .54;
            const speck=.016*Math.sin(v[0]*71.+v[2]*42.);
            colors.push(base-dark*.46+speck,base+.024-dark*.47+speck,base+.035-dark*.48+speck);
          }
        }
        for(let j=0;j<profile.length-1;j++){
          const a=edge(j,0),b=edge(j+1,0);
          const c=edge(j,.40,.026),d=edge(j+1,.40,.019);
          const e=edge(j,.92),f=edge(j+1,.92);
          triangle(a,c,b);triangle(b,c,d);
          triangle(c,e,d);triangle(d,e,f);
          triangle(a,b,e,true);triangle(b,f,e,true);
          if(outer){
            const count=j===2 ? 3 : 4;
            for(let k=0;k<count;k++){
              const t=(k+.45)/count;
              const x=e[0]+(f[0]-e[0])*t;
              const y=e[1]+(f[1]-e[1])*t;
              const z=e[2]+(f[2]-e[2])*t;
              const tip=[x+side*(.029+j*.005),y-.009,z-.028-k*.004];
              triangle([x-side*.013,y,z+.048],[x+side*.012,y,z+.027],tip);
            }
          }
        }
        const geometry=new T.BufferGeometry();
        geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
        geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
        geometry.computeVertexNormals();
        mesh(parent,geometry,pinion);
      }
      panel(root,[[0,0,.074,-.082],[.081,.034,.080,-.103],[.149,.049,.070,-.104],[.209,.044,.049,-.097]],false);
      panel(wrist,[[0,0,.003,-.140],[.078,.017,-.018,-.154],[.151,.020,-.049,-.171],[.228,.005,-.106,-.169]],true);
      wings.push({root,wrist});
    }
    const catchFish=new T.Group();
    const silver = sphere(catchFish,new T.MeshStandardMaterial({color:0x93aeac,roughness:.49,metalness:.12}),.022,0,0,.005);
    silver.scale.set(.72,.91,2.5);
    const fin=mesh(catchFish,new T.ConeGeometry(.028,.038,3),overwing,0,0,-.047);
    fin.rotation.x=Math.PI/2;
    catchFish.position.set(.013,-.009,.197);
    catchFish.rotation.y=1.19;
    catchFish.visible=false;
    bird.add(catchFish);
    gulls.push({bird,wings,catchFish});
  }
  const cabin = new T.Group();
  cabin.position.set(-HUT[0], .79, HUT[1]);
  cabin.rotation.y = -.18;
  scene.add(cabin);
  box(cabin,board,1.85,.11,1.38,0,.12,-.12);
  for (let i=0;i<14;i++) box(cabin,board,.127,.013,.31,-.843+i*.127,.183,-.659);
  for (const x of [-.78,.78]) for (const z of [-.66,.44]) box(cabin,wood,.13,.55,.13,x,-.14,z);
  box(cabin,wood,1.38,.85,.92,0,.59,0);
  for (let i=0;i<8;i++) {
    box(cabin,board,1.41,.028,.031,0,.19+i*.104,-.47);
    box(cabin,board,.032,.028,.91,.695,.19+i*.104,0);
  }
  for (const x of [-.67,.67]) box(cabin,trim,.055,.88,.05,x,.61,-.467);
  box(cabin,trim,.37,.68,.034,-.30,.51,-.48);
  box(cabin,wood,.30,.60,.036,-.30,.50,-.50);
  sphere(cabin,trim,.025,-.197,.49,-.528);
  box(cabin,trim,.48,.36,.038,.31,.68,-.48);
  box(cabin,window,.39,.27,.043,.31,.68,-.498);
  box(cabin,trim,.026,.29,.025,.31,.68,-.525);
  box(cabin,trim,.41,.022,.025,.31,.68,-.525);
  box(cabin,trim,.042,.31,.45,.695,.68,-.03);
  box(cabin,window,.047,.238,.36,.712,.68,-.03);
  const gable = new T.Shape().moveTo(-.72,0).lineTo(0,.41).lineTo(.72,0).closePath();
  mesh(cabin,new T.ExtrudeGeometry(gable,{depth:.96,bevelEnabled:false}),wood,0,1.01,-.48);
  for (const side of [-1,1]) {
    const panel = box(cabin,roof,.97,.068,1.30,side*.416,1.235,0);
    panel.rotation.z = -side*.518;
    for (let i=0;i<9;i++) {
      const rib = box(cabin,roof,.992,.044,.021,side*.416,1.270,-.56+i*.14);
      rib.rotation.z = -side*.518;
    }
  }
  bar(cabin,trim,[0,1.50,-.67],[0,1.50,.67],.035);
  box(cabin,board,.48,.12,.28,-.30,.02,-.96);
  for (const x of [-.89,.89]) {
    bar(cabin,wood,[x,.19,-.82],[x,.57,-.82],.035);
    bar(cabin,wood,[x,.19,.43],[x,.57,.43],.035);
    bar(cabin,trim,[x,.55,-.82],[x,.55,.43],.026);
    bar(cabin,wood,[x,.35,-.82],[x,.35,.43],.015);
  }
  box(cabin,wood,.155,.28,.18,.31,1.38,.34);
  box(cabin,trim,.19,.04,.213,.31,1.53,.34);

  const jetty = new T.Group();
  scene.add(jetty);
  jetty.position.set(.38,.257,5.08);
  jetty.rotation.y = -.065;
  for(let k=0;k<15;k++) box(jetty,k%3 ? board : wood,.099,.048,.52,-.62+k*.104,.10,0);
  for(const x of [-.57,.05,.72]) for(const z of [-.20,.20]) {
    bar(jetty,wood,[x,-.68,z],[x,.19,z],.039);
  }
  for(const z of [-.19,.19]) bar(jetty,wood,[-.62,.061,z],[.83,.061,z],.034);

  const stoneGeometry=new T.IcosahedronGeometry(1,2);
  const vertices=stoneGeometry.attributes.position;
  for(let i=0;i<vertices.count;i++){
    const x=vertices.getX(i),y=vertices.getY(i),z=vertices.getZ(i);
    const erosion=1+.12*Math.sin(x*8.+y*2.+z*4.)+.085*Math.sin(x*3.+y*8.-z*5.);
    const flatten=.53*y*erosion+.085*Math.sin(x*3.+z*4.);
    vertices.setXYZ(i,x*erosion,flatten,z*erosion);
  }
  stoneGeometry.computeVertexNormals();
  for(const [i,x,y,z,scale] of [
    [1,.38,.16,8.92,.34],[2,.02,.28,9.35,.52],[3,.71,.24,9.29,.41],[4,-.66,.32,9.82,.40],
    [5,.71,.27,10.29,.48],[6,1.15,.18,9.74,.29],[7,1.63,.24,11.7,.45],[8,2.05,.14,11.44,.27]
  ]){
    const stone=mesh(scene,stoneGeometry,cliff,x,y,z);
    stone.scale.set(scale,scale*(.94+(i%3)*.12),scale*(.64+(i%4)*.13));
    stone.rotation.set(.12*(i%3),i*1.47,.06*(i%4));
  }

  const palm = new T.Group();
  palm.position.set(-HUT[0]+1.34,.97,HUT[1]-.33);
  scene.add(palm);
  const trunk = t => [.28*t*t,1.65*t,-.19*t*t];
  for(let i=0;i<17;i++) bar(palm,i%4===0 ? board : wood,trunk(i/17),trunk((i+1)/17),.070-i*.0024,.067-i*.0024);
  for (let i=0;i<10;i++) {
    const angle = i*2.399, length = .72+(i%4)*.113;
    const frond = new T.Group();
    frond.position.set(.28,1.65,-.19);
    frond.rotation.y = angle;
    palm.add(frond);
    function spine(t) {return [t*length,Math.sin(t*Math.PI)*(.22+(i%3)*.06)-t*t*.36,0];}
    for (let j=0;j<5;j++) bar(frond,green,spine(j/5),spine((j+1)/5),.014-j*.002);
    const vertices = [];
    for (let j=1;j<=16;j++) for (const side of [-1,1]) {
      const t = j/17, [x,y] = spine(t);
      const spread = Math.sin(Math.PI*t)*(.235+i%3*.049)*side;
      const bend = [x+.079,y-.023,spread*.51];
      const tip = [x+.21*(1-t*.55),y-.105,spread];
      const w = .019*(1-.55*t);
      vertices.push(x,y,0,...bend,x+w,y,0, x+w,y,0,...bend,bend[0]+w,bend[1]-.009,bend[2], ...bend,...tip,bend[0]+w,bend[1]-.009,bend[2]);
    }
    const leaves = new T.BufferGeometry();
    leaves.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
    leaves.computeVertexNormals();
    mesh(frond,leaves,green);
  }
  for(const [x,y,z] of [[.25,1.57,-.23],[.32,1.54,-.14],[.36,1.60,-.21],[.22,1.60,-.18]]){
    const coconut=sphere(palm,wood,.061,x,y,z);
    coconut.scale.set(.92,1.32,.99);
    coconut.rotation.z=(x-.28)*6;
  }
  for(const [x,y,z,scale,angle] of [[-.35,.63,8.66,.69,.82],[-1.15,.79,11.22,.78,1.66]]){
    const distant=palm.clone();
    distant.position.set(-x,y,z);
    distant.scale.setScalar(scale);
    distant.rotation.y=angle;
    scene.add(distant);
  }

  const vessel = new T.Group();
  scene.add(vessel);
  const planks = [], paint = [], insidePaint = [], indices = [];
  const steps = 40, beams = 24;
  const cross = (t,q) => {
    const radius = Math.pow(Math.max(.0001,Math.sin(Math.PI*(.10+t*.90))),.74)*(.312+.059*(1-t));
    const y = .117+.13*t**5+.038*(1-t)**5;
    const z = -.73+1.69*t;
    const angle = q*Math.PI*.5;
    return new T.Vector3(radius*Math.sin(angle),y-.272*Math.cos(angle),z);
  };
  const rail = [];
  for(let i=0;i<=steps;i++){
    const t=i/steps;
    rail.push(cross(t,-1));
    for(let j=0;j<=beams;j++){
      const q=j/beams*2-1;
      planks.push(...cross(t,q).toArray());
      const teal = (1-smooth(.69,.84,Math.abs(q)))*.92;
      paint.push(1-teal*.87,1-teal*.56,1-teal*.51);
      const amber = .74+.06*Math.cos(q*20.)+.10*Math.abs(q);
      insidePaint.push(amber,amber*.87,amber*.66);
      if (i && j) {
        const id=i*(beams+1)+j;
        indices.push(id,id-1,id-beams-2,id,id-beams-2,id-beams-1);
      }
    }
  }
  for(let i=steps;i>=0;i--) rail.push(cross(i/steps,1));
  mesh(vessel,new T.TubeGeometry(new T.CatmullRomCurve3(rail,true),100,.021,6,true),board);
  const shell = new T.BufferGeometry();
  shell.setAttribute('position',new T.Float32BufferAttribute(planks,3));
  shell.setAttribute('color',new T.Float32BufferAttribute(paint,3));
  shell.setIndex(indices);
  shell.computeVertexNormals();
  mesh(vessel,shell,hull);
  const innerShell=shell.clone();
  const interior=innerShell.attributes.position;
  for(let i=0;i<interior.count;i++) interior.setXYZ(i,interior.getX(i)*.965,interior.getY(i)+.014,interior.getZ(i)*.983);
  innerShell.setAttribute('color',new T.Float32BufferAttribute(insidePaint,3));
  innerShell.computeVertexNormals();
  mesh(vessel,innerShell,hull);
  const sternShape=new T.Shape();
  const first=cross(0,-1);
  sternShape.moveTo(first.x,first.y);
  for(let i=1;i<=20;i++){
    const pt=cross(0,i/10-1);
    sternShape.lineTo(pt.x,pt.y);
  }
  sternShape.closePath();
  mesh(vessel,new T.ExtrudeGeometry(sternShape,{depth:.018,bevelEnabled:false}),wood,0,0,-.737);
  box(vessel,board,.57,.041,.145,0,.085,-.37);
  box(vessel,board,.55,.041,.145,0,.085,.22);
  box(vessel,wood,.35,.04,.90,0,-.06,0);
  for (let i=0;i<5;i++) box(vessel,board,.055,.013,.79,-.126+i*.063,-.031,.01);
  const ring = mesh(vessel,new T.TorusGeometry(.096,.023,8,22),buoy,.122,.142,.245);
  ring.rotation.x = Math.PI/2-.12;
  for (const x of [-1,1]) {
    bar(vessel,wood,[x*.282,.138,-.54],[x*.263,.144,.40],.012);
    const oar = box(vessel,board,.062,.023,.195,x*.26,.144,.44);
    oar.rotation.y = x*.087;
    sphere(vessel,trim,.021,x*.31,.133,.088);
  }
  const coil = mesh(vessel,new T.TorusGeometry(.061,.009,6,19),trim,0,.023,.61);
  coil.rotation.x = Math.PI/2;
  box(vessel,keel,.153,.102,.165,.159,.032,-.54);
  const angler = new T.Group();
  angler.position.set(0,.105,-.29);
  vessel.add(angler);
  const cloth = new T.MeshStandardMaterial({color:0x566b66,roughness:.99});
  const capBand = new T.MeshStandardMaterial({color:0x4b453c,roughness:.84});
  const seam = new T.MeshStandardMaterial({color:0x78968d,roughness:.95});
  const torso=mesh(angler,new T.CapsuleGeometry(.083,.091,5,12),shirt,0,.139,-.004);
  torso.scale.set(1.07,1.,.76);
  torso.rotation.x=.15;
  const waistband=sphere(angler,shorts,.087,0,.060,.009);
  waistband.scale.set(1.04,.49,1.);
  bar(angler,shirt,[-.077,.227,-.008],[.077,.227,-.008],.045);
  bar(angler,seam,[-.043,.175,-.060],[.036,.175,-.060],.009,.009);
  bar(angler,skin,[0,.224,-.003],[0,.287,-.006],.039,.045);
  const collar=mesh(angler,new T.TorusGeometry(.047,.008,7,18),seam,0,.249,-.008);
  collar.rotation.x=Math.PI/2;
  const headPivot=new T.Group();
  headPivot.position.set(0,.285,-.014);
  angler.add(headPivot);
  const skull=sphere(headPivot,skin,.069,0,.016,.001);
  skull.scale.set(.90,1.14,.91);
  const jaw=sphere(headPivot,skin,.053,0,-.019,.015);
  jaw.scale.set(.88,.75,1.04);
  for(const x of [-.063,.063]){
    sphere(headPivot,skin,.017,x,-.001,-.002).scale.set(.72,1.1,.60);
    sphere(headPivot,capBand,.005,x*.51,.019,.057);
  }
  sphere(headPivot,skin,.018,0,-.001,.065).scale.set(.61,.72,1.);
  bar(headPivot,capBand,[-.018,-.025,.054],[.018,-.024,.054],.0025);
  const hat=mesh(headPivot,new T.CylinderGeometry(.061,.080,.066,24,1),board,0,.084,-.009);
  hat.scale.z=1.08;
  const brim=mesh(headPivot,new T.CylinderGeometry(.122,.123,.014,28),trim,0,.053,-.005);
  brim.scale.z=1.09;
  mesh(headPivot,new T.CylinderGeometry(.078,.081,.014,22),capBand,0,.064,-.008);
  for (const x of [-.060,.060]) {
    bar(angler,shorts,[x,.055,0],[x,.024,.14],.034);
    sphere(angler,shorts,.033,x,.024,.14);
    bar(angler,cloth,[x,.021,.14],[x,-.098,.16],.030,.033);
    sphere(angler,capBand,.037,x,-.112,.192).scale.set(.79,.53,1.42);
  }
  const castArm = new T.Group();
  castArm.position.set(-.088,.211,0);
  angler.add(castArm);
  bar(castArm,shirt,[0,0,0],[-.067,-.071,.075],.028);
  sphere(castArm,seam,.029,-.067,-.071,.075).scale.set(.92,.90,.82);
  bar(castArm,skin,[-.067,-.071,.075],[-.104,-.042,.167],.019);
  sphere(castArm,skin,.023,-.104,-.042,.167);
  sphere(castArm,skin,.011,-.092,-.030,.181);
  const reel=mesh(castArm,new T.CylinderGeometry(.027,.027,.024,16),keel,-.112,-.061,.214);
  reel.rotation.z=Math.PI/2;
  bar(castArm,trim,[-.128,-.068,.211],[-.146,-.091,.224],.004);
  bar(angler,shirt,[.086,.202,0],[.14,.09,.061],.027);
  bar(angler,skin,[.14,.09,.061],[.088,.077,.151],.019);
  const rod = [];
  for(let i=0;i<8;i++){
    const width=.011-i*.00094;
    rod.push(mesh(castArm,new T.CylinderGeometry(width*.92,width,1.,5),i<2 ? board : shorts));
  }
  const tip = new T.Object3D();
  tip.position.set(-.26,.15,.80);
  castArm.add(tip);
  const bobber = new T.Group();
  sphere(bobber,buoy,.065,0,0,0).scale.set(.70,1.1,.70);
  sphere(bobber,trim,.043,0,-.036,0);
  scene.add(bobber);
  const lineGeometry = new T.BufferGeometry();
  const linePositions = new T.Float32BufferAttribute(new Float32Array(75),3);
  lineGeometry.setAttribute('position',linePositions);
  const line = new T.Line(lineGeometry,new T.LineBasicMaterial({color:0xe6f1e7,transparent:true,opacity:.22,depthWrite:false}));
  line.frustumCulled = false;
  scene.add(line);

  return {scene,cabin,palm,vessel,angler,headPivot,castArm,rod,tip,bobber,line,linePositions,window,timber,gulls};
}

export {coastalObjects};

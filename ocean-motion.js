import {RIPPLE_COUNT,FOV,NEAR,FAR,HUT,BOAT,FISH_GROUPS,FISH_GROUP_SIZE,bedOnLand,clamp,smooth,height,lensRay,pickWater,rippleField,shoaling,seabirdFlight,turtleCoast,mantaPatrol,lagoonBounds,lagoonTile,reefPasses} from './ocean-simulation.js';
import {causticTexture,detailTexture,shellTexture,waterShader} from './ocean-shaders.js';
import {coastalObjects} from './ocean-models.js';
import {reefResidents} from './ocean-reef.js';
import {underwaterBubbles} from './ocean-bubbles.js';

const stage = document.querySelector('.ocean-stage');
const runway = stage?.closest('.ocean-runway');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

if (stage && runway && location.protocol !== 'file:') {
  Promise.all([import('./vendor/three.module.js'),import('./ocean-collisions.js')]).then(([three,physics])=>start(three,physics.aquariumPhysics)).catch(error => {
    console.warn('Ocean animation unavailable:', error.message);
  });
}

function start(THREE,aquariumPhysics) {
  const renderer = new THREE.WebGLRenderer({alpha: false, antialias: true, powerPreference: 'low-power'});
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  let shaderFailed = false;
  renderer.debug.onShaderError = (gl,program,vertex,fragment) => {
    shaderFailed = true;
    console.warn('Ocean shader unavailable:',gl.getProgramInfoLog(program),gl.getShaderInfoLog(vertex),gl.getShaderInfoLog(fragment));
  };
  const canvas = renderer.domElement;
  canvas.className = 'ocean-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const detail = detailTexture(THREE);
  const caustics = causticTexture(THREE);
  const bank=new THREE.DataTexture(lagoonTile(),lagoonBounds.nx,lagoonBounds.nz,THREE.RGBAFormat);
  bank.minFilter=bank.magFilter=THREE.LinearFilter;bank.needsUpdate=true;
  const impulseField = rippleField(THREE);
  const fish = shoaling(THREE);
  const coast = turtleCoast(THREE);
  const physics=aquariumPhysics(),bubbles=underwaterBubbles(THREE,renderer);
  const smallBodies=fish.models.map((p,i)=>{
    const scale=p.w*(i%10===0 ? 1.21 : 1.)*(i>=20 ? 1.39 : 1.);
    return physics.swimmer(.145*scale,.29*scale,1.22*scale);
  });
  const shoalBounds=Array.from({length:FISH_GROUPS},()=>new THREE.Vector4());
  const hullBody=physics.solid(BOAT[0],0,BOAT[1],.39,.25,.95,0,true);
  const rayBodies=[0,1,2].map(()=>physics.solid(0,-1,0,.94,.31,.68,0,true));
  const turtleModels = coast.turtles.map(()=>new THREE.Vector4());
  const turtleTerrain = coast.turtles.map(()=>new THREE.Vector4());
  const rays=rayBodies.map(()=>new THREE.Vector4());
  const visitors=reefPasses();
  const patrol=mantaPatrol();
  const pulses = Array.from({length: RIPPLE_COUNT}, () => new THREE.Vector4(0,0,0,0));
  const uniforms = {
    aspect: {value: 1}, time: {value: 0}, pitch: {value: .14}, yaw:{value:0}, disturbance: {value: impulseField.texture},
    eye: {value: new THREE.Vector3()}, detail: {value: detail}, caustics: {value: caustics}, ripples: {value: pulses},
    boat: {value:new THREE.Vector2(...BOAT)}, boatYaw:{value:0}, floatPoint: {value:new THREE.Vector2()}, fishing: {value:0},
    hut: {value:new THREE.Vector2(...HUT)}, fishDisturbance: {value:new THREE.Vector3(0,0,-20)},
    fishModels: {value:fish.models}, fishDirections: {value:fish.directions},shoalBounds:{value:shoalBounds},
    turtleModels: {value:turtleModels}, tracks:{value:coast.texture},
    turtleTerrain:{value:turtleTerrain},feet:{value:coast.turtles.flatMap(t=>t.feet)},shellAtlas:{value:shellTexture(THREE)},
    rays:{value:rays},rayScale:{value:new THREE.Vector2()},lagoon:{value:bank},
    sandAlbedo: {value:null}, sandNormal:{value:null}, sandRoughness:{value:null}, sandReady:{value:0},
    limestoneMap:{value:null},stoneReady:{value:0}
  };
  const material = new THREE.ShaderMaterial({
    uniforms, depthTest: true, depthWrite: true,
    vertexShader: 'varying vec2 vScreen; void main(){vScreen = position.xy*.5+.5; gl_Position = vec4(position.xy,0.,1.);}',
    fragmentShader: waterShader()
  });
  const geometry = new THREE.PlaneGeometry(2, 2);
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(geometry, material));
  const camera = new THREE.Camera();
  const decor = coastalObjects(THREE);
  let reef=null;
  const gullFlight = seabirdFlight(THREE,decor.gulls.length);
  const shoreCamera = new THREE.PerspectiveCamera(2*Math.atan(FOV)*180/Math.PI,1,NEAR,FAR);
  const marker = new THREE.Vector3();
  const boatScreen = new THREE.Vector3(), hutScreen = new THREE.Vector3(), anglerScreen = new THREE.Vector3();
  const tipPosition = new THREE.Vector3();
  const launch = new THREE.Vector3();
  const landing = new THREE.Vector3();
  const rodA = new THREE.Vector3(), rodB = new THREE.Vector3(), rodTangent = new THREE.Vector3();
  const axis = new THREE.Vector3(0,1,0);
  const castControl = document.createElement('button');
  castControl.className = 'ocean-cast';
  castControl.type = 'button';
  castControl.setAttribute('aria-pressed','false');
  stage.append(castControl);
  renderer.autoClear = false;
  const abort = new AbortController();
  const {signal} = abort;
  const sandMaps=[];
  let frame = 0, last = 0, time = 0, progress = 0, target = 0, visible = false;
  let frameCost=33, sampleCount=0, renderBudget=1;
  let travel = 1, bounds, next = 0, previousPoint, previousWake = -10;
  let cast = false, changedAt = -10, released = false, landed = false, lit = false;
  let birdReact = -20, lastSwoop = -30, attemptedFishing = false;
  let reelFrom = new THREE.Vector3();
  let lastRain = 0;
  const constrained = navigator.connection?.saveData || (navigator.hardwareConcurrency || 8) <= 4;
  const loader=new THREE.TextureLoader();
  const layers=['Albedo','Normal','Roughness'];
  Promise.allSettled(layers.map(layer=>loader.loadAsync(new URL(`./assets/coastal-sand-${layer.toLowerCase()}.jpg`,import.meta.url).href)))
    .then(results=>{
      if(signal.aborted || results.some(result=>result.status!=='fulfilled')){
        for(const result of results)if(result.status==='fulfilled')result.value.dispose();
        return;
      }
      results.forEach((result,i)=>{
        const texture=result.value;
        texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
        if(i===0)texture.colorSpace=THREE.SRGBColorSpace;
        texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
        texture.needsUpdate=true;
        uniforms['sand'+layers[i]].value=texture;
        sandMaps.push(texture);
      });
      uniforms.sandReady.value=1;
      if(visible && reduced.matches)paint();
    });

  function updateCastControl() {
    castControl.setAttribute('aria-label', document.body.dataset.lang === 'zh' ? (cast ? '小船：收线' : '小船：抛竿') : (cast ? 'Fishing boat: Reel in' : 'Fishing boat: Cast line'));
    castControl.setAttribute('aria-pressed', String(cast));
  }
  function toggleCast() {
    cast = !cast;
    changedAt = time;
    reelFrom.copy(decor.bobber.position);
    released = false;
    landed = false;
    attemptedFishing = false;
    updateCastControl();
    if (reduced.matches) paint();
  }
  updateCastControl();
  const language = new MutationObserver(updateCastControl);
  language.observe(document.body,{attributes:true,attributeFilter:['data-lang']});
  castControl.addEventListener('click',toggleCast,{signal});
  function pulse(x,z,amplitude) {
    const local = impulseField.splash(x,z,amplitude,time);
    pulses[next].set(x,z,time,amplitude*(local ? .33 : .70));
    next = (next+1)%pulses.length;
  }

  function readScroll() {
    const rect = runway.getBoundingClientRect();
    target = clamp(-rect.top / travel);
    bounds = stage.getBoundingClientRect();
  }
  function paint(delta=0) {
    const p = reduced.matches ? 0 : progress;
    const descend = smooth(0.,.57,p);
    const turn = smooth(.06,.52,p);
    const depth = smooth(.57,1,p);
    const z = -1.7 + .23*descend + 3.95*depth;
    const narrowStart = uniforms.aspect.value < .72 ? .43 : -.26;
    const x = narrowStart*(1-descend) + 2.86*descend + (uniforms.aspect.value<.72 ? 1.61 : 1.98)*depth;
    const clearance = 13.1*(1-descend) - .62*descend - 1.08*depth;
    const bob = height(x,z,time)*smooth(.38,.49,p)*smooth(.10,.76,clearance);
    const pitch = -1.41 + 1.46*turn - .145*depth;
    const yaw=(uniforms.aspect.value<.72 ? .36 : .58)*depth;
    uniforms.yaw.value=yaw;
    const eye = uniforms.eye.value.set(x,clearance+bob,z);
    uniforms.time.value = time;
    uniforms.pitch.value = pitch;
    coast.update(delta,time);
    for(let i=0;i<coast.turtles.length;i++){
      const {x,y,z,heading,crossSlope,forwardSlope,length,phase}=coast.turtles[i];
      turtleModels[i].set(x,y,z,heading);
      turtleTerrain[i].set(crossSlope,forwardSlope,length,phase);
    }
    castControl.hidden = p > .32;
    const bx = BOAT[0] + Math.sin(time*.69)*.15;
    const bz = BOAT[1] + Math.cos(time*.51)*.12;
    uniforms.boat.value.set(bx,bz);
    const age = reduced.matches ? 2 : time-changedAt;
    const flight = clamp((age-.22)/.71);
    decor.vessel.position.set(-bx,height(bx,bz,time)+.124,bz);
    decor.vessel.rotation.set(Math.sin(time*1.43)*.052,-.26+Math.sin(time*.65)*.068,Math.cos(time*1.65)*.048);
    uniforms.boatYaw.value = decor.vessel.rotation.y;
    const visit=visitors(eye.y<-.24 ? delta : 0,rays[2]);
    for(let i=0;i<2;i++){
      const scale=patrol(i,time,uniforms.aspect.value,rays[i]);
      uniforms.rayScale.value.setComponent(i,scale);
    }
    const load = cast ? Math.sin(Math.PI*smooth(0.,.27,age)) : .13*Math.sin(age*15.)*(1-smooth(0.,.63,age));
    const reactionAge=time-birdReact;
    const surprise=smooth(0.,.16,reactionAge)*(1-smooth(.33,1.21,reactionAge));
    decor.angler.rotation.x=-.18*surprise;
    decor.angler.rotation.y=.36*surprise;
    decor.headPivot.rotation.set(-.25*surprise,.54*surprise,.06*surprise);
    decor.castArm.rotation.x = -.11 + (cast ? .86*load-.32*smooth(.15,.43,age) : -.22*load)+.29*surprise;
    const flex = .11*load + (cast && flight>0. ? .042*Math.sin(flight*13.)*(1-flight) : 0);
    function rodPoint(v,out) {
      out.set(-.106-v*.154,-.047+v*.197+flex*v*v,.144+v*.656);
    }
    decor.rod.forEach((part,i)=>{
      rodPoint(i/8,rodA);rodPoint((i+1)/8,rodB);
      part.position.copy(rodA).lerp(rodB,.5);
      rodTangent.copy(rodB).sub(rodA);
      part.scale.y=rodTangent.length()+.002;
      part.quaternion.setFromUnitVectors(axis,rodTangent.normalize());
    });
    rodPoint(1,decor.tip.position);
    decor.tip.getWorldPosition(tipPosition);
    const bobber = decor.bobber.position;
    if(cast && age>=.22){
      if(!released){
        released=true;
        launch.copy(tipPosition);
        landing.set(-(bx+1.45),0.,bz+1.60);
      }
      const endHeight=height(-landing.x,landing.z,time)+.036;
      bobber.copy(launch).lerp(landing,flight);
      bobber.y=launch.y+(endHeight-launch.y)*flight+.5*9.81*.71*.71*flight*(1-flight);
      if(flight>=1.){
        bobber.x += .038*Math.sin(time*1.39);
        bobber.z += .033*Math.sin(time*1.18);
        if(!landed && !reduced.matches){
          pulse(-bobber.x,bobber.z,.030);
          landed=true;lastRain=time;
        }
        if(landed && time-lastRain>4.25 && !reduced.matches) {
          pulse(-bobber.x,bobber.z,.0095);
          lastRain = time;
        }
      }
    } else if(cast) {
      bobber.copy(tipPosition);bobber.y-=.081;
    } else {
      bobber.copy(reelFrom).lerp(tipPosition,smooth(0.,.69,age));
      bobber.y+=.104*Math.sin(Math.PI*smooth(0.,.69,age));
    }
    uniforms.floatPoint.value.set(-bobber.x,bobber.z);
    uniforms.fishing.value = cast && landed ? smooth(.93,1.66,age) : 0;
    if(p>.35 && p<.53 && cast && landed && age>3.8 && time-lastSwoop>12 && !attemptedFishing){
      attemptedFishing=gullFlight.encounter('catch',-bobber.x+.31,bobber.z+.14,time);
      if(attemptedFishing)lastSwoop=time;
    }
    fish.update(delta,time,uniforms.fishDisturbance.value,uniforms.floatPoint.value,uniforms.fishing.value);
    hullBody.set(bx,decor.vessel.position.y-.16,bz,-decor.vessel.rotation.y);
    rays.forEach((r,i)=>rayBodies[i].set(r.x,r.y,r.z,r.w));
    smallBodies.forEach((f,i)=>{
      const model=fish.models[i],dir=fish.directions[i];
      f.aim(model.x,model.y,model.z,Math.atan2(dir.x,dir.y),model.w>0);
    });
    if(p>.48 && !reef){
      reef=reefResidents(THREE,physics,caustics);
      loader.load(new URL('./assets/coastal-limestone.jpg',import.meta.url).href,t=>{
        if(signal.aborted){t.dispose();return;}
        t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.needsUpdate=true;
        sandMaps.push(t);uniforms.limestoneMap.value=t;uniforms.stoneReady.value=1;
      });
    }
    reef?.update(time,visit);
    physics.step(delta);
    smallBodies.forEach((f,i)=>{
      const p=f.body.position;fish.models[i].set(p.x,p.y,p.z,fish.models[i].w);
      fish.directions[i].set(Math.sin(f.yaw),Math.cos(f.yaw));
    });
    shoalBounds.forEach((b,g)=>{
      const start=FISH_GROUP_SIZE*g,end=start+FISH_GROUP_SIZE;b.set(0,0,0,0);
      for(let j=start;j<end;j++){const p=fish.models[j];b.x+=p.x;b.y+=p.y;b.z+=p.z;}
      b.multiplyScalar(1/FISH_GROUP_SIZE);
      for(let j=start;j<end;j++){const p=fish.models[j];b.w=Math.max(b.w,Math.hypot(p.x-b.x,p.y-b.y,p.z-b.z)+p.w*2.25);}
    });
    gullFlight.step(delta,time);
    const reaction=gullFlight.takeCue();
    if(reaction){
      birdReact=time;
      if(reaction.kind==='catch'){
        const caught=fish.catchNear(reaction.x,reaction.z,time);
        if(!caught)gullFlight.birds[reaction.index].carryUntil=0;
        pulse(reaction.x,reaction.z,.024);
        uniforms.fishDisturbance.value.set(reaction.x,reaction.z,time);
      }
    }
    renderer.clear();
    renderer.render(scene,camera);
    shoreCamera.position.set(-eye.x,eye.y,eye.z);
    shoreCamera.lookAt(-eye.x-Math.sin(yaw)*Math.cos(pitch),eye.y+Math.sin(pitch),eye.z+Math.cos(yaw)*Math.cos(pitch));
    shoreCamera.updateMatrixWorld();
    if(eye.y<-.24){
      reef.apply(time);
      renderer.render(reef.scene,shoreCamera);
      bubbles.draw(time,shoreCamera);
    }
    if (p < .57) {
      decor.gulls.forEach(({bird,wings,catchFish},i)=>{
        const {position,heading,pitch,bank,vertical,carryUntil} = gullFlight.birds[i];
        bird.position.set(-position.x,position.y,position.z);
        bird.rotation.set(pitch,-heading,bank);
        catchFish.visible=time<carryUntil;
        catchFish.rotation.x=.13*Math.sin(time*11.);
        const beat=time*7.27+i*1.97;
        const burst=clamp(smooth(.36,.89,Math.sin(time*.91+i*2.22)) + Math.max(0,vertical)*.32);
        const lift = .061+burst*(.41*Math.sin(beat)-.092*Math.sin(beat*2.));
        wings.forEach(({root,wrist},side)=>{
          const sign=side===0 ? -1 : 1;
          root.rotation.z = sign*lift;
          wrist.rotation.z = sign*(.11+.29*burst*Math.sin(beat-.79));
          wrist.rotation.y = sign*(.043+.11*burst*Math.cos(beat-.54));
        });
      });
      decor.bobber.visible = cast || age < .69;
      decor.line.visible = decor.bobber.visible;
      const length=tipPosition.distanceTo(bobber);
      decor.line.material.opacity=landed ? .18 : .26;
      for (let i=0;i<25;i++) {
        const u = i/24;
        const arc=4*u*(1-u);
        marker.copy(tipPosition).lerp(bobber,u);
        marker.y += arc*length*(landed ? -.077 : .109*Math.sin(flight*Math.PI)-.034);
        marker.x += arc*length*.028*Math.sin(time*1.42);
        decor.linePositions.setXYZ(i,marker.x,marker.y,marker.z);
      }
      decor.linePositions.needsUpdate = true;
      boatScreen.copy(decor.vessel.position);
      boatScreen.y += .24;
      boatScreen.project(shoreCamera);
      decor.angler.getWorldPosition(anglerScreen);
      anglerScreen.y += .27;
      anglerScreen.project(shoreCamera);
      castControl.style.left = (boatScreen.x*.5+.5)*100+'%';
      castControl.style.top = (.5-boatScreen.y*.5)*100+'%';
      castControl.hidden ||= Math.abs(boatScreen.x)>.96 || Math.abs(boatScreen.y)>.94;
      hutScreen.copy(decor.cabin.position);
      hutScreen.y += .89;
      hutScreen.project(shoreCamera);
      renderer.render(decor.scene,shoreCamera);
    }
  }
  function resize() {
    const {width,height} = stage.getBoundingClientRect();
    if (!width || !height) return;
    travel = Math.max(1,runway.offsetHeight-stage.offsetHeight);
    uniforms.aspect.value = width/height;
    const narrow = width < 700;
    const [hx,hz] = narrow ? [-.52,4.10] : HUT;
    uniforms.hut.value.set(hx,hz);
    decor.cabin.position.set(-hx,narrow ? .21 : .29,hz);
    decor.cabin.scale.setScalar(narrow ? .62 : .91);
    decor.palm.position.set(-hx+(narrow ? .83 : 1.35),narrow ? .38 : .53,hz+(narrow ? -.25 : .08));
    decor.palm.scale.setScalar(narrow ? .58 : .84);
    shoreCamera.aspect = width/height;
    shoreCamera.updateProjectionMatrix();
    const maxPixels = (constrained ? 540000 : width < 700 ? 570000 : 1310000)*renderBudget;
    renderer.setPixelRatio(Math.min(1.55, devicePixelRatio, Math.sqrt(maxPixels/(width*height))));
    renderer.setSize(width,height,false);
    readScroll();
    if (visible || !canvas.isConnected) paint();
  }
  function animate(now) {
    frame = 0;
    if (!visible || document.hidden || reduced.matches) return;
    if (!last || now-last >= (constrained ? 33 : 24)) {
      const interval=last ? now-last : 33;
      const delta=Math.min(.14,interval/1000);
      frameCost+=(interval-frameCost)*.09;
      if (++sampleCount>=34 && frameCost>47 && renderBudget>.47){
        renderBudget=Math.max(.47,renderBudget*.78);
        sampleCount=0;
        resize();
      }
      time += delta;
      impulseField.advance(delta,time);
      last = now;
      progress += (target-progress)*(1-Math.exp(-delta*15));
      paint(delta);
    }
    frame = requestAnimationFrame(animate);
  }
  function activity() {
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
    if (!visible || document.hidden) return;
    if (reduced.matches) {
      pulses.forEach(pulse => {pulse.w = 0;});
      paint();
    } else {
      frame = requestAnimationFrame(animate);
    }
  }
  function interact(event, click) {
    if (!visible || reduced.matches || !bounds || event.target.closest('a, button')) return;
    if (!click && (event.pointerType === 'touch' || time - previousWake < .074)) return;
    if (click && (!event.isPrimary || event.button !== 0)) return;
    const u = (event.clientX-bounds.left)/bounds.width*2-1;
    const v = 1-(event.clientY-bounds.top)/bounds.height*2;
    function over(point, radius) {
      return Math.abs(point.z) < 1 && Math.hypot((u-point.x)*bounds.width/2,(v-point.y)*bounds.height/2)<radius;
    }
    const overBoat = progress < .36 && over(boatScreen,32);
    const overHut = progress < .30 && over(hutScreen,34);
    const overAngler = progress >= .32 && progress < .53 && over(anglerScreen,32);
    stage.classList.toggle('ocean-interactive',overBoat || overHut || overAngler);
    if(click && overAngler){
      const bx=uniforms.boat.value.x, bz=uniforms.boat.value.y;
      if(gullFlight.encounter('pass',bx+.73,bz+.75,time)) lastSwoop=time;
      return;
    }
    if (click && overBoat) {toggleCast();return;}
    if (click && overHut) {
      lit = !lit;
      decor.window.emissiveIntensity = lit ? 1.25 : 0;
      return;
    }
    const ray = lensRay(u,v,uniforms.aspect.value,uniforms.pitch.value,uniforms.yaw.value);
    const eye=uniforms.eye.value;
    if (!click && progress>.27 && progress<.53 && ray[1]>.065 && eye.y>.18 && v>.02) {
      gullFlight.aim(eye,ray,time);
      return;
    }
    if (!click) gullFlight.release();
    if(click && eye.y<-.29 && bubbles.release(eye,ray,time,reef?.scene))return;
    const point = pickWater(ray,eye.toArray(),time);
    const fishPoint = fish.nearRay(eye,ray) || point;
    const disturbance = uniforms.fishDisturbance.value;
    if (fishPoint && (time-disturbance.z > .17 || Math.hypot(disturbance.x-fishPoint[0],disturbance.y-fishPoint[1])>.54)) {
      disturbance.set(...fishPoint,time);
    }
    if (!point || bedOnLand(point)) return;
    const distance = previousPoint ? Math.hypot(point[0]-previousPoint[0],point[1]-previousPoint[1]) : .2;
    if (!click && distance < .09 && time - previousWake < .25) return;
    pulse(...point,click ? .029 : clamp(distance*.023,.007,.014));
    previousPoint = point;
    previousWake = time;
  }
  function stop() {
    cancelAnimationFrame(frame);
    observer.disconnect();
    sizeObserver.disconnect();
    language.disconnect();
    abort.abort();
    canvas.remove();
    castControl.remove();
    geometry.dispose();
    material.dispose();
    detail.dispose();
    caustics.dispose();
    bank.dispose();
    impulseField.texture.dispose();
    coast.texture.dispose();
    reef?.dispose();
    bubbles.dispose();
    sandMaps.forEach(texture=>texture.dispose());
    const materials = new Set();
    decor.scene.traverse(object => {
      object.geometry?.dispose();
      if (object.material) materials.add(object.material);
    });
    materials.forEach(item => item.dispose());
    decor.timber.map.dispose();
    decor.timber.bumpMap.dispose();
    uniforms.shellAtlas.value.dispose();
    renderer.dispose();
  }
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && bounds) progress = target;
    activity();
  });
  const sizeObserver = new ResizeObserver(resize);
  readScroll();
  progress = target;
  resize();
  if (shaderFailed || renderer.getContext().isContextLost()) {
    stop();
    return;
  }
  stage.prepend(canvas);
  observer.observe(stage);
  sizeObserver.observe(stage);
  window.addEventListener('scroll',readScroll,{passive:true,signal});
  stage.addEventListener('pointermove', event => interact(event,false),{passive:true,signal});
  stage.addEventListener('pointerdown', event => interact(event,true),{passive:true,signal});
  stage.addEventListener('pointerleave', () => {previousPoint = null;gullFlight.release();},{signal});
  document.addEventListener('visibilitychange',activity,{signal});
  reduced.addEventListener('change',activity,{signal});
  canvas.addEventListener('webglcontextlost',stop,{once:true,signal});
  window.addEventListener('pagehide',event => {if (!event.persisted) stop();},{signal});
}

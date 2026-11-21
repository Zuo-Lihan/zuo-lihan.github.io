import {seabed,height} from './ocean-simulation.js';

export function underwaterBubbles(T,renderer){
  const capacity=48, pool=[],scene=new T.Scene(),tmp=new T.Object3D();
  const size=new T.Vector2(),zero=new T.Vector2(),caster=new T.Raycaster();
  let copy=null,lastBurst=-10;
  const uniforms={waterFrame:{value:null},viewport:{value:size}};
  const mat=new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,
    vertexShader:`varying vec3 facing;varying vec3 sight;varying float radius;
      void main(){
        vec4 p=modelViewMatrix*instanceMatrix*vec4(position,1.);
        facing=mat3(viewMatrix)*mat3(instanceMatrix)*normal;
        sight=-p.xyz;radius=length(instanceMatrix[0].xyz)/max(.1,-p.z);
        gl_Position=projectionMatrix*p;
      }`,
    fragmentShader:`uniform sampler2D waterFrame;uniform vec2 viewport;
      varying vec3 facing;varying vec3 sight;varying float radius;
      void main(){
        vec3 n=normalize(facing);float cosI=clamp(dot(n,normalize(sight)),0.,1.);
        float tir=1.-smoothstep(.62,.73,cosI);
        vec2 uv=gl_FragCoord.xy/viewport;
        vec2 bend=n.xy*radius*vec2(viewport.y/viewport.x,1.)*(.34+.47*(1.-cosI));
        vec3 through=texture2D(waterFrame,clamp(uv-bend,.001,.999)).rgb;
        vec3 mirror=mix(vec3(.035,.17,.23),vec3(.41,.68,.74),smoothstep(-.35,.9,n.y));
        float glint=pow(max(0.,dot(n,normalize(vec3(-.40,.71,.59)))),29.);
        float secondary=pow(max(0.,dot(n,normalize(vec3(.39,-.80,.43)))),51.);
        vec3 col=mix(through*.96,mirror,tir*.83)+vec3(.84,.94,.94)*(glint*.89+secondary*.34);
        gl_FragColor=vec4(col,smoothstep(.008,.18,cosI)*.93);
      }`});
  const spheres=new T.InstancedMesh(new T.SphereGeometry(1,16,12),mat,capacity);
  spheres.frustumCulled=false;spheres.instanceMatrix.setUsage(T.DynamicDrawUsage);scene.add(spheres);
  function release(eye,ray,time,reef){
    if(time-lastBurst<.23 || eye.y>-.29)return false;
    let distance=3.7,previous=.06;
    // Use the first visible solid on the pick ray; an open-water click releases locally.
    for(let d=.1;d<=16;d+=.10){
      const x=eye.x+d*ray[0],y=eye.y+d*ray[1],z=eye.z+d*ray[2];
      if(y>=height(x,z,time)-.13){distance=Math.min(distance,d*.68);break;}
      if(y<=seabed(x,z)){
        let lo=previous,hi=d;
        for(let j=0;j<7;j++){const m=(lo+hi)/2;if(eye.y+m*ray[1]>seabed(eye.x+m*ray[0],eye.z+m*ray[2]))lo=m;else hi=m;}
        distance=lo;break;
      }
      previous=d;
    }
    caster.ray.origin.set(-eye.x,eye.y,eye.z);caster.ray.direction.set(-ray[0],ray[1],ray[2]);
    caster.far=distance;
    const first=reef && caster.intersectObjects(reef.children,true)[0];
    if(first)distance=first.distance;
    distance=Math.max(.20,distance-.045);
    const x=eye.x+ray[0]*distance,z=eye.z+ray[2]*distance;
    const y=Math.max(seabed(x,z)+.035,eye.y+ray[1]*distance+.013);
    if(y>height(x,z,time)-.065)return false;
    lastBurst=time;
    const n=7+Math.floor(Math.random()*4);
    for(let i=0;i<n && pool.length<capacity;i++){
      const k=Math.random(),r=(.013+.039*k*k)*Math.min(1.58,Math.max(.84,distance*.24));
      pool.push({x:x+(Math.random()-.5)*.115,y,z:z+(Math.random()-.5)*.093,r,
        seed:Math.random()*6.28,born:time+i*.061+.027*Math.random(),speed:.27+.36*k});
    }
    return true;
  }
  function draw(time,camera){
    let count=0;
    for(let i=pool.length-1;i>=0;i--){
      const b=pool[i],t=time-b.born;if(t<0)continue;
      const rise=b.speed*(t-.15*(1-Math.exp(-t/.15))),phase=b.seed+t*4.1;
      const x=b.x+.041*t+.024*(Math.sin(phase)-Math.sin(b.seed)),z=b.z+.022*t+.013*Math.sin(phase*.83);
      const y=b.y+rise,r=b.r*(1+.045*rise)*Math.min(1,.3+t*9);
      if(y+r>=height(x,z,time) || t>22){pool.splice(i,1);continue;}
      tmp.position.set(-x,y,z);tmp.rotation.z=.14*Math.sin(phase);
      tmp.scale.set(r*(1+.063*Math.sin(phase)),r*(.96-b.r*1.2),r);tmp.updateMatrix();
      spheres.setMatrixAt(count++,tmp.matrix);
    }
    if(!count)return;
    renderer.getDrawingBufferSize(size);
    if(!copy || copy.image.width!==size.x || copy.image.height!==size.y){
      copy?.dispose();copy=new T.FramebufferTexture(size.x,size.y);
      copy.magFilter=copy.minFilter=T.LinearFilter;uniforms.waterFrame.value=copy;
    }
    renderer.copyFramebufferToTexture(zero,copy);
    spheres.count=count;spheres.instanceMatrix.needsUpdate=true;renderer.render(scene,camera);
  }
  function dispose(){spheres.dispose();spheres.geometry.dispose();mat.dispose();copy?.dispose();}
  return {release,draw,dispose};
}

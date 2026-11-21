import {World,SAPBroadphase,Body,Heightfield,Plane,Vec3,ConvexPolyhedron} from './vendor/cannon-es.js';
import {seabed,clamp} from './ocean-simulation.js';

// A tapered convex hull retains the different width, height and length of each species.
function hull(width,height,length) {
  const vertices=[new Vec3(0,0,-length)],faces=[],N=8;
  for(const z of [-.53,.12,.65]){
    const k=Math.sqrt(1-z*z);
    for(let i=0;i<N;i++){
      const a=i*2*Math.PI/N;
      vertices.push(new Vec3(width*k*Math.cos(a),height*k*Math.sin(a),length*z));
    }
  }
  vertices.push(new Vec3(0,0,length));
  for(let i=0;i<N;i++){
    const a=1+i,b=1+(i+1)%N;
    faces.push([0,b,a],[a,b,b+N,a+N],[a+N,b+N,b+2*N,a+2*N],[a+2*N,b+2*N,vertices.length-1]);
  }
  return new ConvexPolyhedron({vertices,faces});
}
export function aquariumPhysics(){
  const world=new World({gravity:new Vec3(0,0,0)});
  world.broadphase=new SAPBroadphase(world);
  world.solver.iterations=10;
  world.defaultContactMaterial.friction=.03;world.defaultContactMaterial.restitution=0;
  const cell=.19,x0=-4,z0=18,data=[];
  for(let i=0;i<=119;i++){
    const row=[];for(let j=0;j<=140;j++)row.push(seabed(x0+i*cell,z0-j*cell)+.018);
    data.push(row);
  }
  function fixed(shape,x,y,z){
    const body=new Body({mass:0,shape,position:new Vec3(x,y,z),collisionFilterGroup:2,collisionFilterMask:1});
    world.addBody(body);return body;
  }
  const floor=fixed(new Heightfield(data,{elementSize:cell}),x0,0,z0);
  floor.quaternion.setFromAxisAngle(new Vec3(1,0,0),-Math.PI/2);
  const ceiling=fixed(new Plane(),0,-.18,0);
  ceiling.quaternion.setFromAxisAngle(new Vec3(1,0,0),Math.PI/2);
  const axis=new Vec3(0,1,0),swimmers=[],solids=[];
  function solid(x,y,z,w,h,l,yaw=0,moving=false){
    const b=fixed(hull(w,h,l),x,y,z);
    if(moving)b.type=Body.KINEMATIC;
    b.quaternion.setFromAxisAngle(axis,yaw);
    const item={body:b,w,h,l,set(px,py,pz,a){b.position.set(px,py,pz);b.quaternion.setFromAxisAngle(axis,a);b.aabbNeedsUpdate=true;}};
    solids.push(item);return item;
  }
  function swimmer(w,h,l,{speed=2.3,turn=3.2,acceleration=9,response=4}={}){
    const body=new Body({mass:Math.max(.03,w*h*l*120),shape:hull(w,h,l),fixedRotation:true,
      linearDamping:.15,collisionFilterGroup:1,collisionFilterMask:3});
    const f={body,w,h,l,speed,turn,acceleration,response,goal:new Vec3(),yaw:0,desired:0,active:false,
      aim(x,y,z,a,enabled=true){
        this.goal.set(x,y,z);this.desired=a;
        if(this.active===enabled)return;
        this.active=enabled;
        if(enabled){
          this.yaw=a;body.position.set(x,Math.max(y,seabed(x,z)+h+.02),z);
          body.velocity.set(0,0,0);body.quaternion.setFromAxisAngle(axis,a);
          body.aabbNeedsUpdate=true;world.addBody(body);
        }else world.removeBody(body);
      }
    };
    swimmers.push(f);return f;
  }
  let debt=0;
  function step(delta){
    const dt=1/60;
    debt=Math.min(.15,debt+delta);
    while(debt>=dt){
      debt-=dt;
      for(const f of swimmers){
        if(!f.active)continue;
        const {body:b,goal}=f,p=b.position,v=b.velocity;
        let vx=(goal.x-p.x)*f.response,vy=clamp((goal.y-p.y)*f.response,-1.1,1.1),vz=(goal.z-p.z)*f.response;
        const lookX=p.x+.23*v.x,lookZ=p.z+.23*v.z;
        vy+=clamp((seabed(lookX,lookZ)+f.h+.10-p.y)*4,0,1.3);
        for(const s of solids){
          const q=s.body.position,dx=lookX-q.x,dz=lookZ-q.z;
          const reach=Math.max(s.w,s.l)+f.l+.20,d=Math.hypot(dx,dz);
          if(d>=reach || Math.abs(p.y-q.y)>s.h+f.h+.17)continue;
          const push=(reach-d)/Math.max(.04,d);
          vx+=dx*push;vz+=dz*push;
        }
        const limit=Math.min(1,f.speed/Math.max(.00001,Math.hypot(vx,vy,vz)));
        const ax=vx*limit-v.x,ay=vy*limit-v.y,az=vz*limit-v.z;
        const blend=Math.min(1-Math.exp(-dt*4.6),dt*f.acceleration/Math.max(.00001,Math.hypot(ax,ay,az)));
        v.x+=ax*blend;v.y+=ay*blend;v.z+=az*blend;
        const heading=Math.hypot(v.x,v.z)>.024 ? Math.atan2(v.x,v.z) : f.yaw;
        f.yaw+=clamp(Math.atan2(Math.sin(heading-f.yaw),Math.cos(heading-f.yaw)),-dt*f.turn,dt*f.turn);
        b.quaternion.setFromAxisAngle(axis,f.yaw);b.aabbNeedsUpdate=true;
      }
      world.step(dt);
    }
  }
  return {swimmer,solid,step};
}

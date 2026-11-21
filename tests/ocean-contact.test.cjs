const {test}=require('node:test');
const assert=require('node:assert/strict');

test('a cruising butterflyfish cannot jump to a new target on a slow display frame',async()=>{
  const {aquariumPhysics}=await import('../ocean-collisions.js');
  const sim=aquariumPhysics(),f=sim.swimmer(.051,.138,.205,{speed:.174,turn:.77,acceleration:.31,response:1.55});
  f.aim(8,-1.6,7,0);
  for(let i=0;i<240;i++){
    const dt=i%6===0 ? .12 : 1/30,p=f.body.position.clone(),yaw=f.yaw;
    f.aim(i<110 ? 10 : 6,-1.5,7.2,Math.PI);
    sim.step(dt);
    assert.ok(f.body.position.distanceTo(p)<=.174*(dt+1/60)+.0001);
    assert.ok(Math.abs(f.yaw-yaw)<=.77*(dt+1/60)+.0001);
  }
});

test('fish bodies slide past one another and stop at the actual floor and reef',async()=>{
  const [{aquariumPhysics},{seabed}]=await Promise.all([import('../ocean-collisions.js'),import('../ocean-simulation.js')]);
  const sim=aquariumPhysics(),a=sim.swimmer(.08,.11,.22),b=sim.swimmer(.08,.11,.22);
  a.aim(7,-1.4,6,Math.PI/2);b.aim(8,-1.4,6,-Math.PI/2);
  let nearest=Infinity;
  for(let i=0;i<240;i++){
    a.aim(8,-1.4,6,Math.PI/2);b.aim(7,-1.4,6,-Math.PI/2);sim.step(1/60);
    nearest=Math.min(nearest,a.body.position.distanceTo(b.body.position));
  }
  assert.ok(nearest>.12 && nearest<.49);
  assert.ok(a.body.position.x>b.body.position.x);
  sim.solid(8,-2.2,6,.30,.24,.30);
  for(let i=0;i<180;i++){a.aim(8,-2.2,6,0);sim.step(1/60);}
  assert.ok(Math.hypot(a.body.position.x-8,a.body.position.y+2.2,a.body.position.z-6)>.22);
  for(let i=0;i<360;i++){
    a.aim(7,-9,6,0);sim.step(1/60);
    const p=a.body.position;
    assert.ok(p.y>seabed(p.x,p.z)+.05);
  }
});

test('visitor runs have quiet intervals, remain continuous and stay in navigable water',async()=>{
  const {seabed,reefPasses}=await import('../ocean-simulation.js');
  const {Vector4}=await import('../vendor/three.module.js');
  const pass=reefPasses(()=>.53),ray=new Vector4(),last=new Vector4();
  let trips=0,previous=0;
  for(let i=0;i<5400;i++){
    const v=pass(1/60,ray);
    if(v.travel>.01 && previous<=.01)trips++;
    if(i)assert.ok(Math.hypot(ray.x-last.x,ray.z-last.z)<.027);
    for(const side of [-.85,0,.85]){
      assert.ok(ray.y-.32>seabed(ray.x+side*Math.cos(ray.w),ray.z-side*Math.sin(ray.w))+.58);
    }
    previous=v.travel;last.copy(ray);
  }
  assert.ok(trips>=3 && trips<=6);
});

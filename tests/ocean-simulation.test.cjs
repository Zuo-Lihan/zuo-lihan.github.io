const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const test = require('node:test');

function loadModule(file) {
  const data = readFileSync(path.join(__dirname, '..', file)).toString('base64');
  return import('data:text/javascript;base64,' + data);
}
const modules = Promise.all([loadModule('ocean-simulation.js'), loadModule('vendor/three.module.js')]);

test('interactive water starts flat and propagates a local disturbance', async () => {
  const [{rippleField}, three] = await modules;
  const field = rippleField(three);
  const pixels = field.texture.image.data;
  assert.ok(pixels.every(value => value === 128));
  assert.equal(field.splash(100, 100, .02, 0), false);
  assert.equal(field.splash(4, 3, .029, 0), true);
  for (let step = 1; step <= 45; step++) field.advance(1/60, step/60);
  assert.ok(pixels.some(value => value !== 128));
  field.texture.dispose();
});

test('ordinary sky tracking turns gradually and stays above the water', async () => {
  const [{seabirdFlight}, three] = await modules;
  const flown = seabirdFlight(three, 3);
  const cruise = seabirdFlight(three, 3);
  const origin = new three.Vector3(3,.81,-1.5);
  for(let step=1;step<=192;step++) {
    const time=step/60;
    if(step<95)flown.aim(origin,[.35+Math.sin(time)*.11,.22,.9],time);
    const before=flown.birds[0].heading;
    flown.step(1/60,time);
    cruise.step(1/60,time);
    assert.ok(Math.abs(flown.birds[0].heading-before)<.015);
    assert.ok(flown.birds.every(bird=>bird.position.y>=3.23));
  }
  assert.ok(flown.birds[0].position.distanceTo(cruise.birds[0].position)>1);
});

test('a gull completes a flyby or a catch once and then resumes flying', async () => {
  const [{seabirdFlight}, three] = await modules;
  for(const kind of ['pass','catch']){
    const flight=seabirdFlight(three,3);
    assert.equal(flight.encounter(kind,3.8,4.5,0),true);
    assert.equal(flight.encounter(kind,3.8,4.5,.1),false);
    const events=[];
    for(let step=1;step<=600;step++){
      flight.step(1/60,step/60);
      const cue=flight.takeCue();
      if(cue)events.push(cue);
    }
    assert.equal(events.length,1);
    assert.equal(events[0].kind,kind);
    const bird=flight.birds[events[0].index];
    const oldPosition=bird.position.clone();
    for(let step=601;step<=660;step++)flight.step(1/60,step/60);
    assert.ok(bird.position.distanceTo(oldPosition)>.5);
    assert.ok(bird.position.y>=3.23);
  }
});

test('turtles emerge from the shallows and leave visible tracks in the sand', async () => {
  const [{turtleCoast}, three] = await modules;
  const coast=turtleCoast(three);
  coast.update(0,0);
  assert.ok(coast.turtles.every(t=>t.y<-.25 && t.crawl===0));
  assert.ok(coast.texture.image.data.every(value=>value===0));
  for(let step=1;step<=900;step++)coast.update(1/60,step/60);
  assert.ok(coast.turtles[0].crawl>.95);
  assert.ok(coast.turtles[0].y>.10);
  const pixels=coast.texture.image.data;
  assert.ok(pixels.filter((v,i)=>i%2===0 && v>110).length>150,'compressed flipper tracks');
  assert.ok(pixels.filter((v,i)=>i%2===1 && v>45).length>80,'displaced sand lips');
  coast.texture.dispose();
});

test('both manta patrols keep moving throughout turns and clear the reef, hull and surface', async()=>{
  const [{mantaPatrol,seabed,height,BOAT},T]=await modules;
  const patrol=mantaPatrol(),dt=.08;
  for(const aspect of [.46,.82,1.60,2.35]){
    const poses=[new T.Vector4(),new T.Vector4()],last=poses.map(()=>new T.Vector4());
    for(let frame=0;frame<760;frame++){
      const time=frame*dt;
      for(let i=0;i<2;i++){
        const p=poses[i],scale=patrol(i,time,aspect,p);
        if(frame)assert.ok(Math.hypot(p.x-last[i].x,p.z-last[i].z)/dt>.084,'stalled in a turn');
        assert.ok(p.y>-.97 && p.y<-.65);
        const sn=Math.sin(p.w),cs=Math.cos(p.w);
        for(const [lat,forward] of [[-1,-.18],[-.75,-.05],[-.35,.33],[0,.55],[0,0],[.35,.33],[.75,-.05],[1,-.18],[0,-.76],[0,-1.45]]){
          const x=p.x+(cs*lat+sn*forward)*scale,z=p.z+(-sn*lat+cs*forward)*scale;
          assert.ok(p.y-.34*scale>seabed(x,z)+.55,'seafloor or reef canopy');
          assert.ok(p.y+.34*scale<height(x,z,time)-.06,'wing broke surface');
          assert.ok(Math.hypot(x-BOAT[0],Math.max(0,Math.abs(z-BOAT[1])-.98))>.86,'hull intersection');
        }
        last[i].copy(p);
      }
      assert.ok(Math.hypot(poses[0].x-poses[1].x,poses[0].z-poses[1].z)>2.05,'overlapping paths');
    }
  }
});

import * as THREE from './vendor/three.module.js';

// Original, code-built WALL-E study. No external model, texture, or CDN requests.
export function mountWalle(slot) {
  const button = slot.querySelector('.research-robot');
  const stage = slot.querySelector('.walle-stage');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover:hover) and (pointer:fine)');
  const renderer = new THREE.WebGLRenderer({alpha: true, antialias: true, powerPreference: 'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  stage.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-5, 5, 1.8, -1.8, .1, 35);
  camera.position.set(0, 3.9, 12);
  camera.lookAt(0, 1.2, 0);
  scene.add(new THREE.HemisphereLight(0xe5f3ff, 0x8a7762, 2.6));
  const key = new THREE.DirectionalLight(0xfff2d9, 3.1);
  key.position.set(-3, 6, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xc8e7ff, 2.7);
  rim.position.set(3, 3, -4);
  scene.add(rim);

  const textures = [];
  function texture(width, height, paint) {
    const canvas = document.createElement('canvas');
    canvas.width = width;canvas.height = height;
    paint(canvas.getContext('2d'), width, height);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    textures.push(map);
    return map;
  }
  const studio = texture(512, 256, (ctx, w, h) => {
    const fill = ctx.createLinearGradient(0, 0, 0, h);
    fill.addColorStop(0, '#eaf5ff');fill.addColorStop(.5, '#b8c5cd');fill.addColorStop(1, '#655b50');
    ctx.fillStyle = fill;ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff';ctx.fillRect(40, 20, 75, 160);ctx.fillRect(300, 10, 130, 110);
  });
  studio.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = studio;
  const material = (color, metalness = .3, roughness = .55) => new THREE.MeshStandardMaterial({color, metalness, roughness});
  const yellow = material(0xd8a533, .45, .55);
  const edge = material(0x87642f, .55, .64);
  const steel = material(0x8b9496, .75, .36);
  const silver = material(0xbfc5c2, .72, .34);
  const dark = material(0x393d3d, .5, .67);
  const rubber = material(0x282d2c, .12, .83);
  const inset = material(0x1b2327, .6, .42);
  const lens = material(0x101e29, .8, .12);
  const blue = material(0x4685a0, .7, .2);
  const bolt = new THREE.CylinderGeometry(.023, .023, .018, 8);
  const boxCache = new Map();
  function roundedBox(w, h, d, radius) {
    const id = [w, h, d, radius].join(',');
    if (boxCache.has(id)) return boxCache.get(id);
    const geo = new THREE.BoxGeometry(1, 1, 1, 4, 4, 4);
    const p = geo.attributes.position;
    const core = new THREE.Vector3(), v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.set(p.getX(i) * w, p.getY(i) * h, p.getZ(i) * d);
      core.set(THREE.MathUtils.clamp(v.x, -w / 2 + radius, w / 2 - radius), THREE.MathUtils.clamp(v.y, -h / 2 + radius, h / 2 - radius), THREE.MathUtils.clamp(v.z, -d / 2 + radius, d / 2 - radius));
      v.sub(core).normalize().multiplyScalar(radius).add(core);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();boxCache.set(id, geo);
    return geo;
  }
  function mesh(parent, geo, mat, x = 0, y = 0, z = 0) {
    const item = new THREE.Mesh(geo, mat);item.position.set(x, y, z);parent.add(item);
    return item;
  }
  function box(parent, w, h, d, mat, x = 0, y = 0, z = 0, r = .02) {
    return mesh(parent, roundedBox(w, h, d, Math.min(r, w / 2, h / 2, d / 2)), mat, x, y, z);
  }
  function cylinder(parent, radius, length, mat, x, y, z, axis = 'z') {
    const item = mesh(parent, new THREE.CylinderGeometry(radius, radius, length, 24), mat, x, y, z);
    if (axis === 'z') item.rotation.x = Math.PI / 2;
    if (axis === 'x') item.rotation.z = Math.PI / 2;
    return item;
  }
  function rod(parent, from, to, radius, mat) {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
    const item = mesh(parent, new THREE.CylinderGeometry(radius, radius, a.distanceTo(b), 12), mat);
    item.position.copy(a).add(b).multiplyScalar(.5);
    item.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
    return item;
  }
  const robot = new THREE.Group();scene.add(robot);
  const chassis = new THREE.Group();robot.add(chassis);

  // Layered compactor housing, service door, charge meter, vents and fasteners.
  box(chassis, 1.35, 1.06, .99, yellow, 0, 1.15, 0, .065);
  box(chassis, 1.39, .1, 1.01, edge, 0, .64, 0, .025);
  box(chassis, 1.38, .1, 1.03, steel, 0, 1.69, 0, .025);
  box(chassis, 1.12, .66, .035, edge, 0, 1.08, .512);
  const doorMap = texture(512, 320, (ctx, w, h) => {
    ctx.fillStyle = '#cba144';ctx.fillRect(0, 0, w, h);
    let seed = 13;
    const random = () => {seed = seed * 16807 % 2147483647;return seed / 2147483647;};
    for (let i = 0; i < 600; i++) {
      ctx.fillStyle = i % 2 ? 'rgba(69,51,30,.14)' : 'rgba(248,223,146,.18)';
      ctx.fillRect(random() * w, random() * h, 1 + random() * 14, 1 + random() * 2);
    }
    ctx.strokeStyle = '#876832';ctx.lineWidth = 5;ctx.strokeRect(6, 6, w - 12, h - 12);
    ctx.fillStyle = '#534b36';ctx.font = 'bold 52px Arial';ctx.fillText('WALL', 35, 255);
    ctx.beginPath();ctx.arc(220, 236, 29, 0, Math.PI * 2);ctx.fillStyle = '#b95339';ctx.fill();
    ctx.font = 'bold 40px Arial';ctx.fillStyle = '#eadfbb';ctx.fillText('E', 207, 250);
    ctx.fillStyle = '#76653e';ctx.font = '12px monospace';ctx.fillText('WASTE ALLOCATION LOAD LIFTER', 35, 286);
    ctx.fillStyle = '#8a713c';ctx.fillRect(355, 30, 110, 45);
    ctx.fillStyle = '#ddd2a8';ctx.font = '12px monospace';ctx.fillText('BNL  723', 363, 58);
  });
  mesh(chassis, new THREE.PlaneGeometry(1.07, .62), new THREE.MeshStandardMaterial({map: doorMap, roughness: .75, metalness: .2}), 0, 1.08, .534);
  box(chassis, .42, .17, .04, dark, -.28, 1.54, .526);
  box(chassis, .38, .12, .047, inset, -.28, 1.54, .55);
  const charge = material(0xaac0b2, .1);
  for (let i = 0; i < 5; i++) box(chassis, .045, .07, .012, i < 4 ? charge : edge, -.41 + i * .065, 1.54, .58, .005);
  cylinder(chassis, .043, .04, material(0xb94735), .38, 1.54, .55);
  box(chassis, .19, .09, .018, steel, .14, 1.54, .55, .006);
  for (let i = 0; i < 7; i++) box(chassis, .018, .23, .025, dark, -.19 + i * .063, .91, -.507, .004);
  for (const x of [-.49, .49]) for (const y of [.84, 1.33]) {
    const screw = mesh(chassis, bolt, steel, x, y, .554);screw.rotation.x = Math.PI / 2;
  }
  for (const s of [-1, 1]) {
    box(chassis, .03, .66, .72, edge, s * .682, 1.13, 0);
    for (let i = 0; i < 5; i++) box(chassis, .04, .03, .49, dark, s * .704, 1.05 + i * .065, -.03, .005);
  }

  // Tread shoes follow a closed track; phase is driven by actual travel distance.
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, .15, -.61), new THREE.Vector3(0, .11, .4),
    new THREE.Vector3(0, .23, .66), new THREE.Vector3(0, .43, .61),
    new THREE.Vector3(0, .77, -.27), new THREE.Vector3(0, .76, -.48),
    new THREE.Vector3(0, .53, -.68)
  ], true, 'centripetal');
  const circumference = curve.getLength();
  const samples = Array.from({length: 512}, (_, i) => ({p: curve.getPointAt(i / 512), t: curve.getTangentAt(i / 512)}));
  const tracks = [], wheels = [], dummy = new THREE.Object3D();
  for (const side of [-1, 1]) {
    const group = new THREE.Group();group.position.x = side * .79;robot.add(group);
    box(group, .24, .28, 1.02, dark, 0, .37, -.02);
    for (const [y, z, r] of [[.35, .41, .23], [.36, -.47, .25], [.65, -.28, .15]]) {
      const wheel = new THREE.Group();wheel.position.set(0, y, z);group.add(wheel);
      cylinder(wheel, r, .23, rubber, 0, 0, 0, 'x');
      cylinder(wheel, r * .72, .25, edge, 0, 0, 0, 'x');
      cylinder(wheel, r * .38, .27, steel, 0, 0, 0, 'x');
      for (let j = 0; j < 5; j++) cylinder(wheel, .022, .282, dark, 0, Math.cos(j * Math.PI * .4) * r * .51, Math.sin(j * Math.PI * .4) * r * .51, 'x');
      wheels.push({wheel, side, radius: r});
    }
    const shoes = new THREE.InstancedMesh(roundedBox(.35, .1, .125, .012), rubber, 42);
    const ribs = new THREE.InstancedMesh(roundedBox(.38, .035, .036, .006), steel, 42);
    shoes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);ribs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    shoes.frustumCulled = ribs.frustumCulled = false;
    group.add(shoes, ribs);tracks.push({shoes, ribs, side});
  }
  function treadPose(phaseLeft, phaseRight) {
    for (const track of tracks) {
      const phase = track.side < 0 ? phaseLeft : phaseRight;
      for (let i = 0; i < 42; i++) {
        const u = ((i / 42 + phase / circumference) % 1 + 1) % 1;
        const sample = samples[Math.floor(u * 512)];
        dummy.position.copy(sample.p);dummy.rotation.set(Math.atan2(-sample.t.y, sample.t.z), 0, 0);
        dummy.updateMatrix();track.shoes.setMatrixAt(i, dummy.matrix);
        dummy.translateY(-.061);dummy.updateMatrix();track.ribs.setMatrixAt(i, dummy.matrix);
      }
      track.shoes.instanceMatrix.needsUpdate = track.ribs.instanceMatrix.needsUpdate = true;
    }
  }

  // Exposed neck pistons and the two independent binocular eye housings.
  cylinder(chassis, .15, .15, dark, 0, 1.79, -.07, 'y');
  rod(chassis, [-.12, 1.79, -.12], [-.12, 2.12, .03], .066, yellow);
  rod(chassis, [.12, 1.79, -.12], [.12, 2.12, .03], .066, yellow);
  rod(chassis, [0, 1.8, .14], [0, 2.08, .18], .039, steel);
  const head = new THREE.Group();head.position.set(0, 2.12, .08);chassis.add(head);
  box(head, .5, .12, .22, dark, 0, 0, -.06);
  const eyes = [];
  for (const side of [-1, 1]) {
    const eye = new THREE.Group();eye.position.x = side * .42;eye.rotation.z = side * -.13;head.add(eye);eyes.push(eye);
    const shape = new THREE.Shape();
    shape.moveTo(-.34, -.22);shape.quadraticCurveTo(-.43, -.17, -.43, .03);
    shape.quadraticCurveTo(-.43, .24, -.32, .28);shape.lineTo(.24, .33);
    shape.quadraticCurveTo(.39, .31, .39, .17);shape.lineTo(.33, -.18);
    shape.quadraticCurveTo(.28, -.3, .12, -.28);shape.lineTo(-.34, -.22);
    const housing = new THREE.ExtrudeGeometry(shape, {depth: .22, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: .04, bevelThickness: .035, curveSegments: 12});
    mesh(eye, housing, silver, 0, 0, -.11);
    cylinder(eye, .253, .07, dark, -.015, .018, .172);
    cylinder(eye, .215, .08, steel, -.015, .018, .217);
    cylinder(eye, .184, .084, inset, -.015, .018, .255);
    cylinder(eye, .146, .086, lens, -.015, .018, .274);
    mesh(eye, new THREE.TorusGeometry(.128, .009, 8, 32), blue, -.015, .018, .322);
    cylinder(eye, .097, .008, lens, -.015, .018, .324);
    const glint = mesh(eye, new THREE.SphereGeometry(.047, 12, 8), new THREE.MeshBasicMaterial({color: 0xe0f1f6}), -.053, .077, .333);
    glint.scale.set(.65, .35, .08);
    const reflection = mesh(eye, new THREE.SphereGeometry(.024, 10, 8), blue, .045, -.044, .335);reflection.scale.z = .1;
    for (const x of [-.29, .26]) {const screw = mesh(eye, bolt, dark, x, .21, .16);screw.rotation.x = Math.PI / 2;}
  }

  const arms = [];
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Group();shoulder.position.set(side * .74, 1.44, .06);chassis.add(shoulder);
    cylinder(shoulder, .12, .17, steel, 0, 0, 0, 'x');
    box(shoulder, .17, .39, .17, edge, side * .04, -.16, .04);
    box(shoulder, .11, .32, .12, silver, side * .04, -.27, .1);
    const hand = new THREE.Group();hand.position.set(side * .05, -.46, .17);shoulder.add(hand);
    box(hand, .25, .11, .25, steel);
    for (const x of [-.08, .08]) {
      box(hand, .075, .25, .12, silver, x, -.11, .07);
      box(hand, .075, .055, .17, dark, x, -.22, .1);
    }
    shoulder.rotation.x = -.22;arms.push(shoulder);
  }
  const props = {};
  for (const name of ['read', 'work', 'game']) {
    props[name] = new THREE.Group();props[name].visible = false;chassis.add(props[name]);
  }
  const paper = material(0xe4e0d0, .05, .85);
  const cover = material(0x42687d, .15, .65);
  for (const side of [-1, 1]) {
    const leaf = new THREE.Group();leaf.position.set(side * .2, 1.02, .85);leaf.rotation.y = -side * .22;props.read.add(leaf);
    box(leaf, .39, .47, .05, cover);
    box(leaf, .35, .43, .03, paper, 0, 0, .04);
    for (let i = 0; i < 6; i++) box(leaf, .24, .008, .006, steel, 0, .13 - i * .047, .058, .001);
  }
  props.work.position.set(0, .94, .85);
  box(props.work, .79, .46, .055, steel, 0, .16, 0);
  box(props.work, .7, .36, .015, inset, 0, .16, .035);
  for (let i = 0; i < 5; i++) box(props.work, .27 + i % 3 * .1, .012, .006, blue, -.08, .28 - i * .055, .048, .001);
  box(props.work, .82, .04, .43, silver, 0, -.08, .16);
  props.game.position.set(0, 1.02, .88);
  box(props.game, .68, .22, .2, dark, 0, 0, 0, .06);
  box(props.game, .04, .12, .025, silver, -.2, 0, .11, .004);
  box(props.game, .12, .04, .025, silver, -.2, 0, .112, .004);
  cylinder(props.game, .025, .025, blue, .18, .04, .115);
  cylinder(props.game, .025, .025, edge, .25, -.025, .115);
  const shadowMap = texture(128, 128, (ctx, w, h) => {
    const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gradient.addColorStop(0, 'rgba(47,62,67,.24)');gradient.addColorStop(1, 'rgba(47,62,67,0)');
    ctx.fillStyle = gradient;ctx.fillRect(0, 0, w, h);
  });
  const shadow = mesh(scene, new THREE.PlaneGeometry(3.6, 2.2), new THREE.MeshBasicMaterial({map: shadowMap, transparent: true, depthWrite: false}));
  shadow.rotation.x = -Math.PI / 2;shadow.position.y = .025;

  let width = 0, height = 0, bound = 2, x = -.7, direction = 1, speed = 0, yaw = .7;
  let phaseLeft = 0, phaseRight = 0, previousYaw = yaw, time = 0, waveUntil = 0;
  let pointer = null, visible = false, frame = 0, previous = 0, lastPaint = 0, disposed = false;
  let action = 'drive';
  const activities = [['drive', 12], ['read', 4], ['drive', 9], ['work', 4], ['drive', 9], ['game', 4], ['drive', 9], ['sleep', 4]];
  let activityIndex = 0, activityTime = 0;
  const damp = (a, b, dt, rate = 6) => THREE.MathUtils.lerp(a, b, 1 - Math.exp(-dt * rate));
  function resize() {
    const rect = stage.getBoundingClientRect();width = rect.width;height = rect.height;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    const halfHeight = 1.55, halfWidth = halfHeight * width / height;
    camera.left = -halfWidth;camera.right = halfWidth;camera.top = halfHeight;camera.bottom = -halfHeight;camera.updateProjectionMatrix();
    bound = Math.max(.35, halfWidth - 1.45);x = THREE.MathUtils.clamp(x, -bound, bound);
    if (reduced.matches) {robot.position.x = 0;renderer.render(scene, camera);}
  }
  const sizeObserver = new ResizeObserver(resize);sizeObserver.observe(stage);
  function update(dt) {
    time += dt;
    const close = pointer && Math.abs(pointer.x - x) < 1.6 && Math.abs(pointer.y - 1.25) < 1.8;
    if (!close && time >= waveUntil) {
      activityTime += dt;
      if (activityTime > activities[activityIndex][1]) {activityIndex = (activityIndex + 1) % activities.length;activityTime = 0;}
    }
    action = time < waveUntil ? 'wave' : close ? 'watch' : activities[activityIndex][0];
    const distance = bound - direction * x;
    if (distance < .045 && action === 'drive') direction *= -1;
    const targetYaw = action === 'drive' ? direction * 1.03 : THREE.MathUtils.clamp((pointer?.x ?? x) - x, -.8, .8) * .25;
    yaw = damp(yaw, targetYaw, dt, 4.2);
    const turning = Math.abs(yaw - targetYaw) > .35;
    const targetSpeed = action === 'drive' && !turning ? direction * Math.min(.72, Math.max(.16, distance * 1.5)) : 0;
    speed = damp(speed, targetSpeed, dt, 5);x = THREE.MathUtils.clamp(x + speed * dt, -bound, bound);
    robot.position.x = x;robot.rotation.y = yaw;
    chassis.position.y = Math.sin(time * 10) * Math.min(.008, Math.abs(speed) * .012);
    const turningDistance = (yaw - previousYaw) * .8;previousYaw = yaw;
    phaseLeft += Math.abs(speed) * dt - turningDistance;
    phaseRight += Math.abs(speed) * dt + turningDistance;
    treadPose(phaseLeft, phaseRight);
    for (const {wheel, radius, side} of wheels) wheel.rotation.x = (side < 0 ? phaseLeft : phaseRight) / radius;
    const gaze = pointer ? THREE.MathUtils.clamp((pointer.x - x) * .28 - yaw, -.9, .9) : -yaw * .7;
    head.rotation.y = damp(head.rotation.y, gaze, dt);
    const usingProp = ['read', 'game', 'work'].includes(action);
    const headTilt = action === 'sleep' ? .47 : usingProp ? .25 : pointer ? THREE.MathUtils.clamp((1.8 - pointer.y) * .2, -.35, .3) : -.06;
    head.rotation.x = damp(head.rotation.x, headTilt, dt);
    head.rotation.z = damp(head.rotation.z, action === 'watch' ? Math.sin(time * 1.4) * .08 : Math.sin(time * .7) * .025, dt);
    arms[1].rotation.z = damp(arms[1].rotation.z, action === 'wave' ? 2.4 + Math.sin(time * 10) * .28 : -.05, dt, 8);
    for (const arm of arms) arm.rotation.x = damp(arm.rotation.x, usingProp ? -.97 + Math.sin(time * (action === 'work' ? 14 : 3)) * .045 : -.22, dt);
    for (const [name, prop] of Object.entries(props)) prop.visible = name === action;
    for (const eye of eyes) eye.rotation.z = damp(eye.rotation.z, Math.sign(eye.position.x) * (action === 'sleep' ? -.32 : -.13), dt);
    shadow.position.x = x;slot.dataset.action = action;
  }
  function draw(stamp) {
    frame = 0;
    if (!visible || document.hidden || disposed) return;
    if (stamp - lastPaint >= 32) {
      const dt = previous ? Math.min((stamp - previous) / 1000, .06) : 1 / 30;
      previous = lastPaint = stamp;
      if (!reduced.matches) update(dt);
      renderer.render(scene, camera);
    }
    if (!reduced.matches) frame = requestAnimationFrame(draw);
  }
  function activity() {
    cancelAnimationFrame(frame);frame = 0;previous = lastPaint = 0;
    if (visible && !document.hidden && !disposed) frame = requestAnimationFrame(draw);
  }
  const visibility = new IntersectionObserver(entries => {visible = entries[0].isIntersecting;activity();}, {threshold: .05});visibility.observe(stage);
  document.addEventListener('visibilitychange', activity);reduced.addEventListener('change', activity);
  const ray = new THREE.Raycaster(), point = new THREE.Vector3();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const onMove = event => {
    if (reduced.matches || !finePointer.matches || event.pointerType !== 'mouse') return;
    const rect = stage.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), camera);
    if (ray.ray.intersectPlane(plane, point)) pointer = {x: point.x, y: point.y};
  };
  const onLeave = () => {pointer = null;};
  const onClick = () => {if (!reduced.matches) waveUntil = time + 2.6;};
  button.addEventListener('pointermove', onMove, {passive: true});button.addEventListener('pointerleave', onLeave, {passive: true});button.addEventListener('click', onClick);
  const label = () => button.setAttribute('aria-label', document.documentElement.lang === 'zh-CN' ? '\u548c\u74e6\u529b\u6253\u62db\u547c' : 'Say hello to WALL-E');
  const language = new MutationObserver(label);language.observe(document.documentElement, {attributes: true, attributeFilter: ['lang']});label();
  renderer.domElement.addEventListener('webglcontextlost', event => {event.preventDefault();cancelAnimationFrame(frame);slot.hidden = true;});
  function dispose() {
    disposed = true;cancelAnimationFrame(frame);visibility.disconnect();sizeObserver.disconnect();language.disconnect();
    document.removeEventListener('visibilitychange', activity);reduced.removeEventListener('change', activity);
    button.removeEventListener('pointermove', onMove);button.removeEventListener('pointerleave', onLeave);button.removeEventListener('click', onClick);
    const geometries = new Set(), materials = new Set();
    scene.traverse(item => {if (item.geometry) geometries.add(item.geometry);if (item.material) materials.add(item.material);});
    geometries.forEach(geo => geo.dispose());materials.forEach(mat => mat.dispose());textures.forEach(map => map.dispose());renderer.dispose();
  }
  window.addEventListener('pagehide', event => {if (!event.persisted) dispose();});
  resize();treadPose(0, 0);robot.rotation.y = yaw;robot.position.x = reduced.matches ? 0 : x;
  renderer.render(scene, camera);slot.classList.add('is-loaded');
}

(async () => {
  const stage = document.querySelector('.ocean-stage');
  const runway = document.querySelector('.ocean-runway');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (!stage || !runway || reduced.matches || location.protocol === 'file:') return;
  try {
    const THREE = await import('./vendor/three.module.js');
    const renderer = new THREE.WebGLRenderer({alpha: false, antialias: false, powerPreference: 'low-power'});
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    const canvas = renderer.domElement;
    canvas.className = 'ocean-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    const loader = new THREE.TextureLoader();
    const asset = name => new URL('./assets/' + name, import.meta.url).href;
    const textures = await Promise.all([
      loader.loadAsync(asset('ocean-sunset-v2.jpg')),
      loader.loadAsync(asset('ocean-underwater-v2.jpg'))
    ]);
    textures.forEach(texture => {texture.colorSpace = THREE.SRGBColorSpace;});
    const uniforms = {
      surface: {value: textures[0]}, depth: {value: textures[1]},
      viewport: {value: new THREE.Vector2(1, 1)}, pixels: {value: new THREE.Vector2(1, 1)},
      time: {value: 0}, dive: {value: 0},
      surfaceAspect: {value: textures[0].image.width / textures[0].image.height},
      depthAspect: {value: textures[1].image.width / textures[1].image.height}
    };
    const material = new THREE.ShaderMaterial({uniforms, vertexShader: `
      varying vec2 uvScreen;
      void main() { uvScreen = uv; gl_Position = vec4(position.xy, 0., 1.); }
    `, fragmentShader: `
      uniform sampler2D surface, depth;
      uniform vec2 viewport;
      uniform float time, dive, surfaceAspect, depthAspect;
      varying vec2 uvScreen;
      vec2 cover(vec2 uv, float imageAspect) {
        float aspect = viewport.x / viewport.y;
        vec2 scale = aspect > imageAspect ? vec2(1., imageAspect / aspect) : vec2(aspect / imageAspect, 1.);
        return (uv - .5) * scale + .5;
      }
      void main() {
        vec2 uv = uvScreen;
        float travel = min(time * .0025, .025);
        vec2 topUV = cover((uv - .5) * (1. - travel) + .5, surfaceAspect);
        vec2 belowUV = cover((uv - .5) * (1. - dive * .045) + .5, depthAspect);
        float water = 1. - smoothstep(.33, .40, topUV.y);
        float swell = sin(topUV.x * 30. + topUV.y * 29. + time * .42);
        swell += .55 * sin(topUV.x * 59. - topUV.y * 19. - time * .31);
        topUV.x += water * swell * .012;
        topUV.y += water * (sin(topUV.x * 24. + topUV.y * 43. - time * .65) * .010 + swell * .004);
        belowUV.x += sin(belowUV.y * 24. + belowUV.x * 13. + time * .43) * .006;
        belowUV.y += sin(belowUV.x * 23. - belowUV.y * 16. - time * .32) * .004;
        vec3 above = texture2D(surface, clamp(topUV, .002, .998)).rgb;
        vec3 under = texture2D(depth, clamp(belowUV, .002, .998)).rgb;
        float rays = .5 + .5 * sin(uv.x * 17. + uv.y * 6. + sin(time * .22) * 1.2);
        under *= 1. + rays * smoothstep(.18, .95, uv.y) * .045;
        float glimmer = pow(max(0., sin(topUV.x * 72. + topUV.y * 63. - time * .7) * sin(topUV.y * 48. - time * .45)), 8.);
        above += vec3(.018, .024, .025) * glimmer * water;
        float boundary = mix(-.16, 1.16, smoothstep(.04, .94, dive));
        float ripple = (sin(uv.x * 12. + time * .7) + .4 * sin(uv.x * 28. - time * .5)) * .012;
        float submerged = 1. - smoothstep(boundary - .12, boundary + .12, uv.y + ripple);
        vec3 color = mix(above, under, submerged);
        gl_FragColor = vec4(color, 1.);
        #include <colorspace_fragment>
      }
    `});
    const geometry = new THREE.PlaneGeometry(2, 2);
    const scene = new THREE.Scene();
    scene.add(new THREE.Mesh(geometry, material));
    const camera = new THREE.Camera();
    const seaScene = new THREE.Scene();
    const seaCamera = new THREE.PerspectiveCamera(48, 1, .1, 320);
    seaCamera.position.set(0, 7, 18);
    seaCamera.lookAt(0, 0, -42);
    const waves = new THREE.PlaneGeometry(260, 260, 220, 220);
    const waveMaterial = new THREE.ShaderMaterial({
      uniforms, transparent: true, depthWrite: false,
      vertexShader: `
        uniform float time;
        varying vec3 vNormalWave;
        varying float vHeight;
        void main() {
          vec2 p = position.xy;
          float t = time;
          float a = p.x * .15 + p.y * .30 + t * .75;
          float b = -p.x * .34 + p.y * .48 + t * .95;
          float c = p.x * .66 + p.y * .79 - t * 1.10;
          float d = -p.x * 1.15 + p.y * 1.37 + t * 1.4;
          float height = sin(a) * .76 + sin(b) * .34 + sin(c) * .13 + sin(d) * .045;
          float dx = cos(a) * .114 - cos(b) * .116 + cos(c) * .086 - cos(d) * .052;
          float dz = cos(a) * .228 + cos(b) * .163 + cos(c) * .103 + cos(d) * .062;
          vNormalWave = normalize(vec3(-dx, 1., dz));
          vHeight = height;
          vec3 displaced = position;
          displaced.z += height;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.);
        }
      `,
      fragmentShader: `
        uniform sampler2D surface;
        uniform vec2 viewport, pixels;
        uniform float dive, surfaceAspect;
        varying vec3 vNormalWave;
        varying float vHeight;
        vec2 cover(vec2 uv) {
          float aspect = viewport.x / viewport.y;
          vec2 scale = aspect > surfaceAspect ? vec2(1., surfaceAspect / aspect) : vec2(aspect / surfaceAspect, 1.);
          return (uv - .5) * scale + .5;
        }
        void main() {
          vec2 screen = gl_FragCoord.xy / pixels;
          vec2 source = cover(screen);
          float horizon = 1. - smoothstep(.33, .40, source.y);
          vec3 normal = normalize(vNormalWave);
          vec2 offset = vec2(normal.x * .04, (normal.z * .03 + vHeight * .004));
          vec3 color = texture2D(surface, clamp(source + offset * horizon, .002, .998)).rgb;
          vec3 light = normalize(vec3(.55, .8, .32));
          float reflection = pow(max(dot(reflect(-light, normal), normalize(vec3(0., .5, 1.))), 0.), 24.);
          float illumination = clamp(.87 + normal.y * .10 + normal.z * .28 + vHeight * .018, .65, 1.15);
          color = color * illumination + vec3(.15, .22, .25) * reflection;
          float alpha = horizon * (1. - smoothstep(.08, .72, dive));
          gl_FragColor = vec4(color, alpha);
          #include <colorspace_fragment>
        }
      `
    });
    const waterMesh = new THREE.Mesh(waves, waveMaterial);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.z = -65;
    seaScene.add(waterMesh);
    renderer.autoClear = false;
    function render() {
      renderer.clear();
      renderer.render(scene, camera);
      renderer.render(seaScene, seaCamera);
    }
    stage.insertBefore(canvas, stage.querySelector('.ocean-shade'));
    let visible = false, frame = 0, last = 0, elapsed = 0, destroyed = false;
    function resize() {
      const {width, height} = stage.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      uniforms.viewport.value.set(width, height);
      renderer.getDrawingBufferSize(uniforms.pixels.value);
      seaCamera.aspect = width / height;
      seaCamera.updateProjectionMatrix();
      render();
    }
    function scroll() {
      const bounds = runway.getBoundingClientRect();
      uniforms.dive.value = Math.max(0, Math.min(1, -bounds.top / Math.max(1, runway.offsetHeight - stage.offsetHeight)));
    }
    function draw(now) {
      frame = 0;
      if (!visible || document.hidden || reduced.matches || destroyed) return;
      if (now - last >= 32) {
        elapsed += last ? Math.min((now - last) / 1000, .1) : 0;
        last = now; uniforms.time.value = elapsed;
        scroll();
        seaCamera.position.z = 18 - Math.sin(elapsed * .09) * 1.4 - uniforms.dive.value * 5;
        seaCamera.position.y = 7 + Math.sin(elapsed * .17) * .35 - uniforms.dive.value * 2;
        seaCamera.lookAt(0, 0, -42);
        render();
      }
      frame = requestAnimationFrame(draw);
    }
    function activity() {
      cancelAnimationFrame(frame); frame = 0; last = 0;
      canvas.hidden = reduced.matches;
      stage.classList.toggle('ocean-live', !reduced.matches && !destroyed);
      if (visible && !document.hidden && !reduced.matches && !destroyed) frame = requestAnimationFrame(draw);
    }
    const observer = new IntersectionObserver(entries => {visible = entries[0].isIntersecting; activity();}, {threshold: 0});
    observer.observe(stage);
    const sizeObserver = new ResizeObserver(resize); sizeObserver.observe(stage);
    document.addEventListener('visibilitychange', activity);
    reduced.addEventListener('change', activity);
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault(); destroyed = true; activity(); canvas.remove();
    });
    window.addEventListener('pagehide', event => {
      if (event.persisted) return;
      destroyed = true; cancelAnimationFrame(frame); observer.disconnect(); sizeObserver.disconnect();
      document.removeEventListener('visibilitychange', activity); reduced.removeEventListener('change', activity);
      geometry.dispose(); material.dispose(); waves.dispose(); waveMaterial.dispose(); textures.forEach(texture => texture.dispose()); renderer.dispose();
    }, {once: true});
    scroll(); resize(); activity();
  } catch (error) {
    console.warn('Ocean animation unavailable:', error.message);
  }
})();

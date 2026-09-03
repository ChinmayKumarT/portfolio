// Background shader: slow, domain-warped noise blending the palette
// (light mint ground, mint and sage drifts, a faint taupe shadow).
// Runs at half resolution, pauses when the tab is hidden, and renders a
// single still frame under prefers-reduced-motion.
(function () {
  const canvas = document.createElement("canvas");
  canvas.className = "bg-shader";
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);

  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
  if (!gl) { canvas.remove(); return; }

  const vert = `
    attribute vec2 p;
    void main() { gl_Position = vec4(p, 0.0, 1.0); }
  `;
  const frag = `
    precision mediump float;
    uniform vec2 u_res;
    uniform float u_time;

    // Palette
    const vec3 C0 = vec3(0.827, 0.922, 0.827); // #d3ebd3 light mint
    const vec3 C1 = vec3(0.753, 0.859, 0.769); // #c0dbc4 mint
    const vec3 C2 = vec3(0.627, 0.694, 0.667); // #a0b1aa grey-green
    const vec3 C3 = vec3(0.573, 0.584, 0.541); // #92958a sage
    const vec3 C4 = vec3(0.416, 0.376, 0.325); // #6a6053 taupe

    vec3 hash3(vec2 p) {
      vec3 q = vec3(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)), dot(p, vec2(419.2, 371.9)));
      return fract(sin(q) * 43758.5453);
    }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      float a = hash3(i).x, b = hash3(i + vec2(1.0, 0.0)).x;
      float c = hash3(i + vec2(0.0, 1.0)).x, d = hash3(i + vec2(1.0, 1.0)).x;
      return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    }
    float fbm(vec2 p) {
      float v = 0.0, a = 0.5;
      mat2 r = mat2(0.8, 0.6, -0.6, 0.8);
      for (int i = 0; i < 5; i++) { v += a * noise(p); p = r * p * 2.0; a *= 0.5; }
      return v;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / u_res;
      vec2 p = uv * vec2(u_res.x / u_res.y, 1.0) * 1.6;
      float t = u_time * 0.035;

      vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t * 0.7));
      vec2 r = vec2(fbm(p + 3.0 * q + vec2(1.7, 9.2) + t * 0.5), fbm(p + 3.0 * q + vec2(8.3, 2.8) - t * 0.3));
      float f = fbm(p + 2.5 * r);

      // Keep the ground light: most of the field sits between C0 and C1.
      vec3 col = mix(C0, C1, smoothstep(0.25, 0.75, f));
      col = mix(col, C2, smoothstep(0.55, 0.95, length(r)) * 0.55);
      col = mix(col, C3, smoothstep(0.75, 1.0, f) * 0.35);
      // A faint taupe shadow that drifts across the lower half.
      float shade = smoothstep(0.85, 1.05, q.x + (1.0 - uv.y) * 0.35);
      col = mix(col, C4, shade * 0.12);
      // Soft vignette toward the corners.
      float vig = smoothstep(1.35, 0.35, length(uv - 0.5) * 1.15);
      col = mix(col * 0.94, col, vig);
      // Fine grain so the gradients do not band.
      col += (hash3(gl_FragCoord.xy + u_time).x - 0.5) * 0.012;

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
    return s;
  }
  const vs = compile(gl.VERTEX_SHADER, vert), fs = compile(gl.FRAGMENT_SHADER, frag);
  if (!vs || !fs) { canvas.remove(); return; }
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uRes = gl.getUniformLocation(prog, "u_res");
  const uTime = gl.getUniformLocation(prog, "u_time");

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function resize() {
    const scale = 0.5; // half resolution: the field is soft, and this keeps it cheap
    canvas.width = Math.max(1, Math.floor(window.innerWidth * scale));
    canvas.height = Math.max(1, Math.floor(window.innerHeight * scale));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    if (reduce) draw(40);
  }
  function draw(t) {
    gl.uniform1f(uTime, t);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  window.addEventListener("resize", resize);
  resize();
  document.documentElement.classList.add("has-shader");

  if (reduce) { draw(40); return; }
  const start = performance.now();
  function frame(now) {
    if (!document.hidden) draw((now - start) / 1000 + 40);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();

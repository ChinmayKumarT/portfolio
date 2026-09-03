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
    precision highp float;
    uniform vec2 u_res;
    uniform float u_time;

    // Palette, pushed to both ends so the field actually reads as light and shade.
    const vec3 LIGHT = vec3(0.925, 0.980, 0.925); // lifted mint highlight
    const vec3 MINT  = vec3(0.753, 0.859, 0.769); // #c0dbc4
    const vec3 GREEN = vec3(0.627, 0.694, 0.667); // #a0b1aa
    const vec3 SAGE  = vec3(0.573, 0.584, 0.541); // #92958a
    const vec3 TAUPE = vec3(0.416, 0.376, 0.325); // #6a6053

    vec2 hash2(vec2 p) {
      p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
      return -1.0 + 2.0 * fract(sin(p) * 43758.5453);
    }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(dot(hash2(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
                     dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
                 mix(dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
                     dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x), u.y) * 0.5 + 0.5;
    }
    float fbm(vec2 p) {
      float v = 0.0, a = 0.55;
      mat2 r = mat2(0.8, 0.6, -0.6, 0.8);
      for (int i = 0; i < 6; i++) { v += a * noise(p); p = r * p * 2.02; a *= 0.5; }
      return v;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / u_res;
      vec2 p = uv * vec2(u_res.x / u_res.y, 1.0) * 2.2;
      float t = u_time * 0.09;

      // Two warp passes give long, curling ribbons rather than a flat haze.
      vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(4.7, -t * 0.8) + 2.3));
      vec2 r = vec2(fbm(p + 2.6 * q + vec2(1.7, 9.2) + t * 0.6),
                    fbm(p + 2.6 * q + vec2(8.3, 2.8) - t * 0.45));
      float f = fbm(p + 3.2 * r);

      // Aurora bands: sharp, moving contour lines through the warped field.
      float band = sin((r.x * 2.6 + r.y * 1.9 + f * 3.4) * 6.2831 + t * 1.6);
      band = smoothstep(0.15, 0.95, band * 0.5 + 0.5);

      float shade = smoothstep(0.34, 0.92, f);
      float deep = smoothstep(0.66, 1.05, f + length(r) * 0.30);

      vec3 col = mix(LIGHT, MINT, shade);
      col = mix(col, GREEN, deep * 0.55);
      col = mix(col, SAGE, smoothstep(0.86, 1.15, f + q.y * 0.35) * 0.30);
      col = mix(col, TAUPE, smoothstep(1.02, 1.35, f + r.x * 0.45) * 0.16);
      // Bright ribbon edges catch the light where the bands crest.
      col = mix(col, LIGHT, band * 0.55 * (1.0 - deep * 0.35));

      // Directional sweep: a light source across the field, brightening only.
      float sweep = smoothstep(1.25, -0.25, uv.x + uv.y * 0.5 + sin(t * 0.7) * 0.25);
      col = mix(col, mix(col, LIGHT, 0.22), sweep);

      float vig = smoothstep(1.40, 0.35, length(uv - 0.5) * 1.2);
      col = mix(mix(col, GREEN, 0.16), col, vig);
      col += (fract(sin(dot(gl_FragCoord.xy + u_time, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.014;

      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
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
    const scale = 0.62; // slightly above half resolution: the field is soft, and this keeps it cheap
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

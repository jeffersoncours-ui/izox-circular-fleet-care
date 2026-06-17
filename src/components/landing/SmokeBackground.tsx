// Fond animé "fumée + filigrane" WebGL — UNIQUE arrière-plan de la landing B2C.
// Fusionne le shader fbm (fumée) ET le filigrane halftone (échantillonné comme
// texture dans le shader) en un seul canvas. Remplace l'ancien duo
// canvas-fumée + pseudo-élément CSS ::before. Posé en z-index -2 dans le
// contexte isolé .izox-b2c → derrière tout le contenu, aucun effet hors landing.
//
// Sécurité + perf (session 42) :
//   - Fallback : si WebGL2 indisponible → ne rend rien (pas de crash, fond abysse conservé).
//   - prefers-reduced-motion → une frame figée, aucune boucle rAF.
//   - visibilitychange → boucle en pause quand l'onglet est caché (batterie).
//   - Rendu à résolution réduite (DPR plafonné 1.5 × RENDER_SCALE) → ~3-4× moins de fragments.
//   - Cap à 25 fps → la fumée est lente, 25 fps suffit et réduit la contention GPU.
//   - Couleur + intensité pilotées par le TweaksPanel (smokeColor / smokeIntensity).

import { useEffect, useRef } from "react";
import { useTweaks } from "./useTweaks";

const RENDER_SCALE = 0.6; // résolution interne du canvas (étiré en CSS) — fumée floue, invisible à l'œil
const FRAME_MS = 1000 / 25; // cap 25 fps — fumée lente, 25 fps suffit, réduit contention GPU avec vidéo
const FILIGRANE_STRENGTH = 0.12; // dosage du grain halftone fusionné

const fragmentShaderSource = `#version 300 es
precision highp float;
out vec4 O;
uniform float time;
uniform vec2 resolution;
uniform vec3 u_color;
uniform sampler2D u_tex;
uniform float u_fili;

#define FC gl_FragCoord.xy
#define R resolution
#define T (time+660.)

float rnd(vec2 p){p=fract(p*vec2(12.9898,78.233));p+=dot(p,p+34.56);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);return mix(mix(rnd(i),rnd(i+vec2(1,0)),u.x),mix(rnd(i+vec2(0,1)),rnd(i+1.),u.x),u.y);}
float fbm(vec2 p){float t=.0,a=1.;for(int i=0;i<4;i++){t+=a*noise(p);p*=mat2(1,-1.2,.2,1.2)*2.;a*=.5;}return t;}

void main(){
  vec2 uv=(FC-.5*R)/R.y;
  vec3 col=vec3(1);
  uv.x+=.25;
  uv*=vec2(2,1);

  float n=fbm(uv*.28-vec2(T*.01,0));
  n=noise(uv*3.+n*2.);

  col.r-=fbm(uv+vec2(0,T*.015)+n);
  col.g-=fbm(uv*1.003+vec2(0,T*.015)+n+.003);
  col.b-=fbm(uv*1.006+vec2(0,T*.015)+n+.006);

  col=mix(col, u_color, dot(col,vec3(.21,.71,.07)));
  col=mix(vec3(.08),col,min(time*.1,1.));

  // ── Filigrane halftone fusionné : texture échantillonnée + dérive lente.
  vec2 tuv = FC / R;
  vec2 aspect = vec2(R.x / R.y, 1.0);
  vec2 drift = vec2(sin(T * 0.02) * 0.03, cos(T * 0.015) * 0.03);
  float grain = texture(u_tex, tuv * aspect * 2.0 + drift).r;
  col = mix(col, col * mix(0.55, 1.15, grain), u_fili);

  O=vec4(clamp(col,.08,1.),1);
}`;

const vertexShaderSource =
  "#version 300 es\nprecision highp float;\nin vec4 position;\nvoid main(){gl_Position=position;}";

const VERTICES = [-1, 1, -1, -1, 1, 1, 1, -1];

class Renderer {
  private gl: WebGL2RenderingContext;
  private canvas: HTMLCanvasElement;
  private program: WebGLProgram | null = null;
  private vs: WebGLShader | null = null;
  private fs: WebGLShader | null = null;
  private buffer: WebGLBuffer | null = null;
  private tex: WebGLTexture | null = null;
  private img: HTMLImageElement | null = null;
  private uResolution: WebGLUniformLocation | null = null;
  private uTime: WebGLUniformLocation | null = null;
  private uColor: WebGLUniformLocation | null = null;
  private uTex: WebGLUniformLocation | null = null;
  private uFili: WebGLUniformLocation | null = null;
  private color: [number, number, number] = [0.5, 0.5, 0.5];

  constructor(canvas: HTMLCanvasElement, gl: WebGL2RenderingContext) {
    this.canvas = canvas;
    this.gl = gl;
  }

  /** Compile + link + texture. Retourne false en cas d'échec (abandon propre). */
  setup(): boolean {
    const gl = this.gl;
    const vs = gl.createShader(gl.VERTEX_SHADER);
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    const program = gl.createProgram();
    if (!vs || !fs || !program) return false;

    gl.shaderSource(vs, vertexShaderSource);
    gl.compileShader(vs);
    gl.shaderSource(fs, fragmentShaderSource);
    gl.compileShader(fs);
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteProgram(program);
      return false;
    }

    this.vs = vs;
    this.fs = fs;
    this.program = program;

    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(VERTICES), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    this.uResolution = gl.getUniformLocation(program, "resolution");
    this.uTime = gl.getUniformLocation(program, "time");
    this.uColor = gl.getUniformLocation(program, "u_color");
    this.uTex = gl.getUniformLocation(program, "u_tex");
    this.uFili = gl.getUniformLocation(program, "u_fili");

    // Texture halftone : 1×1 noir en attendant le chargement (évite tout pixel indéfini).
    this.tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 255]),
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return true;
  }

  /** Charge l'image halftone dans la texture (NPOT REPEAT OK en WebGL2). */
  loadTexture(url: string, onLoaded?: () => void) {
    const gl = this.gl;
    const img = new Image();
    this.img = img;
    img.onload = () => {
      if (!this.tex) return;
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      onLoaded?.();
    };
    img.src = url;
  }

  updateColor(c: [number, number, number]) {
    this.color = c;
  }

  updateScale() {
    const dpr = Math.min(1.5, Math.max(1, window.devicePixelRatio || 1));
    const px = dpr * RENDER_SCALE;
    this.canvas.width = Math.floor(window.innerWidth * px);
    this.canvas.height = Math.floor(window.innerHeight * px);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  render(now = 0) {
    const { gl, program, buffer, canvas, tex } = this;
    if (!program || !gl.isProgram(program)) return;
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(this.uTex, 0);
    gl.uniform1f(this.uFili, FILIGRANE_STRENGTH);
    gl.uniform2f(this.uResolution, canvas.width, canvas.height);
    gl.uniform1f(this.uTime, now * 1e-3);
    gl.uniform3fv(this.uColor, this.color);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  dispose() {
    const { gl, program, vs, fs, buffer, tex, img } = this;
    if (img) img.onload = null;
    if (buffer) gl.deleteBuffer(buffer);
    if (tex) gl.deleteTexture(tex);
    if (program) {
      if (vs) {
        gl.detachShader(program, vs);
        gl.deleteShader(vs);
      }
      if (fs) {
        gl.detachShader(program, fs);
        gl.deleteShader(fs);
      }
      gl.deleteProgram(program);
    }
    this.program = null;
  }
}

function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255,
      ]
    : null;
}

export function SmokeBackground() {
  const { tweaks } = useTweaks();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  // L'intensité pilote l'opacité CSS ET coupe le rendu GPU quand elle est nulle.
  const intensityRef = useRef(tweaks.smokeIntensity);
  useEffect(() => {
    intensityRef.current = tweaks.smokeIntensity;
  }, [tweaks.smokeIntensity]);

  // Setup unique au montage (pas de re-création du contexte sur changement de couleur/intensité).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2");
    if (!gl) return; // pas de WebGL2 → fond abysse conservé, aucun crash

    const renderer = new Renderer(canvas, gl);
    if (!renderer.setup()) return;
    rendererRef.current = renderer;

    const reduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    renderer.loadTexture("/watermark-halftone.jpg", () => {
      if (reduced) renderer.render(5000); // repeindre la frame figée une fois la texture prête
    });

    const handleResize = () => {
      renderer.updateScale();
      if (reduced) renderer.render(5000);
    };
    renderer.updateScale();
    window.addEventListener("resize", handleResize);

    // prefers-reduced-motion : une seule frame, aucune boucle.
    if (reduced) {
      renderer.render(5000);
      return () => {
        window.removeEventListener("resize", handleResize);
        renderer.dispose();
        rendererRef.current = null;
      };
    }

    let animationFrameId = 0;
    let running = true;
    let last = 0;
    const loop = (now: number) => {
      if (!running) return;
      animationFrameId = requestAnimationFrame(loop);
      // Cap 25 fps + skip du rendu GPU quand l'intensité est nulle (fond masqué).
      if (now - last < FRAME_MS) return;
      last = now;
      if (intensityRef.current <= 0.001) return;
      renderer.render(now);
    };
    animationFrameId = requestAnimationFrame(loop);

    const handleVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(animationFrameId);
      } else if (!running) {
        running = true;
        last = 0;
        animationFrameId = requestAnimationFrame(loop);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibility);
      renderer.dispose();
      rendererRef.current = null;
    };
  }, []);

  // Couleur pilotée par le TweaksPanel (sans recréer le contexte).
  useEffect(() => {
    const rgb = hexToRgb(tweaks.smokeColor);
    if (rgb) rendererRef.current?.updateColor(rgb);
  }, [tweaks.smokeColor]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 block h-full w-full"
      style={{ zIndex: -2, opacity: tweaks.smokeIntensity }}
    />
  );
}

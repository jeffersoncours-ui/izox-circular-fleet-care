// Fond animé "fumée" WebGL (shader fbm) — arrière-plan de la landing B2C.
// Posé DERRIÈRE le filigrane (z-index -2 < filigrane -1) dans le contexte
// isolé .izox-b2c. Aucun effet hors de la landing.
//
// Version adaptée + sécurisée (session 42) :
//   - Fallback : si WebGL2 indisponible → ne rend rien (pas de crash, fond abysse conservé).
//   - prefers-reduced-motion → une seule frame figée, aucune boucle rAF (accessibilité).
//   - visibilitychange → boucle mise en pause quand l'onglet est caché (batterie mobile).
//   - DPR plafonné à 1.5 → limite le nombre de fragments sur écrans haute densité (perf/batterie).
//   - Couleur sombre teintée accent + opacité CSS faible → texture subtile, ne délave pas le texte.

import { useEffect, useRef } from "react";

const fragmentShaderSource = `#version 300 es
precision highp float;
out vec4 O;
uniform float time;
uniform vec2 resolution;
uniform vec3 u_color;

#define FC gl_FragCoord.xy
#define R resolution
#define T (time+660.)

float rnd(vec2 p){p=fract(p*vec2(12.9898,78.233));p+=dot(p,p+34.56);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);return mix(mix(rnd(i),rnd(i+vec2(1,0)),u.x),mix(rnd(i+vec2(0,1)),rnd(i+1.),u.x),u.y);}
float fbm(vec2 p){float t=.0,a=1.;for(int i=0;i<5;i++){t+=a*noise(p);p*=mat2(1,-1.2,.2,1.2)*2.;a*=.5;}return t;}

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
  private uResolution: WebGLUniformLocation | null = null;
  private uTime: WebGLUniformLocation | null = null;
  private uColor: WebGLUniformLocation | null = null;
  private color: [number, number, number] = [0.5, 0.5, 0.5];

  constructor(canvas: HTMLCanvasElement, gl: WebGL2RenderingContext) {
    this.canvas = canvas;
    this.gl = gl;
  }

  /** Compile + link. Retourne false en cas d'échec (l'appelant abandonne proprement). */
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
    return true;
  }

  updateColor(c: [number, number, number]) {
    this.color = c;
  }

  /** DPR plafonné à 1.5 : sur un écran 3x, full DPR = 9× les fragments → trop coûteux. */
  updateScale() {
    const dpr = Math.min(1.5, Math.max(1, window.devicePixelRatio || 1));
    this.canvas.width = Math.floor(window.innerWidth * dpr);
    this.canvas.height = Math.floor(window.innerHeight * dpr);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  render(now = 0) {
    const { gl, program, buffer, canvas } = this;
    if (!program || !gl.isProgram(program)) return;
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.uniform2f(this.uResolution, canvas.width, canvas.height);
    gl.uniform1f(this.uTime, now * 1e-3);
    gl.uniform3fv(this.uColor, this.color);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  dispose() {
    const { gl, program, vs, fs, buffer } = this;
    if (buffer) gl.deleteBuffer(buffer);
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

interface SmokeBackgroundProps {
  /** Teinte des volutes claires. Sombre par défaut pour rester subtil sur l'abysse. */
  smokeColor?: string;
  /** Opacité CSS du canvas (0..1) — faible = texture discrète, contraste texte préservé. */
  opacity?: number;
}

export function SmokeBackground({
  smokeColor = "#155e63",
  opacity = 0.32,
}: SmokeBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Fallback : pas de WebGL2 → on n'affiche rien (le fond abysse reste).
    const gl = canvas.getContext("webgl2");
    if (!gl) return;

    const renderer = new Renderer(canvas, gl);
    if (!renderer.setup()) return; // shader KO → abandon silencieux
    rendererRef.current = renderer;

    const initial = hexToRgb(smokeColor);
    if (initial) renderer.updateColor(initial);

    const reduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    const handleResize = () => {
      renderer.updateScale();
      // Repeindre immédiatement après resize (utile en mode figé).
      if (reduced) renderer.render(5000);
    };
    renderer.updateScale();
    window.addEventListener("resize", handleResize);

    // prefers-reduced-motion : une seule frame (fondu d'apparition terminé), aucune boucle.
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
    const loop = (now: number) => {
      if (!running) return;
      renderer.render(now);
      animationFrameId = requestAnimationFrame(loop);
    };
    animationFrameId = requestAnimationFrame(loop);

    // Batterie : pause quand l'onglet est masqué, reprise au retour.
    const handleVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(animationFrameId);
      } else if (!running) {
        running = true;
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
  }, [smokeColor]);

  // Met à jour la couleur sans recréer le contexte si la prop change.
  useEffect(() => {
    const rgb = hexToRgb(smokeColor);
    if (rgb) rendererRef.current?.updateColor(rgb);
  }, [smokeColor]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 block h-full w-full"
      style={{ zIndex: -2, opacity }}
    />
  );
}

"use client";

import { useEffect, useRef } from "react";

// Original frosted crystal/silk material, restored with a golden-yellow tint.
// All rendering is local: no textures, remote scripts, or external services.
const vertex = `attribute vec2 position;
void main(){ gl_Position=vec4(position,0.,1.); }`;
const fragment = `precision highp float;
uniform vec2 resolution;
uniform float time;
void main(){
  vec2 uv=(gl_FragCoord.xy/resolution-.5)*2.25;
  float phase=time*1.256637;
  uv.y-=sin(phase)*.025;
  float tilt=.08*sin(phase);
  uv=mat2(cos(tilt),-sin(tilt),sin(tilt),cos(tilt))*uv;
  float r=length(uv);
  float alpha=1.-smoothstep(.975,1.,r);
  if(alpha<.001){gl_FragColor=vec4(0.);return;}
  float z=sqrt(max(0.,1.-r*r));
  vec3 n=vec3(uv,z);
  vec2 p=uv/(.72+.28*z);
  float wave=.17*sin(p.x*3.2+sin(phase)*.7)+.07*sin(p.x*7.-phase);
  float fold=p.y-wave;
  float silk=exp(-pow((fold-.20)/.28,2.));
  float lower=exp(-pow((fold+.54)/.20,2.))*.45;
  float ripple=sin(p.x*7.+p.y*5.+sin(phase)*1.5);
  vec3 pearl=vec3(1.,.96,.78);
  vec3 gold=mix(vec3(.94,.64,.16),vec3(1.,.82,.38),.5+.5*ripple);
  vec3 color=mix(pearl,gold,clamp(silk*.85+lower,0.,1.));
  float ribbon=exp(-pow((fold-.42-.065*sin(p.x*9.+phase))/.035,2.));
  color=mix(color,vec3(1.,.94,.67),ribbon*.65);
  float fine=exp(-pow((fold-.50-.035*sin(p.x*11.+phase))/.015,2.));
  color+=fine*.075;
  float amber=exp(-pow((p.x-.48)/.12,2.)-pow((fold-.13)/.3,2.));
  color=mix(color,vec3(.94,.67,.24),amber*.26);
  float rim=pow(1.-z,3.);
  color=mix(color,vec3(1.,.96,.84),rim*.52);
  float light=pow(max(dot(n,normalize(vec3(-.5,.7,1.))),0.),22.);
  color=mix(color,vec3(1.),light*.80);
  float edge=exp(-pow((r-.965)/.018,2.));
  color+=edge*.04;
  color*=.97+.03*z;
  gl_FragColor=vec4(color,alpha);
}`;

export function SunOrb({ paused = false }: { paused?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const gl = el.getContext("webgl", { alpha: true, premultipliedAlpha: false, antialias: true });
    if (!gl) return;
    const shaders: WebGLShader[] = [];
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { gl.deleteShader(shader); return null; }
      shaders.push(shader); return shader;
    };
    const vs=compile(gl.VERTEX_SHADER,vertex), fs=compile(gl.FRAGMENT_SHADER,fragment);
    if (!vs || !fs) { shaders.forEach(s=>gl.deleteShader(s)); return; }
    const program=gl.createProgram()!;
    gl.attachShader(program,vs); gl.attachShader(program,fs); gl.linkProgram(program);
    if (!gl.getProgramParameter(program,gl.LINK_STATUS)) { gl.deleteProgram(program); shaders.forEach(s=>gl.deleteShader(s)); return; }
    gl.useProgram(program);
    const buffer=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const position=gl.getAttribLocation(program,"position");
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    const size=Math.round(88*Math.min(window.devicePixelRatio||1,2));
    el.width=size; el.height=size; gl.viewport(0,0,size,size);
    gl.uniform2f(gl.getUniformLocation(program,"resolution"),size,size);
    const clock=gl.getUniformLocation(program,"time");
    const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf=0, elapsed=0, last=performance.now();
    const draw=(now:number)=>{
      elapsed+=Math.min((now-last)/1000,.05);last=now;
      gl.uniform1f(clock,elapsed);gl.drawArrays(gl.TRIANGLES,0,6);
      if(!paused&&!reduced.matches&&!document.hidden)raf=requestAnimationFrame(draw);
    };
    const resume=()=>{cancelAnimationFrame(raf);last=performance.now();draw(last);};
    reduced.addEventListener("change",resume);document.addEventListener("visibilitychange",resume);
    draw(last);
    return ()=>{cancelAnimationFrame(raf);reduced.removeEventListener("change",resume);document.removeEventListener("visibilitychange",resume);gl.deleteBuffer(buffer);gl.deleteProgram(program);shaders.forEach(s=>gl.deleteShader(s));};
  },[paused]);
  return <canvas ref={canvas} aria-hidden="true" style={{display:"block",width:"100%",height:"100%",pointerEvents:"none"}} />;
}

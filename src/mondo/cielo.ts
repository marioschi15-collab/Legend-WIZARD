import * as THREE from 'three';
import { atmosfera } from './atmosfera.js';

export const DIREZIONE_SOLE = new THREE.Vector3(-0.5, 0.34, -0.62).normalize();

/** Il cielo: una grande cupola colorata da una formula, con sole e nuvole che scorrono. */
export function creaCielo(): THREE.Mesh {
  const materiale = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uSole: { value: DIREZIONE_SOLE },
      uOrizzonte: atmosfera.nebbiaColore,
      uAlto: atmosfera.cieloAlto,
      uLuce: atmosfera.luce,
      uTinta: atmosfera.tinta,
      uTempo: atmosfera.tempo,
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = projectionMatrix * viewMatrix * vec4(position + cameraPosition, 1.0);
        gl_Position = p.xyww;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uSole; uniform vec3 uOrizzonte; uniform vec3 uTinta; uniform vec3 uAlto;
      uniform float uLuce; uniform float uTempo;
      varying vec3 vDir;
      float grana(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float rumore(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(grana(i), grana(i + vec2(1, 0)), f.x), mix(grana(i + vec2(0, 1)), grana(i + vec2(1, 1)), f.x), f.y);
      }
      float strati(vec2 p) {
        float s = 0.0; float a = 0.5;
        for (int i = 0; i < 5; i++) { s += a * rumore(p); p = p * 2.03 + 7.3; a *= 0.5; }
        return s;
      }
      void main() {
        vec3 d = normalize(vDir);
        float su = max(d.y, 0.0);
        // Il colore dell'orizzonte è quello della nebbia, già tinto e scurito: tingerlo di nuovo lo faceva più scuro
        // del terreno lontano, che spiccava chiaro contro il cielo.
        vec3 lume = uTinta * mix(0.25, 1.0, min(uLuce, 1.0));
        // L'ora dorata: in alto il cielo è viola e pieno di stelle, verso il sole si accende d'oro e di rosa.
        float versoSole = max(dot(normalize(d.xz + 1e-5), normalize(uSole.xz)), 0.0);
        float basso = pow(1.0 - su, 5.0);
        vec3 colore = mix(uOrizzonte, uAlto * lume, pow(su, 0.5));
        colore = mix(colore, vec3(1.0, 0.6, 0.34) * lume, versoSole * versoSole * basso * 0.8);
        colore = mix(colore, vec3(0.86, 0.42, 0.62) * lume, (1.0 - versoSole) * basso * 0.25);
        float sole = max(dot(d, uSole), 0.0);
        colore += vec3(1.0, 0.72, 0.4) * lume * (pow(sole, 700.0) * 3.0 + pow(sole, 9.0) * 0.32 + pow(sole, 2.5) * 0.06);
        vec3 cella = floor(d * 170.0);
        float stella = fract(sin(dot(cella, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
        float brilla = 0.75 + 0.25 * sin(uTempo * 2.0 + stella * 90.0);
        colore += vec3(0.9, 0.9, 1.0) * step(0.9965, stella) * smoothstep(0.3, 0.75, su) * brilla * lume * 0.9;
        if (d.y > 0.01) {
          vec2 uv = d.xz / (d.y + 0.12) * 0.9 + vec2(uTempo * 0.006, uTempo * 0.002);
          float n = strati(uv);
          float nube = smoothstep(0.48, 0.78, n) * smoothstep(0.01, 0.16, d.y);
          // Le nuvole: viola in ombra, rosa e oro dove le prende il sole basso.
          vec3 chiaro = mix(vec3(0.42, 0.36, 0.62), vec3(1.0, 0.7, 0.5), smoothstep(0.45, 0.95, n * 0.6 + versoSole * 0.55 + sole * 0.3)) * lume;
          chiaro = mix(chiaro, uOrizzonte * 1.1, 0.3);
          colore = mix(colore, chiaro, nube * 0.85);
        }
        gl_FragColor = vec4(colore, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
  const cupola = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), materiale);
  cupola.frustumCulled = false;
  cupola.renderOrder = -10;
  return cupola;
}

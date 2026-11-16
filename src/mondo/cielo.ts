import * as THREE from 'three';
import { atmosfera } from './atmosfera.js';

export const DIREZIONE_SOLE = new THREE.Vector3(-0.5, 0.6, -0.62).normalize();

/** Una fotografia del cielo a tutto tondo (da Poly Haven, libera): nelle prove senza grafica basta un punto grigio. */
function fotoCielo(nome: string): THREE.Texture {
  if (typeof document === 'undefined') return new THREE.DataTexture(new Uint8Array([128, 150, 190, 255]), 1, 1);
  const t = new THREE.TextureLoader().load(`cielo/${nome}.jpg`);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  // Senza le versioni rimpicciolite: dove l'immagine si richiude su se stessa farebbero una riga.
  t.generateMipmaps = false;
  t.minFilter = THREE.LinearFilter;
  return t;
}

/**
 * Il cielo: una cupola con due fotografie vere, una di pieno giorno e una del tramonto, che sfumano una nell'altra
 * con l'ora. Il sole delle fotografie è girato dove sta il sole del gioco. Di notte si spegne e spuntano le stelle.
 */
export function creaCielo(): THREE.Mesh {
  const materiale = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uSole: { value: DIREZIONE_SOLE },
      uOrizzonte: atmosfera.nebbiaColore,
      uLuce: atmosfera.luce,
      uTinta: atmosfera.tinta,
      uTempo: atmosfera.tempo,
      uNotte: atmosfera.notte,
      uSera: atmosfera.sera,
      uNebbia: atmosfera.nebbiaDensita,
      uFotoGiorno: { value: fotoCielo('giorno') },
      uFotoSera: { value: fotoCielo('tramonto') },
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
      uniform vec3 uSole; uniform vec3 uOrizzonte; uniform vec3 uTinta;
      uniform float uLuce; uniform float uTempo; uniform float uNotte; uniform float uSera; uniform float uNebbia;
      uniform sampler2D uFotoGiorno; uniform sampler2D uFotoSera;
      varying vec3 vDir;
      // Le fotografie hanno le luci già schiacciate: qui si ridà loro forza, così il sole abbaglia davvero.
      vec3 viva(vec3 c) { return c * (1.0 + 1.9 * c * c); }
      void main() {
        vec3 d = normalize(vDir);
        // Di quanto girare ogni fotografia perché il suo sole cada dove sta quello del gioco.
        float giro = atan(d.z, d.x) - atan(uSole.z, uSole.x);
        float su = asin(clamp(d.y, -1.0, 1.0)) * 0.31830989 + 0.5;
        // Sotto l'orizzonte le fotografie non servono: lì c'è la foschia.
        su = max(su, 0.502);
        vec3 giorno = viva(textureLod(uFotoGiorno, vec2(giro * 0.15915494 + 0.5442, su), 0.0).rgb);
        vec3 sera = viva(textureLod(uFotoSera, vec2(giro * 0.15915494 + 0.6322, su), 0.0).rgb);
        vec3 lume = uTinta * mix(0.03, 1.0, smoothstep(0.25, 1.0, uLuce));
        vec3 colore = mix(giorno, sera, uSera) * lume;
        // Le stelle, solo di notte.
        vec3 cella = floor(d * 170.0);
        float stella = fract(sin(dot(cella, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
        float brilla = 0.75 + 0.25 * sin(uTempo * 2.0 + stella * 90.0);
        colore += vec3(0.9, 0.9, 1.0) * step(0.992, stella) * smoothstep(0.04, 0.5, d.y) * brilla * uNotte * uNotte * 2.5;
        // Verso l'orizzonte il cielo si perde nella foschia, dello stesso colore della nebbia sul terreno lontano.
        colore = mix(uOrizzonte, colore, smoothstep(-0.01, 0.09, d.y));
        // Dentro una nebbia fitta il cielo non si vede: resta un chiarore grigio, appena più chiaro in alto.
        colore = mix(colore, uOrizzonte * (1.0 + 0.25 * max(d.y, 0.0)), smoothstep(0.005, 0.016, uNebbia));
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

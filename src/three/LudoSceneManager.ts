import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {
  COLOR_DARK_HEX,
  COLOR_HEX,
  COLOR_LIGHT_HEX,
  getGridPointForProgress,
  getTokenWorldPlacement,
  gridToWorldXZ,
} from '../game/boardCoords';
import {
  CameraPreset,
  GameSpeed,
  PlayerColor,
  TokenState,
} from '../game/types';
import { BoardTextures, createBoardTextures } from './proceduralAssets';

interface TokenVisual {
  id: string;
  color: PlayerColor;
  index: number;
  group: THREE.Group;
  bodyGroup: THREE.Group;
  collider: THREE.Mesh;
  ringMesh: THREE.Mesh;
  shadowMesh: THREE.Mesh;
  currentPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  currentScale: number;
  targetScale: number;
  isSelectable: boolean;
  strikeTimer: number;
}

interface HopAnimation {
  tokenId: string;
  color: PlayerColor;
  tokenIndex: number;
  waypoints: THREE.Vector3[];
  finalScale: number;
  stepDuration: number;
  elapsed: number;
  lastStepNotified: number;
  isDeploy: boolean;
  onStep?: (stepIdx: number) => void;
  onComplete: () => void;
}

interface CaptureAnimation {
  tokenId: string;
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  elapsed: number;
  duration: number;
}

interface ShockwaveRing {
  mesh: THREE.Mesh;
  geometry: THREE.BufferGeometry;
  material: THREE.MeshBasicMaterial;
  elapsed: number;
  duration: number;
}

interface DiceAnimation {
  startQuat: THREE.Quaternion;
  targetQuat: THREE.Quaternion;
  spinEuler: THREE.Euler;
  elapsed: number;
  duration: number;
  onComplete: () => void;
}

interface ParticleSlot {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  rot: number;
  rotSpeed: number;
  color: THREE.Color;
}

export interface SceneCallbacks {
  onDieClick: () => void;
  onTokenClick: (tokenId: string) => void;
}

// Reusable scratch objects outside render loop (Zero GC)
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _quatA = new THREE.Quaternion();
const _eulerA = new THREE.Euler();
const _mat4 = new THREE.Matrix4();
const _scaleVec = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function getDieTargetQuaternion(faceValue: number): THREE.Quaternion {
  // Box material order: 0:+X(3), 1:-X(4), 2:+Y(1), 3:-Y(6), 4:+Z(2), 5:-Z(5)
  const euler = new THREE.Euler(0, 0, 0, 'XYZ');
  switch (faceValue) {
    case 1:
      euler.set(0, 0, 0);
      break;
    case 2:
      euler.set(-Math.PI / 2, 0, 0);
      break;
    case 3:
      euler.set(0, 0, Math.PI / 2);
      break;
    case 4:
      euler.set(0, 0, -Math.PI / 2);
      break;
    case 5:
      euler.set(Math.PI / 2, 0, 0);
      break;
    case 6:
      euler.set(Math.PI, 0, 0);
      break;
    default:
      euler.set(0, 0, 0);
  }
  return new THREE.Quaternion().setFromEuler(euler);
}

export class LudoSceneManager {
  private container: HTMLElement;
  private callbacks: SceneCallbacks;
  private isSoftwareGl: boolean;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private textures: BoardTextures;

  private tokenVisuals = new Map<string, TokenVisual>();
  private clickables: THREE.Object3D[] = [];
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();

  private dieGroup!: THREE.Group;
  private dieMesh!: THREE.Mesh;
  private dieShadow!: THREE.Mesh;
  private diePadRing!: THREE.Mesh;
  private dieCollider!: THREE.Mesh;
  private dieAwaitingRoll = false;
  private dieAccentColor = new THREE.Color('#fbbf24');

  private particleMesh!: THREE.InstancedMesh;
  private particles: ParticleSlot[] = [];
  private shockwaves: ShockwaveRing[] = [];
  private yardBeacons = new Map<PlayerColor, THREE.Mesh>();

  private hopAnim: HopAnimation | null = null;
  private captureAnims: CaptureAnimation[] = [];
  private diceAnim: DiceAnimation | null = null;

  private cameraPreset: CameraPreset = 'classic';
  private cameraGoalPos = new THREE.Vector3(0, 26.8, 11.4);
  private isTitleView = false;
  private activeTurnColor: PlayerColor = 'red';

  private pointerDownPos = { x: 0, y: 0 };
  private frameId = 0;
  private disposed = false;
  private contextLost = false;
  private lastTimeMs = performance.now();
  private totalTime = 0;
  private resizeObserver: ResizeObserver;

  private geometriesToDispose: THREE.BufferGeometry[] = [];
  private materialsToDispose: THREE.Material[] = [];

  constructor(container: HTMLElement, callbacks: SceneCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.isSoftwareGl = detectSoftwareWebGL();

    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 320);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: this.isSoftwareGl,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2),
    );
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.touchAction = 'none';
    this.renderer.domElement.setAttribute('data-testid', 'ludo-webgl-canvas');
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0b0e24');
    this.scene.fog = new THREE.FogExp2('#0b0e24', 0.013);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.5, 160);
    this.camera.position.set(0, 26.8, 11.4);
    this.camera.lookAt(0, 0, 0);

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createBoardTextures(maxAniso);

    this.setupLighting();
    this.buildBoardAssembly();
    this.buildDiceAssembly();
    this.buildParticlePool();

    this.raycaster.layers.set(1);

    this.bindEvents();
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);
    this.handleResize();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.startLoop();
  }

  private trackGeo<T extends THREE.BufferGeometry>(g: T): T {
    this.geometriesToDispose.push(g);
    return g;
  }

  private trackMat<T extends THREE.Material>(m: T): T {
    this.materialsToDispose.push(m);
    return m;
  }

  private setupLighting(): void {
    const hemi = new THREE.HemisphereLight('#e0e7ff', '#1e1b4b', 0.78);
    this.scene.add(hemi);

    const keyLight = new THREE.DirectionalLight('#fff5db', 2.3);
    keyLight.position.set(10, 22, 12);
    if (!this.isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 4;
      keyLight.shadow.camera.far = 48;
      const d = 11;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#818cf8', 1.0);
    rimLight.position.set(-12, 11, -14);
    this.scene.add(rimLight);
  }

  private buildBoardAssembly(): void {
    const boardGroup = new THREE.Group();

    // 1. Tabletop Arena Mat Disc extending smoothly into fog
    const matGeo = this.trackGeo(new THREE.CylinderGeometry(28, 28, 0.2, 48));
    const matMaterial = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        map: this.textures.tableMat,
        roughness: 0.88,
        metalness: 0.06,
      }),
    );
    const tableMatMesh = new THREE.Mesh(matGeo, matMaterial);
    tableMatMesh.position.y = -0.52;
    tableMatMesh.receiveShadow = !this.isSoftwareGl;
    boardGroup.add(tableMatMesh);

    // 2. Contact Shadow beneath the board frame
    const boardShadowGeo = this.trackGeo(new THREE.PlaneGeometry(18.8, 18.8));
    const boardShadowMat = this.trackMat(
      new THREE.MeshBasicMaterial({
        map: this.textures.contactShadow,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
      }),
    );
    const boardShadow = new THREE.Mesh(boardShadowGeo, boardShadowMat);
    boardShadow.rotation.x = -Math.PI / 2;
    boardShadow.position.y = -0.405;
    boardGroup.add(boardShadow);

    // 3. Sleek Beveled Luxury Outer Frame (ExtrudeGeometry)
    const outerHalf = 7.92;
    const innerHalf = 7.48;
    const frameShape = new THREE.Shape();
    frameShape.moveTo(-outerHalf, -outerHalf);
    frameShape.lineTo(outerHalf, -outerHalf);
    frameShape.lineTo(outerHalf, outerHalf);
    frameShape.lineTo(-outerHalf, outerHalf);
    frameShape.closePath();

    const holePath = new THREE.Path();
    holePath.moveTo(-innerHalf, -innerHalf);
    holePath.lineTo(-innerHalf, innerHalf);
    holePath.lineTo(innerHalf, innerHalf);
    holePath.lineTo(innerHalf, -innerHalf);
    holePath.closePath();
    frameShape.holes.push(holePath);

    const frameGeo = this.trackGeo(
      new THREE.ExtrudeGeometry(frameShape, {
        depth: 0.34,
        bevelEnabled: true,
        bevelThickness: 0.05,
        bevelSize: 0.05,
        bevelSegments: 2,
      }),
    );
    frameGeo.rotateX(-Math.PI / 2);
    const frameMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: '#231f42',
        roughness: 0.34,
        metalness: 0.58,
      }),
    );
    const frameMesh = new THREE.Mesh(frameGeo, frameMat);
    frameMesh.position.y = -0.32;
    frameMesh.receiveShadow = !this.isSoftwareGl;
    frameMesh.castShadow = !this.isSoftwareGl;
    boardGroup.add(frameMesh);

    // 4. Four Brushed-Gold Corner Hardware Accents
    const brassMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: '#fbbf24',
        roughness: 0.2,
        metalness: 0.94,
      }),
    );
    const bracketGeo = this.trackGeo(new THREE.BoxGeometry(0.82, 0.14, 0.82));
    const cornerSigns: Array<[number, number]> = [
      [-7.68, -7.68],
      [7.68, -7.68],
      [7.68, 7.68],
      [-7.68, 7.68],
    ];
    cornerSigns.forEach(([cx, cz]) => {
      const cap = new THREE.Mesh(bracketGeo, brassMat);
      cap.position.set(cx, 0.04, cz);
      boardGroup.add(cap);
    });

    // 5. Main 15x15 Board Surface Slab
    const slabGeo = this.trackGeo(new THREE.BoxGeometry(15, 0.28, 15));
    const slabTopMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        map: this.textures.albedo,
        bumpMap: this.textures.bump,
        bumpScale: 0.045,
        roughnessMap: this.textures.roughness,
        roughness: 0.72,
        metalness: 0.08,
      }),
    );
    const slabSideMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: '#111827',
        roughness: 0.6,
        metalness: 0.2,
      }),
    );
    const slabMesh = new THREE.Mesh(slabGeo, [
      slabSideMat,
      slabSideMat,
      slabTopMat,
      slabSideMat,
      slabSideMat,
      slabSideMat,
    ]);
    slabMesh.position.y = -0.14; // Top surface sits cleanly at Y = 0.00
    slabMesh.receiveShadow = !this.isSoftwareGl;
    boardGroup.add(slabMesh);

    // 6. Active Turn Corner Yard Beacons (highlights current player's corner cleanly)
    const beaconOuter = 2.94;
    const beaconInner = 2.74;
    const beaconShape = new THREE.Shape();
    beaconShape.moveTo(-beaconOuter, -beaconOuter);
    beaconShape.lineTo(beaconOuter, -beaconOuter);
    beaconShape.lineTo(beaconOuter, beaconOuter);
    beaconShape.lineTo(-beaconOuter, beaconOuter);
    beaconShape.closePath();
    const beaconHole = new THREE.Path();
    beaconHole.moveTo(-beaconInner, -beaconInner);
    beaconHole.lineTo(-beaconInner, beaconInner);
    beaconHole.lineTo(beaconInner, beaconInner);
    beaconHole.lineTo(beaconInner, -beaconInner);
    beaconHole.closePath();
    beaconShape.holes.push(beaconHole);
    const beaconGeo = this.trackGeo(new THREE.ShapeGeometry(beaconShape));
    beaconGeo.rotateX(-Math.PI / 2);

    const yardCenters: Record<PlayerColor, [number, number]> = {
      red: [-4.5, -4.5],
      green: [4.5, -4.5],
      yellow: [4.5, 4.5],
      blue: [-4.5, 4.5],
    };
    (['red', 'green', 'yellow', 'blue'] as PlayerColor[]).forEach((color) => {
      const mat = this.trackMat(
        new THREE.MeshBasicMaterial({
          color: '#fef08a',
          transparent: true,
          opacity: 0,
          depthWrite: false,
        }),
      );
      const mesh = new THREE.Mesh(beaconGeo, mat);
      const [yx, yz] = yardCenters[color];
      mesh.position.set(yx, 0.024, yz);
      mesh.visible = false;
      boardGroup.add(mesh);
      this.yardBeacons.set(color, mesh);
    });

    // 7. Center Crown Dice Pad Ring
    const padRingGeo = this.trackGeo(new THREE.TorusGeometry(0.68, 0.04, 12, 36));
    padRingGeo.rotateX(Math.PI / 2);
    const padRingMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: '#fbbf24',
        emissive: '#fbbf24',
        emissiveIntensity: 0.25,
        roughness: 0.25,
        metalness: 0.85,
      }),
    );
    this.diePadRing = new THREE.Mesh(padRingGeo, padRingMat);
    this.diePadRing.position.y = 0.02;
    boardGroup.add(this.diePadRing);

    this.scene.add(boardGroup);
  }

  private buildDiceAssembly(): void {
    this.dieGroup = new THREE.Group();

    const dieSize = 0.88;
    const dieGeo = this.trackGeo(new RoundedBoxGeometry(dieSize, dieSize, dieSize, 4, 0.13));
    // RoundedBoxGeometry creates 6 material groups matching BoxGeometry: +X, -X, +Y, -Y, +Z, -Z
    const faceOrder = [2, 3, 0, 5, 1, 4]; // 3, 4, 1, 6, 2, 5
    const dieMaterials = faceOrder.map((faceIdx) =>
      this.trackMat(
        new THREE.MeshPhysicalMaterial({
          color: '#ffffff',
          map: this.textures.diceFaces[faceIdx],
          roughness: 0.22,
          metalness: 0.12,
          clearcoat: 0.85,
          clearcoatRoughness: 0.15,
        }),
      ),
    );

    this.dieMesh = new THREE.Mesh(dieGeo, dieMaterials);
    this.dieMesh.position.y = dieSize / 2 + 0.02;
    this.dieMesh.castShadow = !this.isSoftwareGl;
    this.dieGroup.add(this.dieMesh);

    const shadowGeo = this.trackGeo(new THREE.PlaneGeometry(1.38, 1.38));
    const shadowMat = this.trackMat(
      new THREE.MeshBasicMaterial({
        map: this.textures.contactShadow,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
      }),
    );
    this.dieShadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.dieShadow.rotation.x = -Math.PI / 2;
    this.dieShadow.position.y = 0.015;
    this.dieGroup.add(this.dieShadow);

    // Simplified collider for effortless tapping
    const colGeo = this.trackGeo(new THREE.BoxGeometry(1.45, 1.45, 1.45));
    const colMat = this.trackMat(new THREE.MeshBasicMaterial({ visible: false }));
    this.dieCollider = new THREE.Mesh(colGeo, colMat);
    this.dieCollider.position.y = 0.7;
    this.dieCollider.layers.set(1);
    this.dieCollider.userData.kind = 'die';
    this.dieGroup.add(this.dieCollider);
    this.clickables.push(this.dieCollider);

    this.scene.add(this.dieGroup);
  }

  private buildParticlePool(): void {
    const count = 64;
    const pGeo = this.trackGeo(new THREE.OctahedronGeometry(0.11, 0));
    const pMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        roughness: 0.3,
        metalness: 0.4,
        emissive: '#ffffff',
        emissiveIntensity: 0.35,
      }),
    );
    this.particleMesh = new THREE.InstancedMesh(pGeo, pMat, count);
    this.particleMesh.frustumCulled = false;

    for (let i = 0; i < count; i++) {
      this.particles.push({
        active: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 1,
        rot: 0,
        rotSpeed: 0,
        color: new THREE.Color('#ffffff'),
      });
      _mat4.makeScale(0, 0, 0);
      this.particleMesh.setMatrixAt(i, _mat4);
      this.particleMesh.setColorAt(i, new THREE.Color('#ffffff'));
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;
    if (this.particleMesh.instanceColor) {
      this.particleMesh.instanceColor.needsUpdate = true;
    }
    this.scene.add(this.particleMesh);
  }

  public spawnBurst(
    x: number,
    y: number,
    z: number,
    hexColor: string,
    amount = 18,
  ): void {
    let spawned = 0;
    for (let i = 0; i < this.particles.length && spawned < amount; i++) {
      const slot = this.particles[i];
      if (!slot.active) {
        slot.active = true;
        slot.pos.set(x, y, z);
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.8 + Math.random() * 3.4;
        slot.vel.set(
          Math.cos(angle) * speed,
          3.2 + Math.random() * 3.6,
          Math.sin(angle) * speed,
        );
        slot.life = 0;
        slot.maxLife = 0.55 + Math.random() * 0.4;
        slot.rot = Math.random() * Math.PI;
        slot.rotSpeed = (Math.random() - 0.5) * 12;
        slot.color.set(hexColor);
        this.particleMesh.setColorAt(i, slot.color);
        spawned++;
      }
    }
    if (this.particleMesh.instanceColor) {
      this.particleMesh.instanceColor.needsUpdate = true;
    }
  }

  public triggerVictoryCelebration(): void {
    const palette = ['#ef4444', '#22c55e', '#eab308', '#3b82f6', '#fbbf24'];
    palette.forEach((hex, idx) => {
      const angle = (idx / palette.length) * Math.PI * 2;
      this.spawnBurst(
        Math.cos(angle) * 2.2,
        0.9,
        Math.sin(angle) * 2.2,
        hex,
        12,
      );
    });
  }

  private createTokenVisual(token: TokenState): TokenVisual {
    const group = new THREE.Group();
    const bodyGroup = new THREE.Group();
    group.add(bodyGroup);

    const metalMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: '#fde68a',
        roughness: 0.18,
        metalness: 0.92,
      }),
    );

    const enamelMat = this.trackMat(
      new THREE.MeshPhysicalMaterial({
        color: COLOR_HEX[token.color],
        roughness: 0.08,
        metalness: 0.08,
        clearcoat: 1.0,
        clearcoatRoughness: 0.06,
      }),
    );

    const jewelMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: COLOR_LIGHT_HEX[token.color],
        emissive: COLOR_HEX[token.color],
        emissiveIntensity: 0.35,
        roughness: 0.08,
        metalness: 0.4,
      }),
    );

    // 1. Weighted Metallic Base Ring (~13% larger pawn footprint)
    const baseGeo = this.trackGeo(
      new THREE.CylinderGeometry(0.36, 0.415, 0.135, 24),
    );
    const baseMesh = new THREE.Mesh(baseGeo, metalMat);
    baseMesh.position.y = 0.068;
    baseMesh.castShadow = !this.isSoftwareGl;
    bodyGroup.add(baseMesh);

    // 2. Sculpted Lathe Pawn Torso (~13% taller & fuller)
    const profile = [
      new THREE.Vector2(0.01, 0.135),
      new THREE.Vector2(0.35, 0.135),
      new THREE.Vector2(0.27, 0.27),
      new THREE.Vector2(0.16, 0.54),
      new THREE.Vector2(0.25, 0.70),
      new THREE.Vector2(0.18, 0.81),
      new THREE.Vector2(0.01, 0.83),
    ];
    const torsoGeo = this.trackGeo(new THREE.LatheGeometry(profile, 24));
    const torsoMesh = new THREE.Mesh(torsoGeo, enamelMat);
    torsoMesh.castShadow = !this.isSoftwareGl;
    bodyGroup.add(torsoMesh);

    // 3. Gold / Chrome Collar Accent Ring
    const collarGeo = this.trackGeo(new THREE.TorusGeometry(0.195, 0.036, 10, 24));
    collarGeo.rotateX(Math.PI / 2);
    const collarMesh = new THREE.Mesh(collarGeo, metalMat);
    collarMesh.position.y = 0.70;
    bodyGroup.add(collarMesh);

    // 4. Top Jewel Dome Cap
    const capGeo = this.trackGeo(new THREE.SphereGeometry(0.16, 18, 14));
    const capMesh = new THREE.Mesh(capGeo, jewelMat);
    capMesh.position.y = 0.90;
    capMesh.castShadow = !this.isSoftwareGl;
    bodyGroup.add(capMesh);

    // 5. Contact Shadow Disc
    const shadowGeo = this.trackGeo(new THREE.CircleGeometry(0.48, 20));
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = this.trackMat(
      new THREE.MeshBasicMaterial({
        map: this.textures.contactShadow,
        transparent: true,
        opacity: 0.68,
        depthWrite: false,
      }),
    );
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.position.y = 0.015;
    group.add(shadowMesh);

    // 6. High-Contrast Selectable Highlight Ring
    const ringGeo = this.trackGeo(new THREE.RingGeometry(0.46, 0.68, 32));
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = this.trackMat(
      new THREE.MeshBasicMaterial({
        color: '#fef08a',
        transparent: true,
        opacity: 0.96,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.y = 0.025;
    ringMesh.visible = false;
    group.add(ringMesh);

    // 7. Invisible Proxy Collider for Touch/Click Raycasting
    const colGeo = this.trackGeo(new THREE.CylinderGeometry(0.52, 0.52, 1.25, 12));
    const colMat = this.trackMat(new THREE.MeshBasicMaterial({ visible: false }));
    const collider = new THREE.Mesh(colGeo, colMat);
    collider.position.y = 0.62;
    collider.layers.set(1);
    collider.userData.kind = 'token';
    collider.userData.tokenId = token.id;
    group.add(collider);
    this.clickables.push(collider);

    this.scene.add(group);

    return {
      id: token.id,
      color: token.color,
      index: token.index,
      group,
      bodyGroup,
      collider,
      ringMesh,
      shadowMesh,
      currentPos: new THREE.Vector3(),
      targetPos: new THREE.Vector3(),
      currentScale: 1,
      targetScale: 1,
      isSelectable: false,
      strikeTimer: 0,
    };
  }

  public syncTokens(tokens: readonly TokenState[], snapImmediate = false): void {
    const activeIds = new Set(tokens.map((t) => t.id));

    // Hide tokens not in current playerCount match
    this.tokenVisuals.forEach((vis, id) => {
      const visible = activeIds.has(id);
      vis.group.visible = visible;
      vis.collider.visible = visible;
    });

    for (const token of tokens) {
      let vis = this.tokenVisuals.get(token.id);
      if (!vis) {
        vis = this.createTokenVisual(token);
        this.tokenVisuals.set(token.id, vis);
        snapImmediate = true;
      }

      const placement = getTokenWorldPlacement(token, tokens);
      vis.targetPos.set(placement.x, 0, placement.z);
      vis.targetScale = placement.scale;

      if (snapImmediate) {
        vis.currentPos.copy(vis.targetPos);
        vis.currentScale = vis.targetScale;
        vis.group.position.copy(vis.currentPos);
        vis.bodyGroup.scale.setScalar(vis.currentScale);
      }
    }
  }

  public setSelectableTokens(
    legalTokenIds: readonly string[],
    activeColor: PlayerColor,
    awaitingRoll: boolean,
  ): void {
    const legalSet = new Set(legalTokenIds);
    this.tokenVisuals.forEach((vis) => {
      vis.isSelectable = legalSet.has(vis.id);
      vis.ringMesh.visible = vis.isSelectable;
      (vis.ringMesh.material as THREE.MeshBasicMaterial).color.set(
        vis.isSelectable ? '#fef08a' : COLOR_LIGHT_HEX[activeColor],
      );
    });
    this.dieAwaitingRoll = awaitingRoll;
    this.dieAccentColor.set(COLOR_HEX[activeColor]);
  }

  public setGameStateView(
    isTitle: boolean,
    cameraPreset: CameraPreset,
    activeColor: PlayerColor,
  ): void {
    this.isTitleView = isTitle;
    this.cameraPreset = cameraPreset;
    this.activeTurnColor = activeColor;
    this.updateFixedCamera();
  }

  public applyCameraPreset(
    preset: CameraPreset,
    activeColor: PlayerColor,
  ): void {
    this.cameraPreset = preset;
    this.activeTurnColor = activeColor;
    this.updateFixedCamera();
  }

  private updateFixedCamera(): void {
    const aspect = Math.max(this.camera.aspect || 1, 0.36);
    const vFovRad = THREE.MathUtils.degToRad(this.camera.fov);
    const tanHalfV = Math.tan(vFovRad / 2);
    const halfBoard = 8.05;

    // Fit board cleanly (~92-95% width on Android portrait including bottom perspective corners)
    const widthFill = aspect < 0.85 ? 0.905 : 0.94;
    const distForWidth = halfBoard / (tanHalfV * aspect * widthFill);
    const distForHeight = halfBoard / (tanHalfV * 0.77);
    const baseDist = Math.max(distForWidth, distForHeight);
    const lookZ = aspect < 0.85 ? 0.2 : 0;

    if (this.cameraPreset === 'top') {
      this.cameraGoalPos.set(0, baseDist * 0.99, baseDist * 0.04);
    } else if (aspect < 0.85) {
      // Subtle 3D tilt on portrait mobile maximizes board size & corner bracket clearance
      this.cameraGoalPos.set(0, baseDist * 0.96, baseDist * 0.24);
    } else {
      // Fixed, perfectly centered 3D tabletop view — never drifts, spins, or shakes
      this.cameraGoalPos.set(0, baseDist * 0.91, baseDist * 0.38);
    }
    this.camera.position.copy(this.cameraGoalPos);
    this.camera.lookAt(0, 0, lookZ);
  }

  public animateDiceRoll(
    targetValue: number,
    speed: GameSpeed,
    onComplete: () => void,
  ): void {
    const duration = speed === 'fast' ? 0.52 : 0.92;
    this.diceAnim = {
      startQuat: this.dieMesh.quaternion.clone(),
      targetQuat: getDieTargetQuaternion(targetValue),
      spinEuler: new THREE.Euler(
        Math.PI * (4 + Math.floor(Math.random() * 2) * 2),
        Math.PI * (4 + Math.floor(Math.random() * 2) * 2),
        Math.PI * 2,
      ),
      elapsed: 0,
      duration,
      onComplete,
    };
  }

  public animateTokenHop(
    tokenId: string,
    color: PlayerColor,
    tokenIndex: number,
    pathProgresses: number[],
    finalTokensSnapshot: readonly TokenState[],
    speed: GameSpeed,
    onStep: (stepIdx: number) => void,
    onComplete: () => void,
    isDeploy = false,
  ): void {
    const vis = this.tokenVisuals.get(tokenId);
    if (!vis || pathProgresses.length === 0) {
      this.syncTokens(finalTokensSnapshot);
      onComplete();
      return;
    }

    const waypoints: THREE.Vector3[] = [vis.currentPos.clone()];
    for (let i = 0; i < pathProgresses.length - 1; i++) {
      const gp = getGridPointForProgress(color, tokenIndex, pathProgresses[i]);
      const xz = gridToWorldXZ(gp);
      waypoints.push(new THREE.Vector3(xz.x, 0, xz.z));
    }

    const movingTokenFinal = finalTokensSnapshot.find((t) => t.id === tokenId);
    if (movingTokenFinal) {
      const finalPlacement = getTokenWorldPlacement(
        movingTokenFinal,
        finalTokensSnapshot,
      );
      waypoints.push(new THREE.Vector3(finalPlacement.x, 0, finalPlacement.z));
      vis.targetPos.set(finalPlacement.x, 0, finalPlacement.z);
      vis.targetScale = finalPlacement.scale;
    }

    const stepDuration = isDeploy
      ? speed === 'fast'
        ? 0.25
        : 0.4
      : speed === 'fast'
        ? 0.105
        : 0.175;
    this.hopAnim = {
      tokenId,
      color,
      tokenIndex,
      waypoints,
      finalScale: vis.targetScale,
      stepDuration,
      elapsed: 0,
      lastStepNotified: -1,
      isDeploy,
      onStep,
      onComplete,
    };
  }

  private spawnCutShockwave(x: number, z: number, hexColor: string): void {
    const geo = new THREE.RingGeometry(0.28, 0.48, 32);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: hexColor,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.045, z);
    this.scene.add(mesh);
    this.shockwaves.push({
      mesh,
      geometry: geo,
      material: mat,
      elapsed: 0,
      duration: 0.48,
    });
  }

  public animateCapturedTokens(
    capturedTokens: readonly TokenState[],
    finalTokensSnapshot: readonly TokenState[],
    speed: GameSpeed,
    attackerTokenId?: string,
  ): void {
    const duration = speed === 'fast' ? 0.38 : 0.6;
    if (attackerTokenId) {
      const attackerVis = this.tokenVisuals.get(attackerTokenId);
      if (attackerVis) {
        attackerVis.strikeTimer = 0.36;
      }
    }
    for (const cap of capturedTokens) {
      const vis = this.tokenVisuals.get(cap.id);
      if (!vis) continue;
      this.spawnCutShockwave(
        vis.currentPos.x,
        vis.currentPos.z,
        '#fef08a',
      );
      this.spawnBurst(
        vis.currentPos.x,
        0.55,
        vis.currentPos.z,
        COLOR_HEX[cap.color],
        28,
      );
      const destGp = getGridPointForProgress(cap.color, cap.index, -1);
      const destXZ = gridToWorldXZ(destGp);
      this.captureAnims.push({
        tokenId: cap.id,
        startPos: vis.currentPos.clone(),
        endPos: new THREE.Vector3(destXZ.x, 0, destXZ.z),
        elapsed: 0,
        duration,
      });
    }
    this.syncTokens(finalTokensSnapshot);
  }

  private bindEvents(): void {
    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.onPointerDown);
    dom.addEventListener('pointerup', this.onPointerUp);
    dom.addEventListener('webglcontextlost', this.onContextLost);
    dom.addEventListener('webglcontextrestored', this.onContextRestored);
  }

  private onContextLost = (e: Event): void => {
    e.preventDefault();
    this.contextLost = true;
  };

  private onContextRestored = (): void => {
    this.contextLost = false;
  };

  private onPointerDown = (e: PointerEvent): void => {
    this.pointerDownPos.x = e.clientX;
    this.pointerDownPos.y = e.clientY;
  };

  private onPointerUp = (e: PointerEvent): void => {
    const dist = Math.hypot(
      e.clientX - this.pointerDownPos.x,
      e.clientY - this.pointerDownPos.y,
    );
    // Ignore drag-orbit gestures
    if (dist > 12) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(this.clickables, false);
    if (intersects.length === 0) return;

    // Prefer selectable tokens if overlapping
    for (const hit of intersects) {
      const data = hit.object.userData;
      if (data.kind === 'token') {
        const vis = this.tokenVisuals.get(data.tokenId);
        if (vis?.isSelectable) {
          this.callbacks.onTokenClick(data.tokenId);
          return;
        }
      }
    }

    for (const hit of intersects) {
      if (hit.object.userData.kind === 'die') {
        this.callbacks.onDieClick();
        return;
      }
    }
  };

  private handleResize(): void {
    const w = Math.max(this.container.clientWidth, 320);
    const h = Math.max(this.container.clientHeight, 320);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.updateFixedCamera();
  }

  private startLoop(): void {
    const tick = () => {
      if (this.disposed) return;

      const now = performance.now();
      const rawDt = (now - this.lastTimeMs) / 1000;
      this.lastTimeMs = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
      this.totalTime += dt;

      if (!this.contextLost) {
        this.updateSimulation(dt);
        this.renderer.render(this.scene, this.camera);
      }

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    // Defer Frame 1 to next microtask/frame so caller's initial syncTokens & setGameStateView apply before Frame 1
    if (this.isSoftwareGl) {
      this.frameId = window.setTimeout(tick, 0);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private updateSimulation(dt: number): void {
    // 1. Active Turn Yard Beacon Pulse (Board & Camera remain 100% locked/fixed)
    this.yardBeacons.forEach((mesh, color) => {
      const active = !this.isTitleView && color === this.activeTurnColor;
      mesh.visible = active;
      if (active) {
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.55 + Math.sin(this.totalTime * 4.5) * 0.28;
      }
    });

    // 2. Center Dice Pad Glow & Die Animation
    const padMat = this.diePadRing.material as THREE.MeshStandardMaterial;
    padMat.color.lerp(this.dieAccentColor, 1 - Math.exp(-8 * dt));
    padMat.emissive.copy(padMat.color);
    padMat.emissiveIntensity = this.dieAwaitingRoll
      ? 0.55 + Math.sin(this.totalTime * 5) * 0.25
      : 0.2;

    if (this.diceAnim) {
      this.diceAnim.elapsed += dt;
      const t = Math.min(this.diceAnim.elapsed / this.diceAnim.duration, 1);

      // Parabolic primary leap + secondary bounce
      let height = 0;
      if (t < 0.72) {
        const p = t / 0.72;
        height = Math.sin(p * Math.PI) * 2.6;
      } else {
        const p = (t - 0.72) / 0.28;
        height = Math.sin(p * Math.PI) * 0.42;
      }

      this.dieMesh.position.y = 0.46 + height;
      const shadowScale = Math.max(0.45, 1 - height * 0.16);
      this.dieShadow.scale.setScalar(shadowScale);
      (this.dieShadow.material as THREE.MeshBasicMaterial).opacity =
        0.6 * shadowScale;

      if (t < 0.75) {
        const spinT = t / 0.75;
        _eulerA.set(
          this.diceAnim.spinEuler.x * spinT,
          this.diceAnim.spinEuler.y * spinT,
          this.diceAnim.spinEuler.z * spinT,
        );
        _quatA.setFromEuler(_eulerA);
        this.dieMesh.quaternion
          .copy(this.diceAnim.startQuat)
          .multiply(_quatA)
          .slerp(this.diceAnim.targetQuat, Math.pow(spinT, 2));
      } else {
        const settleT = (t - 0.75) / 0.25;
        this.dieMesh.quaternion.slerp(this.diceAnim.targetQuat, settleT);
      }

      if (t >= 1) {
        this.dieMesh.position.y = 0.46;
        this.dieMesh.quaternion.copy(this.diceAnim.targetQuat);
        this.dieShadow.scale.setScalar(1);
        const cb = this.diceAnim.onComplete;
        this.diceAnim = null;
        cb();
      }
    } else if (this.dieAwaitingRoll) {
      // Gentle inviting hover bob on the die only when ready to roll
      this.dieMesh.position.y = 0.51 + Math.sin(this.totalTime * 3.5) * 0.05;
    } else {
      this.dieMesh.position.y = THREE.MathUtils.damp(
        this.dieMesh.position.y,
        0.46,
        12,
        dt,
      );
    }

    // 3. Step-by-Step Hop & Opening Deploy Leap Animation
    if (this.hopAnim) {
      this.hopAnim.elapsed += dt;
      const totalSteps = this.hopAnim.waypoints.length - 1;
      const stepFloat = this.hopAnim.elapsed / this.hopAnim.stepDuration;
      const currentStep = Math.min(Math.floor(stepFloat), totalSteps - 1);
      const localT = Math.min(stepFloat - currentStep, 1);

      if (currentStep > this.hopAnim.lastStepNotified) {
        this.hopAnim.lastStepNotified = currentStep;
        this.hopAnim.onStep?.(currentStep);
      }

      const vis = this.tokenVisuals.get(this.hopAnim.tokenId);
      if (vis) {
        const from = this.hopAnim.waypoints[currentStep];
        const to = this.hopAnim.waypoints[currentStep + 1];
        vis.currentPos.lerpVectors(from, to, localT);
        const peakY = this.hopAnim.isDeploy ? 1.48 : 0.76;
        const arcY = Math.sin(localT * Math.PI) * peakY;
        vis.group.position.set(vis.currentPos.x, arcY, vis.currentPos.z);

        // Keep shadow pinned to ground
        vis.shadowMesh.position.y = 0.015 - arcY;
        const shScale = Math.max(0.45, 1 - arcY * 0.32);
        vis.shadowMesh.scale.setScalar(shScale);

        if (this.hopAnim.isDeploy) {
          vis.bodyGroup.rotation.y = localT * Math.PI * 2;
        }

        // Squash-and-stretch on hop/deploy
        const stretch =
          1 + Math.sin(localT * Math.PI) * (this.hopAnim.isDeploy ? 0.22 : 0.14);
        const sq = 1 / Math.sqrt(stretch);
        const s = vis.currentScale;
        vis.bodyGroup.scale.set(s * sq, s * stretch, s * sq);
      }

      if (stepFloat >= totalSteps) {
        const done = this.hopAnim;
        this.hopAnim = null;
        if (vis) {
          vis.currentPos.copy(done.waypoints[totalSteps]);
          vis.currentScale = done.finalScale;
          vis.group.position.set(vis.currentPos.x, 0, vis.currentPos.z);
          vis.shadowMesh.position.y = 0.015;
          vis.shadowMesh.scale.setScalar(1);
          vis.bodyGroup.rotation.set(0, 0, 0);
          vis.bodyGroup.scale.setScalar(vis.currentScale);
          if (done.isDeploy) {
            this.spawnBurst(
              vis.currentPos.x,
              0.35,
              vis.currentPos.z,
              COLOR_HEX[done.color],
              14,
            );
          }
        }
        done.onComplete();
      }
    }

    // 4. Captured Token Spin-Tumble Return Arcs
    for (let i = this.captureAnims.length - 1; i >= 0; i--) {
      const anim = this.captureAnims[i];
      anim.elapsed += dt;
      const t = Math.min(anim.elapsed / anim.duration, 1);
      const vis = this.tokenVisuals.get(anim.tokenId);
      if (vis) {
        vis.currentPos.lerpVectors(anim.startPos, anim.endPos, t);
        const arcY = Math.sin(t * Math.PI) * 2.75;
        vis.group.position.set(vis.currentPos.x, arcY, vis.currentPos.z);
        vis.shadowMesh.position.y = 0.015 - arcY;
        vis.shadowMesh.scale.setScalar(Math.max(0.4, 1 - arcY * 0.22));
        vis.bodyGroup.rotation.y = t * Math.PI * 6;
        vis.bodyGroup.rotation.z = Math.sin(t * Math.PI) * 0.45;
      }
      if (t >= 1) {
        if (vis) {
          vis.currentPos.copy(anim.endPos);
          vis.group.position.set(anim.endPos.x, 0, anim.endPos.z);
          vis.shadowMesh.position.y = 0.015;
          vis.shadowMesh.scale.setScalar(1);
          vis.bodyGroup.rotation.set(0, 0, 0);
        }
        this.captureAnims.splice(i, 1);
      }
    }

    // 4b. Expanding Cut Shockwave Rings
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.elapsed += dt;
      const t = Math.min(sw.elapsed / sw.duration, 1);
      const scale = 1 + t * 3.1;
      sw.mesh.scale.setScalar(scale);
      sw.material.opacity = (1 - t) * 0.92;
      if (t >= 1) {
        this.scene.remove(sw.mesh);
        sw.geometry.dispose();
        sw.material.dispose();
        this.shockwaves.splice(i, 1);
      }
    }

    // 5. Smooth resting token adjustments, attacker strike pulse & selection ring animation
    const capActiveIds = new Set(this.captureAnims.map((a) => a.tokenId));
    this.tokenVisuals.forEach((vis) => {
      if (!vis.group.visible) return;
      if (this.hopAnim?.tokenId === vis.id || capActiveIds.has(vis.id)) {
        return;
      }

      vis.currentPos.x = THREE.MathUtils.damp(
        vis.currentPos.x,
        vis.targetPos.x,
        10,
        dt,
      );
      vis.currentPos.z = THREE.MathUtils.damp(
        vis.currentPos.z,
        vis.targetPos.z,
        10,
        dt,
      );
      vis.currentScale = THREE.MathUtils.damp(
        vis.currentScale,
        vis.targetScale,
        10,
        dt,
      );

      let hoverY = 0;
      let selScale = 1;
      if (vis.strikeTimer > 0) {
        vis.strikeTimer = Math.max(0, vis.strikeTimer - dt);
        const punchT = vis.strikeTimer / 0.36;
        selScale = 1 + Math.sin(punchT * Math.PI) * 0.28;
      } else if (vis.isSelectable) {
        hoverY = 0.08 + Math.sin(this.totalTime * 5.2 + vis.index) * 0.04;
        selScale = 1.12;
        vis.ringMesh.position.y = 0.025 - hoverY;
        const pulse = 1.05 + Math.sin(this.totalTime * 5.5) * 0.14;
        vis.ringMesh.scale.setScalar(pulse);
      }
      vis.shadowMesh.position.y = 0.015 - hoverY;
      vis.group.position.set(vis.currentPos.x, hoverY, vis.currentPos.z);
      vis.bodyGroup.scale.setScalar(vis.currentScale * selScale);
    });

    // 6. Pooled Particle Burst Update
    let anyParticleActive = false;
    for (let i = 0; i < this.particles.length; i++) {
      const slot = this.particles[i];
      if (!slot.active) continue;
      anyParticleActive = true;
      slot.life += dt;
      if (slot.life >= slot.maxLife) {
        slot.active = false;
        _mat4.makeScale(0, 0, 0);
        this.particleMesh.setMatrixAt(i, _mat4);
        continue;
      }
      slot.vel.y -= 11.5 * dt;
      slot.pos.addScaledVector(slot.vel, dt);
      if (slot.pos.y < 0.08) {
        slot.pos.y = 0.08;
        slot.vel.y *= -0.35;
      }
      slot.rot += slot.rotSpeed * dt;
      const lifeRatio = 1 - slot.life / slot.maxLife;
      const s = 0.55 + lifeRatio * 0.7;
      _eulerA.set(slot.rot, slot.rot * 0.7, 0);
      _quatA.setFromEuler(_eulerA);
      _scaleVec.setScalar(s * lifeRatio);
      _mat4.compose(slot.pos, _quatA, _scaleVec);
      this.particleMesh.setMatrixAt(i, _mat4);
    }
    if (anyParticleActive) {
      this.particleMesh.instanceMatrix.needsUpdate = true;
    }
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.resizeObserver.disconnect();
    const dom = this.renderer.domElement;
    dom.removeEventListener('pointerdown', this.onPointerDown);
    dom.removeEventListener('pointerup', this.onPointerUp);
    dom.removeEventListener('webglcontextlost', this.onContextLost);
    dom.removeEventListener('webglcontextrestored', this.onContextRestored);

    this.shockwaves.forEach((sw) => {
      this.scene.remove(sw.mesh);
      sw.geometry.dispose();
      sw.material.dispose();
    });
    this.shockwaves = [];

    this.textures.albedo.dispose();
    this.textures.bump.dispose();
    this.textures.roughness.dispose();
    this.textures.contactShadow.dispose();
    this.textures.tableMat.dispose();
    this.textures.diceFaces.forEach((t) => t.dispose());

    this.geometriesToDispose.forEach((g) => g.dispose());
    this.materialsToDispose.forEach((m) => m.dispose());

    this.renderer.dispose();
    if (dom.parentNode === this.container) {
      this.container.removeChild(dom);
    }
  }
}

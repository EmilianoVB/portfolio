import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { SVGRenderer } from './vendor/SVGRenderer.js';

let canvas = document.getElementById('cad-canvas');
const stage = document.getElementById('cad-stage');
const status = document.getElementById('cad-status');
const reset = document.getElementById('cad-reset');
const shellButton = document.getElementById('cad-shell');
let softwareRenderer = false;
let renderer, scene, camera, controls, model;
let shellMaterials = [];
const center = new THREE.Vector3();
let homeDistance = 3;
let modelRadius = 1;

function render() { renderer?.render(scene, camera); }
function resize() {
  if (!renderer) return;
  const {width, height} = stage.getBoundingClientRect();
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  if (model) resetView();
  render();
}
function resetView() {
  const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
  const limitingHalfFov = Math.atan(Math.tan(halfFov) * Math.min(1, camera.aspect));
  homeDistance = modelRadius / Math.sin(limitingHalfFov) * 1.15;
  controls.maxDistance = homeDistance * 4;
  controls.target.copy(center);
  camera.position.copy(center).add(new THREE.Vector3(1.1, .65, 1.3).normalize().multiplyScalar(homeDistance));
  camera.up.set(0, 1, 0);
  controls.update();
  render();
}
function init() {
  if (renderer) return;
  try {
    renderer = new THREE.WebGLRenderer({canvas, antialias: true, alpha: false});
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  } catch {
    renderer = new SVGRenderer();
    softwareRenderer = true;
    const svg = renderer.domElement;
    for (const attr of [...canvas.attributes]) svg.setAttribute(attr.name, attr.value);
    canvas.replaceWith(svg);
    canvas = svg;
    canvas.addEventListener('keydown', handleKeyboard);
  }
  renderer.setClearColor('#e8e9e5');
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x627582, 2.5));
  if (softwareRenderer) scene.add(new THREE.AmbientLight(new THREE.Color(.22, .22, .22), 1));
  for (const [position, intensity] of [[[3, 5, 4], softwareRenderer ? .65 : 3], [[-3, 1, -2], softwareRenderer ? .3 : 2]]) {
    const light = new THREE.DirectionalLight(0xffffff, intensity);
    light.position.set(...position);
    scene.add(light);
  }
  camera = new THREE.PerspectiveCamera(35, 1, .001, 1000);
  controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.enableDamping = false;
  controls.addEventListener('change', render);
  new ResizeObserver(resize).observe(stage);
}
function releaseModel() {
  if (!model) return;
  scene.remove(model);
  const geometries = new Set(), materials = new Set();
  model.traverse(item => {
    if (item.geometry) geometries.add(item.geometry);
    if (item.material) for (const material of [item.material].flat()) materials.add(material);
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
}
async function loadModel(buffer) {
  status.textContent = 'Loading CAD model…';
  try {
    init();
    const gltf = await new GLTFLoader().parseAsync(buffer, '');
    const bounds = new THREE.Box3().setFromObject(gltf.scene);
    if (bounds.isEmpty()) throw new Error('No geometry');
    releaseModel();
    model = gltf.scene;
    scene.add(model);
    const size = bounds.getSize(new THREE.Vector3());
    bounds.getCenter(center);
    const radius = Math.max(size.x, size.y, size.z) / 2;
    modelRadius = radius;
    homeDistance = radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.15;
    camera.near = radius / 1000;
    camera.far = homeDistance * 30;
    camera.updateProjectionMatrix();
    controls.minDistance = radius * 1.1;
    controls.maxDistance = homeDistance * 4;
    shellMaterials = [];
    model.traverse(item => {
      if (!item.isMesh) return;
      const namedShell = /shell|outer.?sphere|hemisphere/i.test(item.name);
      const materials = [item.material].flat();
      item.material = materials.map(material => material.clone());
      if (item.material.length === 1) item.material = item.material[0];
      for (const material of [item.material].flat()) {
        if (namedShell || /shell|outer.?sphere|hemisphere/i.test(material.name)) {
          shellMaterials.push({mesh: item, upper: /upper/i.test(item.name), material, opacity: material.opacity, transparent: material.transparent, depthWrite: material.depthWrite});
        }
      }
    });
    document.getElementById('cad-fallback').hidden = true;
    canvas.removeAttribute('hidden');
    reset.disabled = false;
    shellButton.disabled = shellMaterials.length === 0;
    shellButton.value = 'cutaway';
    applyShell();
    status.textContent = '';
    resize();
    resetView();
  } catch (error) {
    status.textContent = 'Could not open the model. Please use a self-contained GLB export.';
    console.error('CAD viewer:', error);
  }
}
reset.addEventListener('click', resetView);
function applyShell() {
  const mode = shellButton.value;
  for (const {mesh, upper, material, opacity, depthWrite} of shellMaterials) {
    mesh.visible = mode !== 'hidden' && !(mode === 'cutaway' && upper);
    material.transparent = mode !== 'solid';
    material.opacity = mode === 'solid' ? opacity : mode === 'cutaway' ? .22 : .15;
    material.depthWrite = mode === 'solid' ? depthWrite : false;
    material.needsUpdate = true;
  }
  render();
}
shellButton.addEventListener('change', applyShell);
function handleKeyboard(event) {
  if (!model) return;
  const delta = camera.position.clone().sub(controls.target);
  const spherical = new THREE.Spherical().setFromVector3(delta);
  if (event.key === 'Home') resetView();
  else if (event.key === 'ArrowLeft') spherical.theta -= .12;
  else if (event.key === 'ArrowRight') spherical.theta += .12;
  else if (event.key === 'ArrowUp') spherical.phi -= .12;
  else if (event.key === 'ArrowDown') spherical.phi += .12;
  else if (event.key === '+' || event.key === '=') spherical.radius *= .9;
  else if (event.key === '-') spherical.radius *= 1.1;
  else return;
  event.preventDefault();
  if (event.key !== 'Home') {
    spherical.makeSafe();
    spherical.radius = THREE.MathUtils.clamp(spherical.radius, controls.minDistance, controls.maxDistance);
    camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));
    controls.update();
    render();
  }
}
canvas.addEventListener('keydown', handleKeyboard);
if (canvas.dataset.model) {
  try {
    init();
    const source = softwareRenderer ? canvas.dataset.modelLite : canvas.dataset.model;
    fetch(source).then(response => {
      if (!response.ok) throw new Error('Model unavailable');
      return response.arrayBuffer();
    }).then(loadModel).catch(() => { status.textContent = 'The CAD model could not be loaded. Reload to try again.'; });
  } catch {
    status.textContent = 'This browser could not initialize the 3D viewer.';
  }
}

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { useStore, activeFloor, ROOM_TYPES, GRID, WALL_H } from '../store/useStore';

const SCALE = 1 / GRID;   // pixels → meters
const WT = 0.13;           // wall thickness (meters)

export default function View3D() {
  const mountRef = useRef(null);
  const rooms = useStore(s => activeFloor(s)?.rooms ?? []);
  const doors = useStore(s => activeFloor(s)?.doors ?? []);
  const wins  = useStore(s => activeFloor(s)?.wins  ?? []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const W = mount.clientWidth  || 900;
    const H = mount.clientHeight || 700;

    /* ─── Scene ────────────────────────────────────────── */
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xEFF3F8);
    scene.fog = new THREE.FogExp2(0xEFF3F8, 0.018);

    /* ─── Camera ───────────────────────────────────────── */
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 200);
    camera.position.set(14, 18, 18);

    /* ─── Renderer ─────────────────────────────────────── */
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    mount.appendChild(renderer.domElement);

    /* ─── Controls ─────────────────────────────────────── */
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 60;

    /* ─── Lighting ─────────────────────────────────────── */
    scene.add(new THREE.AmbientLight(0xCCDDFF, 0.8));

    const sun = new THREE.DirectionalLight(0xFFF5E0, 1.4);
    sun.position.set(12, 24, 16);
    sun.castShadow = true;
    sun.shadow.mapSize.width  = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.left   = -30;
    sun.shadow.camera.right  =  30;
    sun.shadow.camera.top    =  30;
    sun.shadow.camera.bottom = -30;
    sun.shadow.camera.far    = 80;
    sun.shadow.bias = -0.001;
    scene.add(sun);

    const fillLight = new THREE.DirectionalLight(0xBDD9F5, 0.5);
    fillLight.position.set(-8, 10, -12);
    scene.add(fillLight);

    /* ─── Ground ───────────────────────────────────────── */
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.MeshLambertMaterial({ color: 0xD5DCE5 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    scene.add(ground);

    /* ─── Grid helper on ground ────────────────────────── */
    const grid = new THREE.GridHelper(80, 80, 0xBBC8D4, 0xCDD5DE);
    grid.position.y = -0.03;
    scene.add(grid);

    /* ─── Compute scene center from rooms ──────────────── */
    let cx = 0, cz = 0;
    if (rooms.length > 0) {
      const xs = rooms.flatMap(r => [r.x, r.x + r.width]);
      const ys = rooms.flatMap(r => [r.y, r.y + r.height]);
      cx = ((Math.min(...xs) + Math.max(...xs)) / 2) * SCALE;
      cz = ((Math.min(...ys) + Math.max(...ys)) / 2) * SCALE;
    }
    controls.target.set(cx, 1, cz);
    camera.position.set(cx + 14, 18, cz + 18);
    camera.lookAt(cx, 1, cz);

    const to3 = (px, py) => ({
      x: px * SCALE,
      z: py * SCALE,
    });

    /* ─── Build room meshes ────────────────────────────── */
    const wallMat = new THREE.MeshPhongMaterial({ color: 0xFAFBFF, shininess: 12 });
    const ceilMat = new THREE.MeshPhongMaterial({ color: 0xF5F7FA, shininess: 5 });

    rooms.forEach(room => {
      const rt = ROOM_TYPES.find(t => t.id === room.type) || ROOM_TYPES[8];
      const rw = room.width  * SCALE;
      const rd = room.height * SCALE;
      const c  = to3(room.x + room.width / 2, room.y + room.height / 2);

      /* Floor */
      const floor = new THREE.Mesh(
        new THREE.BoxGeometry(rw - WT * 2, 0.07, rd - WT * 2),
        new THREE.MeshPhongMaterial({ color: rt.c3d, shininess: 8 })
      );
      floor.position.set(c.x, 0.035, c.z);
      floor.receiveShadow = true;
      scene.add(floor);

      /* Ceiling (semi-transparent) */
      const ceil = new THREE.Mesh(
        new THREE.BoxGeometry(rw, 0.05, rd),
        new THREE.MeshPhongMaterial({ color: 0xF0F4F8, transparent:true, opacity:0.55, shininess:5 })
      );
      ceil.position.set(c.x, WALL_H, c.z);
      scene.add(ceil);

      /* Helper: add wall */
      const addWall = (wx, wy, wz, ww, wh, wd) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(ww, wh, wd), wallMat);
        m.position.set(wx, wy, wz);
        m.castShadow = true; m.receiveShadow = true;
        scene.add(m);
      };

      const hH = WALL_H / 2;
      // North
      addWall(c.x, hH, c.z - rd/2 + WT/2,   rw,          WALL_H, WT);
      // South
      addWall(c.x, hH, c.z + rd/2 - WT/2,   rw,          WALL_H, WT);
      // West
      addWall(c.x - rw/2 + WT/2, hH, c.z,   WT, WALL_H, rd - WT*2);
      // East
      addWall(c.x + rw/2 - WT/2, hH, c.z,   WT, WALL_H, rd - WT*2);
    });

    /* ─── Animation loop ───────────────────────────────── */
    let raf;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      controls.update();
      renderer.render(scene, camera);
    };
    tick();

    /* ─── Resize handler ───────────────────────────────── */
    const onResize = () => {
      const nW = mount.clientWidth, nH = mount.clientHeight;
      camera.aspect = nW / nH;
      camera.updateProjectionMatrix();
      renderer.setSize(nW, nH);
    };
    window.addEventListener('resize', onResize);

    /* ─── Cleanup ──────────────────────────────────────── */
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      scene.traverse(o => {
        if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); }
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [rooms, doors, wins]);

  return (
    <div ref={mountRef} style={{ width:'100%', height:'100%', position:'relative' }}>
      {/* 3D Hint overlay */}
      <div style={{
        position:'absolute', bottom:16, left:'50%', transform:'translateX(-50%)',
        background:'rgba(15,25,40,0.75)', backdropFilter:'blur(8px)',
        color:'rgba(255,255,255,0.7)', fontSize:12, padding:'6px 14px',
        borderRadius:20, pointerEvents:'none', fontFamily:'inherit',
        border:'1px solid rgba(255,255,255,0.1)',
      }}>
        Scroll untuk zoom · Drag untuk rotasi · Shift+Drag untuk geser
      </div>
    </div>
  );
}

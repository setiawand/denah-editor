import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { useStore, activeFloor, ROOM_TYPES, GRID, WALL_H, DOOR_W, WIN_W, STAIR_W } from '../store/useStore';

const SCALE = 1 / GRID;  // pixels → meters
const WT    = 0.13;       // wall thickness (meters)

// Rotation (0/90/180/270) → {dx, dz} offset direction perpendicular to wall
const rotToDir = rot => {
  if (rot === 0)   return { dx: 0,  dz: -1 }; // north wall
  if (rot === 90)  return { dx: 1,  dz:  0 }; // east wall
  if (rot === 180) return { dx: 0,  dz:  1 }; // south wall
  /* 270 */        return { dx: -1, dz:  0 }; // west wall
};

export default function View3D() {
  const mountRef = useRef(null);
  const rooms  = useStore(s => activeFloor(s)?.rooms  ?? []);
  const doors  = useStore(s => activeFloor(s)?.doors  ?? []);
  const wins   = useStore(s => activeFloor(s)?.wins   ?? []);
  const stairs = useStore(s => activeFloor(s)?.stairs ?? []);

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

    const grid = new THREE.GridHelper(80, 80, 0xBBC8D4, 0xCDD5DE);
    grid.position.y = -0.03;
    scene.add(grid);

    /* ─── Scene center ─────────────────────────────────── */
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

    /* ─── Helpers ──────────────────────────────────────── */
    const addMesh = (geo, mat, x, y, z, rotY = 0) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      if (rotY) m.rotation.y = rotY;
      m.castShadow = true;
      m.receiveShadow = true;
      scene.add(m);
      return m;
    };

    const wallMat = new THREE.MeshPhongMaterial({ color: 0xFAFBFF, shininess: 12 });

    /* ─── Rooms ────────────────────────────────────────── */
    rooms.forEach(room => {
      const rt = ROOM_TYPES.find(t => t.id === room.type) || ROOM_TYPES[8];
      const rw = room.width  * SCALE;
      const rd = room.height * SCALE;
      const cx = (room.x + room.width  / 2) * SCALE;
      const cz = (room.y + room.height / 2) * SCALE;
      const hH = WALL_H / 2;

      // Floor
      addMesh(
        new THREE.BoxGeometry(rw - WT * 2, 0.07, rd - WT * 2),
        new THREE.MeshPhongMaterial({ color: rt.c3d, shininess: 8 }),
        cx, 0.035, cz
      );
      // Ceiling
      addMesh(
        new THREE.BoxGeometry(rw, 0.05, rd),
        new THREE.MeshPhongMaterial({ color: 0xF0F4F8, transparent: true, opacity: 0.55, shininess: 5 }),
        cx, WALL_H, cz
      );
      // Walls
      addMesh(new THREE.BoxGeometry(rw, WALL_H, WT), wallMat, cx, hH, cz - rd/2 + WT/2);   // N
      addMesh(new THREE.BoxGeometry(rw, WALL_H, WT), wallMat, cx, hH, cz + rd/2 - WT/2);   // S
      addMesh(new THREE.BoxGeometry(WT, WALL_H, rd - WT*2), wallMat, cx - rw/2 + WT/2, hH, cz); // W
      addMesh(new THREE.BoxGeometry(WT, WALL_H, rd - WT*2), wallMat, cx + rw/2 - WT/2, hH, cz); // E
    });

    /* ─── Doors ────────────────────────────────────────── */
    const doorMat   = new THREE.MeshPhongMaterial({ color: 0x8B5E3C, shininess: 30 });
    const frameMat  = new THREE.MeshPhongMaterial({ color: 0x5C3D1E, shininess: 20 });
    const DW = DOOR_W * SCALE;
    const DH = WALL_H * 0.85;  // door height
    const FT = 0.04;            // frame thickness

    doors.forEach(door => {
      const x = door.x * SCALE;
      const z = door.y * SCALE;
      const dir = rotToDir(door.rotation);
      const isNS = dir.dz !== 0; // north/south wall → door width along X axis

      // Door panel
      const panelW = isNS ? DW : WT + 0.02;
      const panelD = isNS ? WT + 0.02 : DW;
      addMesh(new THREE.BoxGeometry(panelW, DH, panelD), doorMat, x + DW/2 * (isNS ? 1 : 0), DH/2, z + DW/2 * (isNS ? 0 : 1));

      // Frame: top bar
      const fW = isNS ? DW + FT*2 : FT;
      const fD = isNS ? FT : DW + FT*2;
      addMesh(new THREE.BoxGeometry(fW, FT, fD), frameMat, x + DW/2 * (isNS ? 1 : 0), DH + FT/2, z + DW/2 * (isNS ? 0 : 1));
    });

    /* ─── Windows ──────────────────────────────────────── */
    const winGlassMat = new THREE.MeshPhongMaterial({
      color: 0xBAE6FD, transparent: true, opacity: 0.45, shininess: 90,
    });
    const winFrameMat = new THREE.MeshPhongMaterial({ color: 0xCBD5E1, shininess: 20 });
    const WW = WIN_W * SCALE;
    const WH = 0.8;   // window height
    const WY = 0.9;   // window sill height

    wins.forEach(win => {
      const x = win.x * SCALE;
      const z = win.y * SCALE;
      const isNS = win.rotation === 0 || win.rotation === 180;

      const gW = isNS ? WW : WT + 0.02;
      const gD = isNS ? WT + 0.02 : WW;

      // Glass pane
      addMesh(new THREE.BoxGeometry(gW, WH, gD), winGlassMat,
        x + WW/2 * (isNS ? 1 : 0), WY + WH/2, z + WW/2 * (isNS ? 0 : 1));

      // Frame (top + bottom bars)
      const fW = isNS ? WW : FT;
      const fD = isNS ? FT : WW;
      addMesh(new THREE.BoxGeometry(fW, FT, fD), winFrameMat,
        x + WW/2 * (isNS ? 1 : 0), WY + WH + FT/2, z + WW/2 * (isNS ? 0 : 1));
      addMesh(new THREE.BoxGeometry(fW, FT, fD), winFrameMat,
        x + WW/2 * (isNS ? 1 : 0), WY - FT/2, z + WW/2 * (isNS ? 0 : 1));
    });

    /* ─── Stairs ───────────────────────────────────────── */
    const stairMat = new THREE.MeshPhongMaterial({ color: 0xCBD5E1, shininess: 10 });
    const STEPS = 6;
    const SW = STAIR_W * SCALE;
    const stepW = SW;
    const stepD = SW / STEPS;
    const stepH = WALL_H / STEPS;

    stairs.forEach(stair => {
      const sx = stair.x * SCALE;
      const sz = stair.y * SCALE;
      const rotY = (stair.rotation * Math.PI) / 180;
      const goingUp = stair.direction === 'up';

      const group = new THREE.Group();
      group.position.set(sx, 0, sz);
      group.rotation.y = rotY;

      for (let i = 0; i < STEPS; i++) {
        const step = i + 1;
        const geo = new THREE.BoxGeometry(stepW, stepH * step, stepD);
        const mesh = new THREE.Mesh(geo, stairMat);
        // Steps go along Z (depth), ascending in Y
        const zOff = goingUp
          ? stepD * i + stepD / 2          // near→far going up
          : SW - stepD * i - stepD / 2;    // near→far going down
        mesh.position.set(stepW / 2, (stepH * step) / 2, zOff);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
      }
      scene.add(group);
    });

    /* ─── Animate ──────────────────────────────────────── */
    let raf;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      controls.update();
      renderer.render(scene, camera);
    };
    tick();

    /* ─── Resize ───────────────────────────────────────── */
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
  }, [rooms, doors, wins, stairs]);

  return (
    <div ref={mountRef} style={{ width:'100%', height:'100%', position:'relative' }}>
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

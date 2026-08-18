"use client";

/*
  Hero3D — "The Vault".

  A frosted-glass cube (the lock) holding the molten Vezo mark (the value),
  which glows through the walls. Hovering lifts the lid and lets the light
  out: the exit exists. A small live chip anchors the scene to reality with
  the best discount currently on the marketplace.

  Idle sway + inertia-damped pointer parallax; honors prefers-reduced-motion
  (a static, slightly-open pose); pauses offscreen; disposes on unmount.
*/

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

// Silhouette of the mark in logo space (y-down), converted to y-up centered.
const LEFT: [number, number][] = [
  [8, 4], [36, 4], [44, 38], [60.4, 38], [69.2, 88], [24, 88],
];
const RIGHT: [number, number][] = [
  [132, 4], [104, 4], [96, 38], [79.6, 38], [70.8, 88], [116, 88],
];

function toShape(points: [number, number][]): THREE.Shape {
  const shape = new THREE.Shape();
  points.forEach(([x, y], i) => {
    const px = x - 70;
    const py = 46 - y;
    if (i === 0) shape.moveTo(px, py);
    else shape.lineTo(px, py);
  });
  shape.closePath();
  return shape;
}

export default function Hero3D() {
  const hostRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    host.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 1, 1200);
    camera.position.set(0, 46, 340);
    camera.lookAt(0, -2, 0);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;

    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(70, 110, 130);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffe8ee, 0.35);
    fill.position.set(-90, -20, -80);
    scene.add(fill);

    const vault = new THREE.Group();
    scene.add(vault);

    // ── The molten core: the V mark, glowing ──
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x30000c,
      emissive: 0xff0040,
      emissiveIntensity: 1.5,
      roughness: 0.55,
      envMapIntensity: 0.25,
    });
    const extrude: THREE.ExtrudeGeometryOptions = {
      depth: 16,
      bevelEnabled: true,
      bevelThickness: 2,
      bevelSize: 1.6,
      bevelSegments: 3,
      curveSegments: 4,
    };
    const core = new THREE.Group();
    for (const pts of [LEFT, RIGHT]) {
      const geo = new THREE.ExtrudeGeometry(toShape(pts), extrude);
      geo.translate(0, 0, -extrude.depth! / 2);
      core.add(new THREE.Mesh(geo, coreMat));
    }
    core.scale.setScalar(0.6);
    core.position.y = -12;
    vault.add(core);

    // Light escaping the core, brightens when the vault opens.
    const glow = new THREE.PointLight(0xff0040, 1200, 500, 2);
    glow.position.set(0, -6, 0);
    vault.add(glow);

    // ── The vault: frosted glass body + lid ──
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xf2e4e8,
      metalness: 0,
      roughness: 0.34,
      transmission: 1,
      thickness: 26,
      ior: 1.45,
      clearcoat: 0.85,
      clearcoatRoughness: 0.2,
      attenuationColor: new THREE.Color(0xffc9d6),
      attenuationDistance: 200,
    });
    const body = new THREE.Mesh(new RoundedBoxGeometry(124, 96, 124, 4, 7), glassMat);
    body.position.y = -16;
    vault.add(body);
    const lid = new THREE.Mesh(new RoundedBoxGeometry(124, 26, 124, 4, 7), glassMat);
    const LID_Y = 52;
    lid.position.y = LID_Y;
    vault.add(lid);

    // ── Interaction state ──
    let openTarget = 0;
    let open = 0;
    const onEnter = () => (openTarget = 1);
    const onLeave = () => (openTarget = 0);
    const onClick = () => (openTarget = openTarget > 0.5 ? 0 : 1);
    host.addEventListener("pointerenter", onEnter);
    host.addEventListener("pointerleave", onLeave);
    host.addEventListener("click", onClick);

    let targetX = 0;
    let targetY = 0;
    const onPointer = (e: PointerEvent) => {
      targetX = (e.clientX / window.innerWidth) * 2 - 1;
      targetY = (e.clientY / window.innerHeight) * 2 - 1;
    };
    if (!reduceMotion) window.addEventListener("pointermove", onPointer, { passive: true });

    let raf = 0;
    let running = false;
    let last = performance.now();
    let px = 0;
    let py = 0;

    const pose = (t: number, dt: number) => {
      px += (targetX - px) * Math.min(1, dt * 3.5);
      py += (targetY - py) * Math.min(1, dt * 3.5);
      open += (openTarget - open) * Math.min(1, dt * 3);

      vault.rotation.y = Math.sin(t * 0.3) * 0.34 + px * 0.28;
      vault.rotation.x = Math.sin(t * 0.2) * 0.04 - py * 0.12;
      vault.position.y = Math.sin((t * Math.PI * 2) / 7) * 3;

      // The lid lifts and tips; the core burns brighter; light gets out.
      lid.position.y = LID_Y + open * 34;
      lid.rotation.z = -open * 0.12;
      lid.rotation.x = open * 0.05;
      core.rotation.y = t * 0.45;
      coreMat.emissiveIntensity = 1.5 + open * 1.1 + Math.sin(t * 2.1) * 0.12;
      glow.intensity = 1200 + open * 2600;
    };

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      pose(now / 1000, dt);
      renderer.render(scene, camera);
      if (running) raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (running || reduceMotion) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    let io: IntersectionObserver | null = null;
    const onVisibility = () =>
      document.visibilityState === "visible" ? start() : stop();

    if (reduceMotion) {
      // Static, slightly-open pose: the story in one frame.
      open = 0.4;
      openTarget = 0.4;
      vault.rotation.y = -0.3;
      pose(1, 0);
      renderer.render(scene, camera);
    } else {
      io = new IntersectionObserver(
        ([entry]) => (entry.isIntersecting ? start() : stop()),
        { threshold: 0.05 }
      );
      io.observe(host);
      document.addEventListener("visibilitychange", onVisibility);
    }

    return () => {
      stop();
      io?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointer);
      host.removeEventListener("pointerenter", onEnter);
      host.removeEventListener("pointerleave", onLeave);
      host.removeEventListener("click", onClick);
      ro.disconnect();
      core.children.forEach((m) => (m as THREE.Mesh).geometry.dispose());
      body.geometry.dispose();
      lid.geometry.dispose();
      coreMat.dispose();
      glassMat.dispose();
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
      host.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="relative w-full" style={{ height: 540 }} aria-hidden="true">
      <div ref={hostRef} className="absolute inset-0 cursor-pointer" aria-hidden="true" />
      {/* Contact shadow — breathes on the same 7s period as the float */}
      <div
        className="hero3d-shadow absolute left-1/2 -translate-x-1/2 pointer-events-none"
        aria-hidden="true"
        style={{
          bottom: 34,
          width: "56%",
          height: 38,
          borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(0,0,0,0.24) 0%, transparent 68%)",
          filter: "blur(11px)",
        }}
      />
    </div>
  );
}

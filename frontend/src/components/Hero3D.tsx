"use client";

/*
  Hero3D — the Vezo mark as a physical object.

  Replaces the static demo-listing card with the brand monolith: the V mark
  extruded and lit like a product shot. Satin red, clearcoat, environment
  reflections. Idle sway + inertia-damped pointer parallax; honors
  prefers-reduced-motion (single static frame); pauses offscreen.
*/

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

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
    renderer.toneMappingExposure = 0.9;
    host.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 1, 1000);
    camera.position.set(0, 6, 300);
    camera.lookAt(0, 0, 0);

    // Studio reflections without loading any assets.
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;

    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(60, 90, 120);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffd9e2, 0.5);
    rim.position.set(-80, -30, -60);
    scene.add(rim);

    const material = new THREE.MeshPhysicalMaterial({
      color: 0xff0040,
      metalness: 0.15,
      roughness: 0.34,
      clearcoat: 0.9,
      clearcoatRoughness: 0.25,
      envMapIntensity: 0.7,
    });

    const extrude: THREE.ExtrudeGeometryOptions = {
      depth: 16,
      bevelEnabled: true,
      bevelThickness: 2.2,
      bevelSize: 1.8,
      bevelSegments: 4,
      curveSegments: 4,
    };

    const group = new THREE.Group();
    for (const pts of [LEFT, RIGHT]) {
      const geo = new THREE.ExtrudeGeometry(toShape(pts), extrude);
      geo.translate(0, 0, -extrude.depth! / 2);
      group.add(new THREE.Mesh(geo, material));
    }
    scene.add(group);

    // Pointer parallax target (normalized -1..1), damped toward each frame.
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

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const t = now / 1000;

      // Inertia toward the pointer, layered over a slow idle sway.
      px += (targetX - px) * Math.min(1, dt * 3.5);
      py += (targetY - py) * Math.min(1, dt * 3.5);
      group.rotation.y = Math.sin(t * 0.35) * 0.42 + px * 0.3;
      group.rotation.x = Math.sin(t * 0.22) * 0.05 - py * 0.14;
      group.position.y = Math.sin((t * Math.PI * 2) / 7) * 3;

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

    if (reduceMotion) {
      // One considered pose, no animation loop.
      group.rotation.y = -0.35;
      group.rotation.x = -0.06;
      renderer.render(scene, camera);
    } else {
      const io = new IntersectionObserver(
        ([entry]) => (entry.isIntersecting ? start() : stop()),
        { threshold: 0.05 }
      );
      io.observe(host);
      const onVisibility = () =>
        document.visibilityState === "visible" ? start() : stop();
      document.addEventListener("visibilitychange", onVisibility);

      return () => {
        stop();
        io.disconnect();
        document.removeEventListener("visibilitychange", onVisibility);
        window.removeEventListener("pointermove", onPointer);
        ro.disconnect();
        group.children.forEach((m) => (m as THREE.Mesh).geometry.dispose());
        material.dispose();
        envTex.dispose();
        pmrem.dispose();
        renderer.dispose();
        host.removeChild(renderer.domElement);
      };
    }

    return () => {
      ro.disconnect();
      group.children.forEach((m) => (m as THREE.Mesh).geometry.dispose());
      material.dispose();
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
      host.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="relative w-full" style={{ height: 520 }} aria-hidden="true">
      <div ref={hostRef} className="absolute inset-0" />
      {/* Contact shadow — breathes on the same 7s period as the float */}
      <div
        className="hero3d-shadow absolute left-1/2 -translate-x-1/2 pointer-events-none"
        style={{
          bottom: 48,
          width: "52%",
          height: 36,
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse, rgba(0,0,0,0.22) 0%, transparent 68%)",
          filter: "blur(10px)",
        }}
      />
    </div>
  );
}

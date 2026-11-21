"use client";

import { useEffect, useRef } from "react";

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl2") || canvas.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/** Resolves after the load event plus an idle slot, so three.js never competes with LCP. */
function afterLoadIdle(): Promise<void> {
  return new Promise((resolve) => {
    const idle = () => {
      const ric = (window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number })
        .requestIdleCallback;
      if (ric) ric(() => resolve(), { timeout: 3000 });
      else window.setTimeout(resolve, 1500);
    };
    if (document.readyState === "complete") window.setTimeout(idle, 600);
    else window.addEventListener("load", () => window.setTimeout(idle, 600), { once: true });
  });
}

/**
 * BUG-1300: the 3D scene is an enhancement. Phones, Save-Data, low-memory devices and
 * reduced-motion users keep the static CSS hero (orbs + gradient) and never download three.
 */
function wantsWebgl(): boolean {
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  if (nav.connection?.saveData) return false;
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory < 4) return false;
  if (window.innerWidth < 768) return false;
  return true;
}

/**
 * Client-only three.js particle field used behind the hero.
 * three is loaded lazily inside the effect so it never runs during SSR,
 * and every GPU resource is disposed on unmount.
 */
export function ParticleField() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let cleanup = () => {};

    // BUG-1105: probe WebGL first. three.js logs console.error when it cannot get a context,
    // so without WebGL we keep the CSS background and never construct the renderer.
    if (!wantsWebgl() || !webglAvailable()) return;

    void afterLoadIdle()
      .then(() => (disposed ? null : import("three")))
      .then((THREE) => {
      if (disposed || !THREE) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const small = window.innerWidth < 768;

      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "low-power" });
      } catch {
        return; // WebGL unavailable: the CSS background still looks complete.
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.setClearColor(0x000000, 0);
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
      camera.position.z = 14;

      const sprite = document.createElement("canvas");
      sprite.width = 64;
      sprite.height = 64;
      const ctx = sprite.getContext("2d");
      if (ctx) {
        const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        g.addColorStop(0, "rgba(255,255,255,1)");
        g.addColorStop(0.35, "rgba(255,255,255,0.55)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 64, 64);
      }
      const texture = new THREE.CanvasTexture(sprite);

      const palette = [new THREE.Color("#7C5CFF"), new THREE.Color("#22D3EE"), new THREE.Color("#E8C873")];
      const makeLayer = (count: number, depth: [number, number], size: number) => {
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        for (let i = 0; i < count; i += 1) {
          positions[i * 3] = (Math.random() - 0.5) * 38;
          positions[i * 3 + 1] = (Math.random() - 0.5) * 22;
          positions[i * 3 + 2] = depth[0] + Math.random() * (depth[1] - depth[0]);
          const roll = Math.random();
          const color = roll < 0.14 ? palette[2] : palette[0].clone().lerp(palette[1], Math.random());
          colors[i * 3] = color.r;
          colors[i * 3 + 1] = color.g;
          colors[i * 3 + 2] = color.b;
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        const material = new THREE.PointsMaterial({
          size,
          map: texture,
          vertexColors: true,
          transparent: true,
          opacity: 0.9,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          sizeAttenuation: true,
        });
        const points = new THREE.Points(geometry, material);
        scene.add(points);
        return { points, geometry, material };
      };

      const far = makeLayer(small ? 260 : 700, [-16, -4], small ? 0.2 : 0.16);
      const near = makeLayer(small ? 90 : 220, [-3, 6], small ? 0.26 : 0.22);

      const resize = () => {
        const w = host.clientWidth || 1;
        const h = host.clientHeight || 1;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.render(scene, camera);
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(host);

      let targetX = 0;
      let targetY = 0;
      let curX = 0;
      let curY = 0;
      const onPointer = (event: PointerEvent) => {
        targetX = event.clientX / window.innerWidth - 0.5;
        targetY = event.clientY / window.innerHeight - 0.5;
      };

      let raf = 0;
      let visible = true;
      const start = performance.now();
      const loop = (now: number) => {
        const t = (now - start) / 1000;
        curX += (targetX - curX) * 0.04;
        curY += (targetY - curY) * 0.04;
        far.points.rotation.y = t * 0.012 + curX * 0.18;
        far.points.rotation.x = curY * 0.1;
        near.points.rotation.y = t * 0.024 + curX * 0.4;
        near.points.rotation.x = curY * 0.22;
        near.points.position.y = Math.sin(t * 0.35) * 0.35;
        renderer.render(scene, camera);
        raf = requestAnimationFrame(loop);
      };
      const play = () => {
        if (reduce || raf || !visible || document.hidden) return;
        raf = requestAnimationFrame(loop);
      };
      const pause = () => {
        cancelAnimationFrame(raf);
        raf = 0;
      };
      const io = new IntersectionObserver(([entry]) => {
        visible = Boolean(entry?.isIntersecting);
        if (visible) play();
        else pause();
      });
      io.observe(host);
      const onVisibility = () => (document.hidden ? pause() : play());
      document.addEventListener("visibilitychange", onVisibility);
      if (!reduce) window.addEventListener("pointermove", onPointer, { passive: true });
      play();

      cleanup = () => {
        pause();
        io.disconnect();
        ro.disconnect();
        document.removeEventListener("visibilitychange", onVisibility);
        window.removeEventListener("pointermove", onPointer);
        [far, near].forEach((layer) => {
          scene.remove(layer.points);
          layer.geometry.dispose();
          layer.material.dispose();
        });
        texture.dispose();
        renderer.dispose();
        renderer.forceContextLoss();
        renderer.domElement.remove();
      };
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return <div ref={hostRef} className="rbx-particles" aria-hidden="true" />;
}

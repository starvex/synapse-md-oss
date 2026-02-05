"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface Node {
  x: number;
  y: number;
  label: string;
  glowIntensity: number;
  baseRadius: number;
}

interface Edge {
  from: number;
  to: number;
}

interface Signal {
  edgeIdx: number;
  progress: number;
  speed: number;
  forward: boolean;
}

function getLayout(width: number, height: number): { nodes: Node[]; edges: Edge[] } {
  const isMobile = width < 500;
  const isTablet = width < 800;

  const labels = isMobile || isTablet
    ? ["Backend", "Shared\nMemory", "Frontend", "DevOps", "QA", "Mobile", "Docs"]
    : ["bot-backend", "Shared\nMemory", "bot-frontend", "bot-devops", "bot-qa", "bot-mobile", "Consolidator"];

  const cx = width / 2;
  const cy = height / 2;

  let nodes: Node[];
  let edges: Edge[];

  if (isMobile) {
    // Mobile hub-and-spoke layout with 7 nodes: center + 6 around it
    const r = Math.min(width, height) * 0.34;
    const angles = [-Math.PI/2, Math.PI/6, 5*Math.PI/6, -Math.PI/6, 2*Math.PI/3, -5*Math.PI/6];
    
    nodes = [
      // Center hub: shared memory
      { x: cx, y: cy, label: labels[1], glowIntensity: 0, baseRadius: 34 },
    ];
    // Add 6 outer nodes around center
    const outerLabels = [labels[0], labels[2], labels[3], labels[4], labels[5], labels[6]];
    for (let i = 0; i < 6; i++) {
      nodes.push({
        x: cx + Math.cos(angles[i]) * r,
        y: cy + Math.sin(angles[i]) * r,
        label: outerLabels[i],
        glowIntensity: 0,
        baseRadius: 28,
      });
    }
    // All agents connect to center
    edges = [
      { from: 0, to: 1 },
      { from: 0, to: 2 },
      { from: 0, to: 3 },
      { from: 0, to: 4 },
      { from: 0, to: 5 },
      { from: 0, to: 6 },
      // Some cross-connections
      { from: 1, to: 2 },
      { from: 3, to: 4 },
      { from: 5, to: 6 },
    ];
  } else if (isTablet) {
    // Tablet hub-and-spoke layout with 7 nodes: center + 6 around it
    const r = Math.min(width, height) * 0.36;
    const angles = [-Math.PI/2, Math.PI/6, 5*Math.PI/6, -Math.PI/6, 2*Math.PI/3, -5*Math.PI/6];
    
    nodes = [
      // Center hub: shared memory
      { x: cx, y: cy, label: labels[1], glowIntensity: 0, baseRadius: 36 },
    ];
    // Add 6 outer nodes around center
    const outerLabels = [labels[0], labels[2], labels[3], labels[4], labels[5], labels[6]];
    for (let i = 0; i < 6; i++) {
      nodes.push({
        x: cx + Math.cos(angles[i]) * r,
        y: cy + Math.sin(angles[i]) * r,
        label: outerLabels[i],
        glowIntensity: 0,
        baseRadius: 30,
      });
    }
    // All agents connect to center
    edges = [
      { from: 0, to: 1 },
      { from: 0, to: 2 },
      { from: 0, to: 3 },
      { from: 0, to: 4 },
      { from: 0, to: 5 },
      { from: 0, to: 6 },
      // Some cross-connections
      { from: 1, to: 2 },
      { from: 3, to: 4 },
      { from: 5, to: 6 },
    ];
  } else {
    // Full desktop — hub and spoke with cross connections
    const r = Math.min(width, height) * 0.36;
    const angles = [-Math.PI / 2, Math.PI / 6, 5 * Math.PI / 6, -Math.PI / 6, 2 * Math.PI / 3, -5 * Math.PI / 6];
    nodes = [
      // Center hub: shared memory
      { x: cx, y: cy, label: labels[1], glowIntensity: 0, baseRadius: 36 },
    ];
    for (let i = 0; i < 6; i++) {
      const agentLabel = [labels[0], labels[2], labels[3], labels[4], labels[5], labels[6]][i];
      nodes.push({
        x: cx + Math.cos(angles[i]) * r,
        y: cy + Math.sin(angles[i]) * r,
        label: agentLabel,
        glowIntensity: 0,
        baseRadius: 26,
      });
    }
    // All agents connect to center
    edges = [
      { from: 0, to: 1 },
      { from: 0, to: 2 },
      { from: 0, to: 3 },
      { from: 0, to: 4 },
      { from: 0, to: 5 },
      { from: 0, to: 6 },
      // Some cross-connections
      { from: 1, to: 2 },
      { from: 3, to: 4 },
      { from: 5, to: 6 },
    ];
  }

  return { nodes, edges };
}

export default function NeuralAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const [dims, setDims] = useState({ w: 600, h: 350 });

  const layoutRef = useRef<{ nodes: Node[]; edges: Edge[] }>({ nodes: [], edges: [] });
  const signalsRef = useRef<Signal[]>([]);
  const timeRef = useRef(0);

  const updateDims = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const w = Math.max(el.clientWidth, 280); // Minimum width for mobile
    const isMobile = w < 500;
    const h = isMobile ? Math.min(w * 0.85, 380) : Math.min(w * 0.6, 400);
    setDims({ w, h });
    layoutRef.current = getLayout(w, h);
  }, []);

  useEffect(() => {
    updateDims();
    const ro = new ResizeObserver(updateDims);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [updateDims]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dims.w * dpr;
    canvas.height = dims.h * dpr;
    ctx.scale(dpr, dpr);

    let lastSignalTime = 0;

    const draw = (timestamp: number) => {
      const dt = timestamp - timeRef.current;
      timeRef.current = timestamp;

      const { nodes, edges } = layoutRef.current;
      if (nodes.length === 0) {
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      ctx.clearRect(0, 0, dims.w, dims.h);

      // Spawn signals periodically
      if (timestamp - lastSignalTime > 800 + Math.random() * 600) {
        lastSignalTime = timestamp;
        const edgeIdx = Math.floor(Math.random() * edges.length);
        signalsRef.current.push({
          edgeIdx,
          progress: 0,
          speed: 0.0008 + Math.random() * 0.0006,
          forward: Math.random() > 0.5,
        });
      }

      // Update signals
      signalsRef.current = signalsRef.current.filter((s) => {
        s.progress += s.speed * dt;
        if (s.progress >= 1) {
          // Glow the receiving node
          const edge = edges[s.edgeIdx];
          const targetIdx = s.forward ? edge.to : edge.from;
          if (nodes[targetIdx]) nodes[targetIdx].glowIntensity = 1;
          return false;
        }
        return true;
      });

      // Decay node glows
      for (const node of nodes) {
        node.glowIntensity = Math.max(0, node.glowIntensity - dt * 0.003);
      }

      // Draw edges
      for (const edge of edges) {
        const a = nodes[edge.from];
        const b = nodes[edge.to];
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = "rgba(0, 255, 136, 0.12)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Draw signals
      for (const signal of signalsRef.current) {
        const edge = edges[signal.edgeIdx];
        const a = nodes[signal.forward ? edge.from : edge.to];
        const b = nodes[signal.forward ? edge.to : edge.from];
        const x = a.x + (b.x - a.x) * signal.progress;
        const y = a.y + (b.y - a.y) * signal.progress;

        // Glow trail
        const grad = ctx.createRadialGradient(x, y, 0, x, y, 18);
        grad.addColorStop(0, "rgba(0, 255, 136, 0.8)");
        grad.addColorStop(0.5, "rgba(0, 255, 136, 0.2)");
        grad.addColorStop(1, "rgba(0, 255, 136, 0)");
        ctx.beginPath();
        ctx.arc(x, y, 18, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#00ff88";
        ctx.fill();
      }

      // Draw nodes
      for (const node of nodes) {
        const glow = node.glowIntensity;
        const r = node.baseRadius + glow * 6;

        // Outer glow
        if (glow > 0.01) {
          const glowGrad = ctx.createRadialGradient(node.x, node.y, r, node.x, node.y, r + 30);
          glowGrad.addColorStop(0, `rgba(0, 255, 136, ${glow * 0.4})`);
          glowGrad.addColorStop(1, "rgba(0, 255, 136, 0)");
          ctx.beginPath();
          ctx.arc(node.x, node.y, r + 30, 0, Math.PI * 2);
          ctx.fillStyle = glowGrad;
          ctx.fill();
        }

        // Node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        const bgAlpha = 0.6 + glow * 0.4;
        ctx.fillStyle = `rgba(17, 17, 17, ${bgAlpha})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(0, 255, 136, ${0.3 + glow * 0.7})`;
        ctx.lineWidth = 2 + glow;
        ctx.stroke();

        // Label
        ctx.fillStyle = `rgba(229, 229, 229, ${0.7 + glow * 0.3})`;
        const fontSize = dims.w < 500 ? 9 : node.baseRadius > 30 ? 11 : 10;
        ctx.font = `${fontSize}px "JetBrains Mono", monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const lines = node.label.split("\n");
        const lineH = 13;
        const startY = node.y - ((lines.length - 1) * lineH) / 2;
        for (let i = 0; i < lines.length; i++) {
          ctx.fillText(lines[i], node.x, startY + i * lineH);
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [dims]);

  return (
    <div ref={containerRef} className="w-full max-w-3xl mx-auto px-4 overflow-hidden">
      <canvas
        ref={canvasRef}
        style={{ width: dims.w, height: dims.h }}
        className="w-full max-w-full"
      />
    </div>
  );
}

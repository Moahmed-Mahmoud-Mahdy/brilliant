"use client";

import { Sparkles, Flower2, Droplets, Gem, Leaf, Star, Crown, Heart } from "lucide-react";

// Floating beauty icons — low opacity, slow drifting animation (BRD §10)
const ICONS = [
  { Icon: Sparkles, size: 42, top: "8%", right: "5%", delay: "0s", dur: "14s", opacity: 0.07 },
  { Icon: Flower2, size: 56, top: "22%", left: "4%", delay: "2s", dur: "18s", opacity: 0.06 },
  { Icon: Droplets, size: 38, top: "48%", right: "12%", delay: "4s", dur: "16s", opacity: 0.06 },
  { Icon: Gem, size: 46, top: "66%", left: "8%", delay: "1s", dur: "20s", opacity: 0.05 },
  { Icon: Leaf, size: 40, top: "82%", right: "7%", delay: "3s", dur: "15s", opacity: 0.06 },
  { Icon: Star, size: 30, top: "35%", right: "3%", delay: "5s", dur: "13s", opacity: 0.05 },
  { Icon: Crown, size: 36, top: "12%", left: "16%", delay: "6s", dur: "17s", opacity: 0.05 },
  { Icon: Heart, size: 28, top: "72%", left: "20%", delay: "2.5s", dur: "19s", opacity: 0.05 },
];

export function FloatingIcons() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {ICONS.map(({ Icon, size, top, right, left, delay, dur, opacity }, i) => (
        <Icon
          key={i}
          className={`absolute text-[var(--gold)] ${i % 2 === 0 ? "animate-float-slow" : "animate-float-slower"}`}
          style={{
            size,
            width: size,
            height: size,
            top,
            right,
            left,
            opacity,
            animationDelay: delay,
            animationDuration: dur,
          }}
        />
      ))}
    </div>
  );
}

"use client";

import { motion } from "framer-motion";

type Direction = "up" | "left" | "right" | "none";

type AnimateInProps = {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  direction?: Direction;
  className?: string;
  once?: boolean;
};

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

export function AnimateIn({
  children,
  delay = 0,
  duration = 0.45,
  direction = "up",
  className = "",
  once = true,
}: AnimateInProps) {
  const initialTransform =
    direction === "up"
      ? "translateY(20px)"
      : direction === "left"
        ? "translateX(-20px)"
        : direction === "right"
          ? "translateX(20px)"
          : "none";

  return (
    <motion.div
      initial={{ opacity: 0, transform: initialTransform }}
      whileInView={{ opacity: 1, transform: "translate(0)" }}
      viewport={{ once, margin: "-60px" }}
      transition={{ duration, delay, ease: EASE_OUT }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Contenedor stagger para listas ──────────────────── */
type StaggerProps = {
  children: React.ReactNode;
  stagger?: number;
  delayChildren?: number;
  className?: string;
};

export function StaggerList({
  children,
  stagger = 0.12,
  delayChildren = 0,
  className = "",
}: StaggerProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: stagger, delayChildren },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, transform: "translateY(20px)" },
        visible: {
          opacity: 1,
          transform: "translateY(0)",
          transition: { duration: 0.4, ease: EASE_OUT },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

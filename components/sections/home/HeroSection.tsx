"use client";

import type React from "react";
import Image from "next/image";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CTAS } from "@/lib/constants/copy";

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=1920&q=80";

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.16, delayChildren: 0.4 } },
};

const EASE_OUT: readonly [number, number, number, number] = [0.23, 1, 0.32, 1];

const fadeUp = {
  hidden: { opacity: 0, transform: "translateY(24px)" },
  visible: {
    opacity: 1,
    transform: "translateY(0)",
    transition: { duration: 0.5, ease: EASE_OUT },
  },
};

const fadePlain = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.45, ease: EASE_OUT },
  },
};

/** Parse *text* into <em> elements, plain text stays as-is */
function parseLine(line: string): React.ReactNode {
  const parts = line.split(/(\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

type HeroSectionProps = {
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  imageUrl?: string;
  ctaText?: string;
  overlayEnabled?: boolean;
};

export function HeroSection({
  title,
  subtitle,
  eyebrow,
  imageUrl,
  ctaText,
  overlayEnabled = true,
}: HeroSectionProps) {
  const heroImage = imageUrl ?? DEFAULT_IMAGE;
  const heroSubtitle = subtitle ?? "el camino de regreso a ti.";
  const heroCta = ctaText ?? CTAS.comenzarPractica;

  const heroTitle = title ?? "cuerpo,\n*respiración*\ny placer.";

  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "15%"]);

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-[100dvh] flex-col justify-end overflow-hidden"
      aria-label="Bienvenida"
    >
      {/* Imagen de fondo */}
      <motion.div className="absolute inset-0" aria-hidden style={{ y: bgY }}>
        <Image
          src={heroImage}
          alt=""
          fill
          className="object-cover object-center"
          priority
          sizes="100vw"
          quality={90}
        />
        {overlayEnabled && <div className="hero-overlay absolute inset-0" />}
      </motion.div>

      {/* Contenido */}
      <motion.div
        className="relative z-10 mx-auto w-full max-w-6xl px-[var(--space-4)] pb-[var(--space-16)] md:px-[var(--space-8)] md:pb-[var(--space-24)]"
        variants={container}
        initial="hidden"
        animate="visible"
      >
        {/* Eyebrow */}
        <motion.span
          variants={fadePlain}
          className="mb-[var(--space-4)] block text-xs font-medium uppercase tracking-[0.22em] text-white/75"
        >
          {eyebrow ?? "yoga con identidad"}
        </motion.span>

        {/* Headline — supports \n for line breaks and *text* for italic */}
        <h1 className="text-hero font-display font-bold text-white">
          {heroTitle.split("\n").map((line, i) => (
            <motion.span key={i} variants={fadeUp} className="block">
              {parseLine(line)}
            </motion.span>
          ))}
        </h1>

        {/* Tagline */}
        <motion.p
          variants={fadeUp}
          className="mt-[var(--space-6)] max-w-xs text-base leading-relaxed text-white/70 sm:max-w-sm sm:text-lg"
        >
          {heroSubtitle}
        </motion.p>

        {/* CTA único */}
        <motion.div
          variants={fadeUp}
          className="mt-[var(--space-8)]"
        >
          <Button href="#como-funciona" variant="light">
            {heroCta}
          </Button>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.a
        href="#propuesta"
        aria-label="Seguir leyendo"
        className="absolute bottom-[var(--space-6)] left-1/2 z-10 -translate-x-1/2 text-white/40 transition-colors hover:text-white/80"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 7, 0] }}
        transition={{
          opacity: { delay: 1.8, duration: 0.6 },
          y: { repeat: Infinity, duration: 2.6, ease: "easeInOut", delay: 2 },
        }}
      >
        <ChevronDown size={26} />
      </motion.a>
    </section>
  );
}

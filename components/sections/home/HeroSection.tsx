"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CTAS } from "@/lib/constants/copy";


const HERO_IMAGE =
  "https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=1920&q=80";

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.16, delayChildren: 0.4 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

const fadePlain = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

export function HeroSection() {
  return (
    <section
      className="relative flex min-h-[100dvh] flex-col justify-end"
      aria-label="Bienvenida"
    >
      {/* Imagen de fondo */}
      <div className="absolute inset-0" aria-hidden>
        <Image
          src={HERO_IMAGE}
          alt=""
          fill
          className="object-cover object-center"
          priority
          sizes="100vw"
          quality={90}
        />
        <div className="hero-overlay absolute inset-0" />
      </div>

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
          yoga con identidad
        </motion.span>

        {/* Headline — cada línea anima independiente */}
        <h1 className="text-hero font-display font-bold text-white">
          <motion.span variants={fadeUp} className="block">
            cuerpo,
          </motion.span>
          <motion.span variants={fadeUp} className="block italic">
            respiración
          </motion.span>
          <motion.span variants={fadeUp} className="block">
            y placer.
          </motion.span>
        </h1>

        {/* Tagline */}
        <motion.p
          variants={fadeUp}
          className="mt-[var(--space-6)] max-w-xs text-base leading-relaxed text-white/70 sm:max-w-sm sm:text-lg"
        >
          el camino de regreso a ti.
        </motion.p>

        {/* CTA único */}
        <motion.div
          variants={fadeUp}
          className="mt-[var(--space-8)]"
        >
          <Button href="#como-funciona" variant="light">
            {CTAS.comenzarPractica}
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

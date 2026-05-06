"use client";

import { useState } from "react";
import Link from "next/link";
import { UnlockModal } from "@/components/panel/on-demand/UnlockModal";
import { VimeoEmbed } from "@/components/panel/on-demand/VimeoEmbed";
import type { BibliotecaMode } from "./types";

interface LessonCardProps {
  lesson: {
    id: string;
    title: string;
    description: string | null;
    durationMinutes: number | null;
    level: string | null;
    intensity: string | null;
    targetAudience: string | null;
    equipment: string | null;
    tags: string | null;
    thumbnailUrl: string | null;
    promoVideoUrl: string | null;
    videoUrl: string | null;
  };
  categoryName: string;
  mode: BibliotecaMode;
  /** En modo authenticated: si la lección está canjeada por el usuario. */
  unlocked?: boolean;
  /** En modo authenticated: cuántas clases puede canjear todavía en esa categoría. */
  remaining?: number | null;
  /** En modo authenticated: callback cuando termina el unlock. */
  onUnlocked?: () => void;
  /** En modo authenticated: callback al hacer click en "Ver clase". */
  onPlay?: (lessonId: string) => void;
  /** En modo public: href para "Iniciar sesión" (con callbackUrl al deep-link de replay). */
  loginHref?: string;
  /** En modo authenticated && !hasOnDemandPlan: href a /panel/tienda. */
  buyPlanHref?: string;
  /** Si true, el panel de detalles arranca abierto (deep-link a esta lección). */
  defaultExpanded?: boolean;
}

/**
 * Card de lección con thumbnail, metadata y panel expandible (descripción, tags, equipo, promo video).
 * El CTA cambia según el modo:
 *  - public                                     → "Crea cuenta para canjear"
 *  - authenticated && !hasOnDemandPlan          → "Comprá un plan"
 *  - authenticated && hasOnDemandPlan && unlocked → "Ver clase"
 *  - authenticated && hasOnDemandPlan && !unlocked → "Canjear clase (N)"
 */
export function LessonCard({
  lesson,
  categoryName,
  mode,
  unlocked = false,
  remaining = null,
  onUnlocked,
  onPlay,
  loginHref = "/auth/register",
  buyPlanHref = "/panel/tienda",
  defaultExpanded = false,
}: LessonCardProps) {
  const [showModal, setShowModal] = useState(false);
  const [expanded, setExpanded] = useState(defaultExpanded);

  const tags = [
    lesson.level,
    lesson.intensity,
    lesson.targetAudience,
    ...(lesson.tags?.split(",").map((t) => t.trim()).filter(Boolean) ?? []),
  ].filter(Boolean);

  const hasDetail = lesson.description ?? lesson.promoVideoUrl ?? lesson.thumbnailUrl ?? tags.length > 0;

  const isPublic = mode.kind === "public";
  const isAuthenticated = mode.kind === "authenticated";
  const isAuthWithPlan = isAuthenticated && mode.hasOnDemandPlan;
  const isAuthWithoutPlan = isAuthenticated && !mode.hasOnDemandPlan;
  const showPlay = isAuthWithPlan && unlocked && Boolean(lesson.videoUrl);
  const showUnlock = isAuthWithPlan && !unlocked;

  function renderCta(size: "sm" | "lg") {
    const smCls =
      "rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium transition-colors";
    const lgCls =
      "flex-1 rounded-[var(--radius-md)] px-4 py-2.5 text-sm font-semibold transition-colors text-center";

    if (showPlay && onPlay) {
      return (
        <button
          onClick={() => onPlay(lesson.id)}
          className={`${size === "sm" ? smCls : lgCls} bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]`}
        >
          {size === "sm" ? "Ver clase" : "▶ Ver clase completa"}
        </button>
      );
    }
    if (showUnlock) {
      return (
        <button
          onClick={() => setShowModal(true)}
          disabled={remaining === 0}
          className={
            size === "sm"
              ? `${smCls} border-[1.5px] border-[var(--color-secondary)] text-[var(--color-secondary)] font-semibold hover:bg-[var(--color-secondary)] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed`
              : `${lgCls} bg-[var(--color-secondary)] text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed`
          }
        >
          {size === "lg" && remaining !== null && remaining > 0
            ? `Canjear clase (${remaining} disponible${remaining !== 1 ? "s" : ""})`
            : "Canjear clase"}
        </button>
      );
    }
    if (isAuthWithoutPlan) {
      return (
        <Link
          href={buyPlanHref}
          className={
            size === "sm"
              ? `${smCls} border-[1.5px] border-[var(--color-secondary)] text-[var(--color-secondary)] font-semibold hover:bg-[var(--color-secondary)] hover:text-white`
              : `${lgCls} bg-[var(--color-secondary)] text-white hover:opacity-90`
          }
        >
          Comprá un plan
        </Link>
      );
    }
    if (isPublic) {
      return (
        <Link
          href={loginHref}
          className={
            size === "sm"
              ? `${smCls} border-[1.5px] border-[var(--color-secondary)] text-[var(--color-secondary)] font-semibold hover:bg-[var(--color-secondary)] hover:text-white`
              : `${lgCls} bg-[var(--color-secondary)] text-white hover:opacity-90`
          }
        >
          {size === "sm" ? "Iniciar sesión" : "Iniciar sesión o crear cuenta para canjear"}
        </Link>
      );
    }
    return null;
  }

  return (
    <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] overflow-hidden transition-shadow hover:shadow-sm">
      {/* Collapsed row */}
      <div className="flex gap-3 p-3 sm:p-4">
        <button
          onClick={() => hasDetail && setExpanded((v) => !v)}
          className="w-[70px] h-[48px] sm:w-[100px] sm:h-[60px] rounded-lg flex-shrink-0 flex items-center justify-center relative cursor-pointer"
          style={{
            background: lesson.thumbnailUrl
              ? `url(${lesson.thumbnailUrl}) center/cover`
              : "linear-gradient(135deg, var(--color-primary-light), var(--color-primary))",
          }}
        >
          <div className="w-6 h-6 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-[10px]">
            {showPlay ? "▶" : "🔒"}
          </div>
          {lesson.durationMinutes && (
            <span className="absolute bottom-0.5 right-1 bg-black/60 text-white text-[7px] sm:text-[8px] px-1.5 py-px rounded">
              {lesson.durationMinutes} min
            </span>
          )}
        </button>

        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <p className="text-sm font-semibold text-[var(--color-text)] leading-tight">
            {lesson.title}
          </p>
          <p className="text-[10px] sm:text-xs text-[var(--color-text-muted)] mt-0.5">
            {[lesson.level, lesson.intensity, lesson.equipment].filter(Boolean).join(" · ")}
          </p>
          {isAuthWithPlan && unlocked && (
            <p className="text-[10px] text-green-700 font-medium mt-1">✓ Desbloqueada</p>
          )}
        </div>

        <div className="flex-shrink-0 flex items-center gap-2">
          {hasDetail && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="hidden sm:flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline"
            >
              {expanded ? "Cerrar" : "Detalles"}
              <span className="text-xs">{expanded ? "▲" : "▼"}</span>
            </button>
          )}
          {renderCta("sm")}
        </div>
      </div>

      {hasDetail && !expanded && (
        <div className="px-3 pb-2 sm:hidden">
          <button
            onClick={() => setExpanded(true)}
            className="text-xs text-[var(--color-primary)] hover:underline"
          >
            Ver detalles ▼
          </button>
        </div>
      )}

      {expanded && (
        <div className="border-t border-[var(--color-border)] bg-[var(--color-bg)]/50">
          {lesson.promoVideoUrl ? (
            <div className="px-3 pt-3 sm:px-4 sm:pt-4">
              <p className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)] font-semibold mb-2">
                Adelanto
              </p>
              <div className="rounded-lg overflow-hidden">
                <VimeoEmbed url={lesson.promoVideoUrl} title={`Adelanto: ${lesson.title}`} />
              </div>
            </div>
          ) : lesson.thumbnailUrl ? (
            <div className="px-3 pt-3 sm:px-4 sm:pt-4">
              <img
                src={lesson.thumbnailUrl}
                alt={lesson.title}
                loading="lazy"
                className="w-full rounded-lg object-cover max-h-52"
              />
            </div>
          ) : null}

          <div className="p-3 sm:p-4 space-y-3">
            {lesson.description && (
              <p className="text-sm text-[var(--color-text)] leading-relaxed">
                {lesson.description}
              </p>
            )}

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-3 py-1 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {lesson.equipment && (
              <div className="flex items-start gap-2">
                <span className="text-xs text-[var(--color-text-muted)] font-medium shrink-0">Equipo:</span>
                <span className="text-xs text-[var(--color-text)]">{lesson.equipment}</span>
              </div>
            )}

            {lesson.targetAudience && (
              <div className="flex items-start gap-2">
                <span className="text-xs text-[var(--color-text-muted)] font-medium shrink-0">Para:</span>
                <span className="text-xs text-[var(--color-text)]">{lesson.targetAudience}</span>
              </div>
            )}

            <div className="pt-2 flex gap-2">
              {renderCta("lg")}
              <button
                onClick={() => setExpanded(false)}
                className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && isAuthWithPlan && (
        <UnlockModal
          lessonId={lesson.id}
          lessonTitle={lesson.title}
          categoryName={categoryName}
          remaining={remaining}
          onClose={() => setShowModal(false)}
          onUnlocked={onUnlocked ?? (() => {})}
        />
      )}
    </div>
  );
}

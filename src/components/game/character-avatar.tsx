"use client";

import { useEffect, useMemo, useState } from "react";
import { DEFAULT_MONKEY_COLOR } from "@/lib/monkey-characters";

type CharacterAvatarProps = {
  svgType?: string;
  color?: string;
  size?: number;
  className?: string;
};

const svgCache = new Map<string, string>();

function sanitizeSvgMarkup(
  markup: string,
  color: string,
  size: number,
): string {
  return markup
    .replace(/#7f512e/gi, color)
    .replace(
      "<svg",
      `<svg style=\"width:${size}px;height:${size}px;display:block;object-fit:contain;\"`,
    );
}

export function CharacterAvatar({
  svgType,
  color,
  size = 52,
  className,
}: CharacterAvatarProps) {
  const [svgMarkup, setSvgMarkup] = useState<string | null>(() => {
    if (!svgType) {
      return null;
    }
    return svgCache.get(svgType) ?? null;
  });

  useEffect(() => {
    if (!svgType) {
      return;
    }

    if (svgCache.has(svgType)) {
      return;
    }

    let cancelled = false;
    fetch(`/monkey reactions/emoji/${svgType}`)
      .then((response) => response.text())
      .then((markup) => {
        if (cancelled) return;
        svgCache.set(svgType, markup);
        setSvgMarkup(markup);
      })
      .catch(() => {
        if (!cancelled) {
          setSvgMarkup(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [svgType]);

  const html = useMemo(() => {
    const sourceMarkup = svgType ? (svgCache.get(svgType) ?? svgMarkup) : null;
    if (!sourceMarkup) {
      return null;
    }
    return sanitizeSvgMarkup(sourceMarkup, color ?? DEFAULT_MONKEY_COLOR, size);
  }, [color, size, svgMarkup, svgType]);

  return (
    <div
      className={className}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {html ? (
        <div
          style={{ width: size, height: size }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <div
          className="h-full w-full bg-zinc-100"
          title="Character not selected"
        />
      )}
    </div>
  );
}

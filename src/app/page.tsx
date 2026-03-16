"use client";

import Link from "next/link";
import dynamic from "next/dynamic";

const MenuArenaPreview = dynamic(
  () =>
    import("@/components/game/menu/menu-arena-preview").then((m) => ({
      default: m.MenuArenaPreview,
    })),
  { ssr: false },
);

const NAV_BTN_BASE =
  "w-full py-5 px-6 border-4 border-black font-black uppercase tracking-widest text-lg shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.75 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all duration-100 text-left flex items-center justify-between group";

const DEV_BTN_BASE =
  "w-full py-3 border-4 border-black font-black uppercase text-xs tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all";

const DIVIDER_LINE = "flex-1 h-0.5 bg-black";

const COLOR_MAP: Record<string, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  success: "bg-green-400 text-black hover:bg-green-300",
  ghost: "bg-white text-black border-black hover:bg-zinc-100",
};

function NavButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "danger" | "success" | "ghost";
}) {
  return (
    <Link href={href} className="w-full">
      <button className={[NAV_BTN_BASE, COLOR_MAP[variant]].join(" ")}>
        <span>{children}</span>
        <span className="text-2xl opacity-40 group-hover:opacity-80 transition-opacity">
          →
        </span>
      </button>
    </Link>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-1">
      <div className={DIVIDER_LINE} />
      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-black">
        {label}
      </span>
      <div className={DIVIDER_LINE} />
    </div>
  );
}

export default function MainMenu() {
  return (
    <div className="w-screen min-h-screen bg-white text-black font-sans overflow-x-hidden">
      <div className="max-w-350 mx-auto min-h-screen grid grid-cols-1 xl:grid-cols-[520px_1fr] gap-0">
        <div className="flex flex-col justify-center px-8 md:px-16 py-16 xl:py-0 xl:border-r-4 xl:border-black">
          <div className="mb-10">
            <div className="inline-block border-4 border-black px-3 py-1 mb-4 bg-yellow-300">
              <span className="text-xs font-black uppercase tracking-[0.3em]">
                Three Thing Game
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl font-black uppercase leading-none tracking-tight mb-3">
              Voting
              <br />
              <span className="text-primary">Monkey</span>
              <br />
              Balls
            </h1>
            <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">
              Voting · Monkey · Balls
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full max-w-sm">
            <NavButton href="/host" variant="primary">
              Host Game
            </NavButton>
            <NavButton href="/join" variant="danger">
              Join Game
            </NavButton>

            <Divider label="Freeplay" />

            <NavButton href="/singleplayer" variant="success">
              Singleplayer
            </NavButton>
            <NavButton href="/bots" variant="ghost">
              Watch Bots
            </NavButton>

            <Divider label="Dev" />

            <div className="grid grid-cols-3 gap-2">
              <Link href="/test">
                <button
                  className={[
                    DEV_BTN_BASE,
                    "bg-cyan-300 text-black hover:bg-cyan-200",
                  ].join(" ")}
                >
                  Test
                </button>
              </Link>
              <Link href="/cards">
                <button
                  className={[
                    DEV_BTN_BASE,
                    "bg-pink-300 text-black hover:bg-pink-200",
                  ].join(" ")}
                >
                  Cards
                </button>
              </Link>
              <Link href="/audio-test">
                <button
                  className={[
                    DEV_BTN_BASE,
                    "bg-yellow-300 text-black hover:bg-yellow-200",
                  ].join(" ")}
                >
                  Audio
                </button>
              </Link>
            </div>

            <Link href="/character-test">
              <button
                className={[
                  DEV_BTN_BASE,
                  "bg-orange-300 text-black hover:bg-orange-200",
                ].join(" ")}
              >
                Character Select
              </button>
            </Link>
          </div>

          <p className="mt-10 text-xs font-bold text-zinc-400 uppercase tracking-wide">
            By Jayden Holdsworth &amp; Archie Hull
          </p>
        </div>

        <div className="hidden xl:flex flex-col items-center justify-center px-16 bg-zinc-50">
          <div className="w-full max-w-175">
            <MenuArenaPreview />
          </div>
        </div>
      </div>
    </div>
  );
}

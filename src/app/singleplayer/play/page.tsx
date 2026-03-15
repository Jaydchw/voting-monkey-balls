import SingleplayerPanel from "@/components/game/singleplayer-panel";

type SingleplayerPlayPageProps = {
  searchParams: Promise<{
    bots?: string;
  }>;
};

const MIN_BOTS = 0;
const MAX_BOTS = 20;

export default async function SingleplayerPlayPage({
  searchParams,
}: SingleplayerPlayPageProps) {
  const params = await searchParams;
  const parsedBots = Number(params.bots);
  const initialBotCount = Number.isFinite(parsedBots)
    ? Math.max(MIN_BOTS, Math.min(MAX_BOTS, Math.floor(parsedBots)))
    : 0;

  return <SingleplayerPanel initialBotCount={initialBotCount} />;
}

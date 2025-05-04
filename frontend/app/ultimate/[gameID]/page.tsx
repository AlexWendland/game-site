import { notFound } from "next/navigation";
import { Game } from "@/components/Game";
import { validateGameID } from "@/lib/gameFunctions";
import { getGameStateAPI } from "@/lib/apiCalls";
import { GameProvider } from "@/components/GameContext";

export default async function Page({
  params,
}: {
  params: Promise<{ gameID: string }>;
}) {
  const { gameID } = await params;
  if (!validateGameID(gameID)) {
    notFound();
  }
  try {
    await getGameStateAPI(gameID);
  } catch (error) {
    console.error("Error fetching game state:", error);
    notFound();
  }
  return (
    <GameProvider gameID={gameID}>
      <div className="text-4xl text-center pb-8">
        Invite a friend to play with game ID{" "}
        <div className="text-primary font-bold">{gameID}</div>
      </div>
      <Game />
    </GameProvider>
  );
}

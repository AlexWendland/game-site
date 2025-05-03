import { notFound } from "next/navigation";
import { Game } from "@/components/Game";
import { validateGameID } from "@/lib/gameFunctions";
import { getGameState } from "@/lib/apiCalls";

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
    await getGameState(gameID);
  } catch (error) {
    console.error("Error fetching game state:", error);
    notFound();
  }
  return (
    <>
      <div>My Game: {gameID}</div>
      <Game gameID={gameID} />
    </>
  );
}

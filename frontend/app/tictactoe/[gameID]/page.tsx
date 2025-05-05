import { notFound } from "next/navigation";
import { TicTacToeGame } from "@/components/tictactoe/TicTacToeGame";
import { TicTacToeProvider } from "@/components/tictactoe/TicTacToeContext";
import { validateGameID } from "@/lib/gameFunctions";
import { getGameStateAPI } from "@/lib/apiCalls";

export default async function Page({
  params,
}: {
  params: Promise<{ gameID: string }>;
}) {
  // Game page parameters
  const { gameID } = await params;

  // Validate page
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
    <TicTacToeProvider gameID={gameID}>
      <div className="text-4xl text-center pb-8">
        Invite a friend to play with game ID{" "}
        <div className="text-primary font-bold">{gameID}</div>
      </div>
      <TicTacToeGame />
    </TicTacToeProvider>
  );
}

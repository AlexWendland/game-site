import { notFound } from "next/navigation";
import { TicTacToeGame } from "@/components/tictactoe/TicTacToeGame";
import { TicTacToeProvider } from "@/components/tictactoe/TicTacToeContext";
import { validateGameID } from "@/lib/gameFunctions";
import { getGameMetadata } from "@/lib/apiCalls";

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
    const metadata = await getGameMetadata(gameID);
    if (metadata.game_type !== "tictactoe") {
      notFound();
    }
  } catch (error) {
    console.error("Error fetching game state:", error);
    notFound();
  }

  return (
    <TicTacToeProvider gameID={gameID}>
      <TicTacToeGame />
    </TicTacToeProvider>
  );
}

import { notFound } from "next/navigation";
import { validateGameID } from "@/lib/gameFunctions";
import { getGameMetadata } from "@/lib/apiCalls";
import { UltimateProvider } from "@/components/ultimate/UltimateContext";
import { UltimateGame } from "@/components/ultimate/UltimateGame";

export default async function Page({ params }: { params: { gameID: string } }) {
  // Game page parameters
  const { gameID } = params;

  // Validate page
  if (!validateGameID(gameID)) {
    notFound();
  }
  try {
    const metadata = await getGameMetadata(gameID);
    if (metadata.game_type !== "ultimate") {
      notFound();
    }
  } catch (error) {
    console.error("Error fetching game state:", error);
    notFound();
  }

  return (
    <UltimateProvider gameID={gameID}>
      <UltimateGame />
    </UltimateProvider>
  );
}

import { notFound } from "next/navigation";
import { validateGameID } from "@/lib/gameFunctions";
import { getGameMetadata } from "@/lib/apiCalls";
import { TopologicalProvider } from "@/components/topological/TopologicalContext";
import { TopologicalGame } from "@/components/topological/TopologicalGame";

export default async function Page({ params }: { params: { gameID: string } }) {
  // Game page parameters
  const { gameID } = params;

  // Validate page
  if (!validateGameID(gameID)) {
    notFound();
  }
  try {
    const metadata = await getGameMetadata(gameID);
    if (metadata.game_type !== "topological") {
      notFound();
    }
  } catch (error) {
    console.error("Error fetching game state:", error);
    notFound();
  }

  return (
    <TopologicalProvider gameID={gameID}>
      <TopologicalGame />
    </TopologicalProvider>
  );
}

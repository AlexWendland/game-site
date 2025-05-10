import { notFound } from "next/navigation";
import { validateGameID } from "@/lib/gameFunctions";
import { getGameMetadata } from "@/lib/apiCalls";
import { UltimateProvider } from "@/components/ultimate/UltimateContext";
import { UltimateGame } from "@/components/ultimate/UltimateGame";

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
    const metdata = await getGameMetadata(gameID);
    if (metdata.game_type !== "ultimate") {
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

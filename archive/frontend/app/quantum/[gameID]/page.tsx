import { notFound } from "next/navigation";
import { validateGameID } from "@/lib/gameFunctions";
import { getGameMetadata } from "@/lib/apiCalls";
import { QuantumProvider } from "@/components/quantum/QuantumContext";
import { QuantumGame } from "@/components/quantum/QuantumGame";

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
    if (metadata.game_type !== "quantum") {
      notFound();
    }
  } catch (error) {
    console.error("Error fetching game state:", error);
    notFound();
  }

  return (
    <QuantumProvider gameID={gameID}>
      <QuantumGame />
    </QuantumProvider>
  );
}

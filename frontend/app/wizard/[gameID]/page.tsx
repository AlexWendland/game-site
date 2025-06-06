import { notFound } from "next/navigation";
import { validateGameID } from "@/lib/gameFunctions";
import { getGameMetadata } from "@/lib/apiCalls";
import { WizardProvider } from "@/components/wizard/WizardContext";
import { WizardGame } from "@/components/wizard/WizardGame";

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
    if (metadata.game_type !== "wizard") {
      notFound();
    }
  } catch (error) {
    console.error("Error fetching game state:", error);
    notFound();
  }

  return (
    <WizardProvider gameID={gameID}>
      <WizardGame />
    </WizardProvider>
  );
}

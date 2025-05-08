import { getGameMetadata } from "@/lib/apiCalls";
import { validateGameID } from "@/lib/gameFunctions";
import { notFound, redirect } from "next/navigation";

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
    const gameMetadata = await getGameMetadata(gameID);
    console.log("gameMetadata", gameMetadata);
    if (gameMetadata) {
      redirect(`/${gameMetadata.game_type}/${gameID}`);
    }
  } catch (error) {}
  notFound();
}

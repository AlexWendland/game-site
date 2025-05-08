import { getGameMetadata } from "./apiCalls";
import { validateGameID } from "./gameFunctions";
import { useRouter } from "next/navigation";

export async function redirectToGame(gameID: string) {
  const router = useRouter();
  if (!validateGameID(gameID)) {
    return;
  }
  try {
    const gameMetadata = await getGameMetadata(gameID);
    console.log("gameMetadata", gameMetadata);
    if (gameMetadata) {
      router.push(`/${gameMetadata.game_type}/${gameID}`);
    }
  } catch (error) {}
  return;
}

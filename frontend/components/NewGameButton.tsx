import { Button } from "@heroui/react";
import { makeNewUltimateGame } from "@/lib/apiCalls";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function NewGameButton() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const onPress = async () => {
    setIsLoading(true);
    const gameID: string = await makeNewUltimateGame();
    router.push(`/ultimate/${gameID}`);
  };

  return (
    <Button color="primary" isLoading={isLoading} onPress={onPress}>
      Start a New Game
    </Button>
  );
}

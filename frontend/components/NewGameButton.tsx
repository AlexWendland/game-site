import { Button } from "@heroui/react";
import { makeNewUltimateGameAPI } from "@/lib/apiCalls";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function NewGameButton() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const onPress = async () => {
    setIsLoading(true);
    const gameID: string = await makeNewUltimateGameAPI();
    router.push(`/ultimate/${gameID}`);
  };

  return (
    <Button color="primary" isLoading={isLoading} onPress={onPress}>
      Start a New Game
    </Button>
  );
}

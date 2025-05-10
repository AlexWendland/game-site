"use client";

import { JoinGameButton } from "@/components/JoinGameButton";
import { Button } from "@heroui/button";
import {
  makeNewTicTacToeGameAPI,
  makeNewUltimateGameAPI,
} from "@/lib/apiCalls";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const startNewTicTacToeGame = async () => {
    const gameID: string = await makeNewTicTacToeGameAPI();
    router.push(`/tictactoe/${gameID}`);
  };

  const startNewUltimateGame = async () => {
    const gameID: string = await makeNewUltimateGameAPI();
    router.push(`/ultimate/${gameID}`);
  };

  return (
    <>
      <h1>Welcome to my game site, there are some games here!</h1>
      <p className="p-4">You can join someones game...</p>
      <br />
      <div className="flex justify-center">
        <JoinGameButton />
      </div>
      <p className="p-4">Or start a new game...</p>
      <div className="flex">
        <div className="p-4">
          <Button onPress={startNewTicTacToeGame} color="secondary">
            Tic Tac Toe
          </Button>
        </div>
        <div className="p-4">
          <Button onPress={startNewUltimateGame} color="secondary">
            Ultimate Tic Tac Toe
          </Button>
        </div>
      </div>
    </>
  );
}

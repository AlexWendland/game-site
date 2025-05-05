"use client";

import { JoinGameButton } from "@/components/JoinGameButton";
import { Button } from "@heroui/button";
import { makeNewTicTacToeGameAPI } from "@/lib/apiCalls";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const startNewTicTacToe = async () => {
    const gameID: string = await makeNewTicTacToeGameAPI();
    router.push(`/tictactoe/${gameID}`);
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
        <Button onPress={startNewTicTacToe}>Tic Tac Toe</Button>
      </div>
    </>
  );
}

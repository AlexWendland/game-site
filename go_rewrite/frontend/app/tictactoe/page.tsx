"use client";

import { notFound, useSearchParams } from "next/navigation";
import { TicTacToeGame } from "@/components/tictactoe/TicTacToeGame";
import { TicTacToeProvider } from "@/components/tictactoe/TicTacToeContext";
import { validateGameID } from "@/lib/gameFunctions";
import { getGameMetadata } from "@/lib/apiCalls";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function TicTacToePage() {
  const searchParams = useSearchParams();
  const gameID = searchParams.get("gameID");
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const { getToken } = useAuth();

  useEffect(() => {
    async function validate() {
      if (!gameID || !validateGameID(gameID)) {
        setIsValid(false);
        setIsValidating(false);
        return;
      }

      try {
        const token = getToken();
        if (!token) {
          console.error("No auth token available");
          return;
        }
        const metadata = await getGameMetadata(gameID, token);
        if (metadata.game_type !== "tictactoe") {
          setIsValid(false);
        } else {
          setIsValid(true);
        }
      } catch (error) {
        console.error("Error fetching game state:", error);
        setIsValid(false);
      }
      setIsValidating(false);
    }

    validate();
  }, [gameID, getToken]);

  if (isValidating) {
    return <div>Loading...</div>;
  }

  if (!isValid || !gameID) {
    notFound();
  }

  return (
    <TicTacToeProvider gameID={gameID}>
      <TicTacToeGame />
    </TicTacToeProvider>
  );
}

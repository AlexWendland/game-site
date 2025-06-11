"use client";

import { JoinGameButton } from "@/components/JoinGameButton";
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

  const startNewTopological = async () => {
    router.push(`/topological`);
  };

  const startNewWizard = async () => {
    router.push(`/wizard`);
  };

  const games = [
    {
      name: "Tic Tac Toe",
      description: "Your classic 0 and X game!",
      onClick: startNewTicTacToeGame,
      image: "/tictactoe.png",
    },
    {
      name: "Ultimate Tic Tac Toe",
      description: "Next level Tic Tac Toe",
      onClick: startNewUltimateGame,
      image: "/ultimate.png",
    },
    {
      name: "Topological Connect Four",
      description: "Connect four for real children!",
      onClick: startNewTopological,
      image: "/topological.svg",
    },
    {
      name: "Wizard",
      description: "Magic trick based card game!",
      onClick: startNewWizard,
      image: "/wizard.svg",
    },
  ];

  return (
    <>
      <div className="flex justify-center">
        <JoinGameButton />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 pt-6 justify-center justify-items-center gap-6 px-4">
        {" "}
        {games.map((game, index) => (
          <div
            key={index}
            className="group flex flex-col overflow-hidden rounded-lg bg-white shadow-md transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer w-60 h-70 bg-gray-100 dark:bg-gray-700"
            onClick={game.onClick}
          >
            <div className="relative flex h-2/3 items-center justify-center overflow-hidden bg-gray-50 p-1">
              <img
                alt={game.name}
                src={game.image}
                className="h-full w-full object-contain"
              />
            </div>
            <div className="flex h-1/3 flex-col justify-between p-4">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                {game.name}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {game.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

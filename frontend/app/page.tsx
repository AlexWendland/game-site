"use client";

import { JoinGameButton } from "@/components/JoinGameButton";
import {
  makeNewTicTacToeGameAPI,
  makeNewUltimateGameAPI,
} from "@/lib/apiCalls";
import { useRouter } from "next/navigation";

import { Card, CardBody, CardFooter, Image } from "@heroui/react";

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
      description: "A more complex version of Tic Tac Toe",
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
      description: "A classic card game",
      onClick: startNewWizard,
      image: "/wizard.svg",
    },
  ];

  return (
    <>
      <div className="flex justify-center">
        <JoinGameButton />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 pt-6 justify-center justify-items-center">
        {games.map((game, index) => (
          <div className="p-4" key={index}>
            <Card
              key={index}
              isPressable
              shadow="sm"
              onPress={game.onClick}
              className="bg-gray-100 w-52"
            >
              <CardBody className="overflow-visible p-0 bg-gray-50">
                <Image
                  alt={game.name}
                  className="w-full object-cover h-[140px]"
                  radius="lg"
                  shadow="sm"
                  src={game.image}
                  width="100%"
                />
              </CardBody>
              <CardFooter className="text-small grid grid-cols-1">
                <b>{game.name}</b>
                <p className="text-default-500">{game.description}</p>
              </CardFooter>
            </Card>
          </div>
        ))}
      </div>
    </>
  );
}

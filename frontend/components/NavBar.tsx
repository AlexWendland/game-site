"use client";

import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  Link,
  Button,
  DropdownItem,
  DropdownTrigger,
  Dropdown,
  DropdownMenu,
} from "@heroui/react";

import {
  makeNewTicTacToeGameAPI,
  makeNewUltimateGameAPI,
} from "@/lib/apiCalls";
import { useRouter } from "next/navigation";
import { useUserContext } from "@/context/UserContext";
import { useGameContext } from "@/context/GameContext";

type ChevronDownProps = React.SVGProps<SVGSVGElement> & {
  fill?: string;
  size?: number;
  height?: number;
  width?: number;
};

export const ChevronDown: React.FC<ChevronDownProps> = ({
  fill = "currentColor",
  size,
  height,
  width,
  ...props
}) => {
  return (
    <svg
      fill="none"
      height={size || height || 24}
      width={size || width || 24}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="m19.92 8.95-6.52 6.52c-.77.77-2.03.77-2.8 0L4.08 8.95"
        stroke={fill}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeMiterlimit={10}
        strokeWidth={1.5}
      />
    </svg>
  );
};

export function NavBar() {
  const icons = {
    chevron: <ChevronDown fill="currentColor" size={16} />,
  };
  const { username, clearUsername } = useUserContext();
  const { gameCode, gameState } = useGameContext();
  const router = useRouter();

  const startNewTicTacToe = async () => {
    const gameID: string = await makeNewTicTacToeGameAPI();
    router.push(`/tictactoe/${gameID}`);
  };

  const startNewUltimateGame = async () => {
    const gameID: string = await makeNewUltimateGameAPI();
    router.push(`/ultimate/${gameID}`);
  };

  const startNewTopologicalGame = async () => {
    router.push(`/topological`);
  };

  const startNewWizardGame = async () => {
    router.push(`/wizard`);
  };

  return (
    <Navbar className="bg-gray-200" shouldHideOnScroll>
      <NavbarBrand>
        <img src="/logo.svg" alt="Logo" width="30" />
        <Link href="/">
          <div className="font-bold text-2xl text-orange-800 pl-2">
            Alex's Games
          </div>
        </Link>
      </NavbarBrand>
      <NavbarContent className="hidden md:flex gap-4" justify="center">
        <Dropdown>
          <NavbarItem>
            <DropdownTrigger>
              <Button
                disableRipple
                className="p-0 bg-transparent data-[hover=true]:bg-transparent"
                endContent={icons.chevron}
                radius="sm"
                variant="light"
              >
                Start a new game
              </Button>
            </DropdownTrigger>
          </NavbarItem>
          <DropdownMenu
            aria-label="Start new game"
            itemClasses={{
              base: "gap-4",
            }}
            className="bg-gray-50"
          >
            <DropdownItem
              key="Tic Tac Toe"
              description="The classic 0 and X game."
              onPress={startNewTicTacToe}
              startContent={
                <img
                  className="w-16"
                  src="/tictactoe.png"
                  alt="Tic Tac Toe board"
                />
              }
            >
              Tic Tac Toe
            </DropdownItem>
            <DropdownItem
              key="Ultimate Tic Tac Toe"
              description="Next level 0 and X."
              onPress={startNewUltimateGame}
              startContent={
                <img
                  className="w-16"
                  src="/ultimate.png"
                  alt="Ultimate Tic Tac Toe board"
                />
              }
            >
              Ultimate Tic Tac Toe
            </DropdownItem>
            <DropdownItem
              key="Topological Connect Four"
              description="Connect four on a doughnut."
              onPress={startNewTopologicalGame}
              startContent={
                <img
                  className="w-16"
                  src="/topological.svg"
                  alt="Topological Connect Four Board"
                />
              }
            >
              Topological Connect Four
            </DropdownItem>
            <DropdownItem
              key="Wizard"
              description="Magic trick based card game!"
              onPress={startNewWizardGame}
              startContent={
                <img
                  className="w-16"
                  src="/wizard.svg"
                  alt="Wizard card game"
                />
              }
            >
              Wizard
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
        <NavbarItem isActive>
          <div className="text-primary text-xl p-4 hidden lg:block">
            {gameCode}
          </div>
        </NavbarItem>
        <NavbarItem>
          <div className="hidden lg:block">{gameState}</div>
        </NavbarItem>
      </NavbarContent>
      <NavbarContent justify="end">
        <NavbarItem className="hidden sm:block">{username}</NavbarItem>
        <NavbarItem>
          <Button color="default" onPress={clearUsername}>
            Switch Username
          </Button>
        </NavbarItem>
      </NavbarContent>
    </Navbar>
  );
}

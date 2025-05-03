"use client";
import { JoinGameButton } from "@/components/JoinGameButton";
import { NewGameButton } from "@/components/NewGameButton";

export default function Home() {
  return (
    <>
      <h1 className="text-center text-4xl pb-16">Ultimate Tic Tac Toe</h1>
      <div className="grid grid-cols-5 gap-4 width-full">
        <div className="col-span-1 col-start-2 justify-self-center">
          <NewGameButton />
        </div>
        <div className="col-span-1 col-start-4 justify-self-center">
          <JoinGameButton />
        </div>
      </div>
    </>
  );
}

import { notFound } from "next/navigation";
import { Game } from "@/components/Game";
import { validateGameID } from "@/lib/gameFunctions";

export default async function Page({
  params,
}: {
  params: Promise<{ gameID: string }>;
}) {
  const { gameID } = await params;
  if (!validateGameID(gameID)) {
    notFound();
  }
  return (
    <>
      <div>My Game: {gameID}</div>
      <Game gameID={gameID} />
    </>
  );
}

import { notFound } from "next/navigation";
import { Game } from "@/components/Game";
import { validateGameID } from "@/lib/gameFunctions";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // TODO: Extend isValidSlug to use a server call to check if the game exists.
  const isValidSlug = validateGameID(slug);

  if (!isValidSlug) {
    notFound();
  }
  return (
    <>
      <div>My Game: {slug}</div>
      <Game />
    </>
  );
}

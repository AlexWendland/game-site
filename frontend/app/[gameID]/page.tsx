"use client";

import { redirectToGame } from "@/lib/utils";
import { notFound } from "next/navigation";

export default async function Page({
  params,
}: {
  params: Promise<{ gameID: string }>;
}) {
  const { gameID } = await params;
  await redirectToGame(gameID);
  notFound();
}

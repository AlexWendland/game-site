"use client";

import { makeNewWizardGameAPI } from "@/lib/apiCalls";
import { Slider } from "@/components/common/Slider";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function WizardCreateGame() {
  const router = useRouter();
  const [showOldHands, setShowOldHands] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const players = Number(formData.get("players"));

    const gameID: string = await makeNewWizardGameAPI(players, showOldHands);
    router.push(`/wizard?gameID=${gameID}`);
  }

  return (
    <form
      className="grid grid-cols-1 justify-items-center gap-4 w-full h-full p-2"
      onSubmit={handleSubmit}
    >
      <div className="grid grid-cols-1 gap-16">
        <h1 className="text-xl">Create new Wizard game!</h1>
        <Slider
          defaultValue={4}
          label="Number of players"
          maxValue={6}
          minValue={3}
          name="players"
        />
        <div className="flex items-center gap-x-4">
          <input
            type="checkbox"
            name="showOldHands"
            checked={showOldHands}
            onChange={() => setShowOldHands(!showOldHands)}
            className="w-4 h-4 border-gray-300 focus:ring-indigo-500"
          />
          View hands from previous tricks?
        </div>
      </div>
      <button
        type="submit"
        className="bg-orange-300 dark:bg-orange-500 p-4 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-600 hover:scale-105 transition-all"
      >
        Create new game
      </button>
    </form>
  );
}

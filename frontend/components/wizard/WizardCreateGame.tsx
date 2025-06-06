"use client";

import { makeNewWizardGameAPI } from "@/lib/apiCalls";
import { Form, Slider, Switch, Button } from "@heroui/react";
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
    router.push(`/wizard/${gameID}`);
  }

  return (
    <Form
      className="grid grid-cols-1 justify-items-center gap-4 w-full h-full p-2"
      onSubmit={handleSubmit}
    >
      <div className="grid grid-cols-1 gap-4">
        <h1 className="text-xl">Create new Wizard game!</h1>
        <Slider
          className="max-w-md"
          color="foreground"
          defaultValue={4}
          label="Number of players"
          maxValue={6}
          minValue={3}
          showSteps={true}
          size="lg"
          step={1}
          name="players"
        />
        <Switch
          name="showOldHands"
          color="secondary"
          size="lg"
          checked={showOldHands}
          onChange={() => setShowOldHands(!showOldHands)}
        >
          View hands from previous tricks?
        </Switch>
      </div>
      <Button color="primary" type="submit">
        Create new game
      </Button>
    </Form>
  );
}

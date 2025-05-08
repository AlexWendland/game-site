import { Button, Form, Input } from "@heroui/react";
import { FormEvent, useState } from "react";
import { validateGameID } from "@/lib/gameFunctions";
import { redirectToGame } from "@/lib/utils";

export function JoinGameButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const onSubmit = async (formInput: FormEvent<HTMLFormElement>) => {
    formInput.preventDefault();

    // Get form data
    const formData = new FormData(formInput.currentTarget);
    const gameID =
      formData.get("GameID")?.toString().trim().toUpperCase() ?? "";
    console.log(`Provided game ID: ${gameID}`);

    if (!validateGameID(gameID)) {
      setErrors({ GameID: "Game IDs need to be a 5 letter string." });
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      redirectToGame(gameID);
      setErrors({ GameID: "Invalid game ID" });
    } catch (err) {
      console.log(err);
      setErrors({ GameID: "Invalid game ID" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      className="w-full max-w-xs"
      validationErrors={errors}
      onSubmit={onSubmit}
    >
      <Input
        isRequired
        isDisabled={isLoading}
        label="GameID"
        labelPlacement="outside"
        name="GameID"
        placeholder="Enter the 5 character GameID"
      />
      <Button color="primary" isLoading={isLoading} type="submit">
        Join a game!
      </Button>
    </Form>
  );
}

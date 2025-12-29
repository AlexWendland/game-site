import { FormEvent, useState } from "react";
import { validateGameID } from "@/lib/gameFunctions";
import { getGameMetadata } from "@/lib/apiCalls";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export function JoinGameButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const router = useRouter();
  const { getToken } = useAuth();

  const onSubmit = async (formInput: FormEvent<HTMLFormElement>) => {
    formInput.preventDefault();

    // Reset errors and set loading state
    setErrors({});
    setIsLoading(true);

    // Get form data
    const formData = new FormData(formInput.currentTarget);
    const gameID =
      formData.get("GameID")?.toString().trim().toUpperCase() ?? "";

    if (!validateGameID(gameID)) {
      setErrors({ GameID: "Game IDs need to be a 5 letter string." });
      setIsLoading(false); // Stop loading on validation error
      return;
    }

    try {
      const token = getToken();
      if (!token) {
        setErrors({ GameID: "Authentication required" });
        setIsLoading(false);
        return;
      }

      const gameMetadata = await getGameMetadata(gameID, token);
      if (gameMetadata) {
        router.push(`/${gameMetadata.game_type}?gameID=${gameID}`);
      } else {
        setErrors({ GameID: "Invalid game ID" });
      }
    } catch (err) {
      console.error(err);
      setErrors({ GameID: "An error occurred. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      className="w-full max-w-xs space-y-4 rounded-lg p-6 bg-gray-100 dark:bg-gray-700"
      onSubmit={onSubmit}
    >
      <div className="relative">
        <label
          htmlFor="GameID"
          className="block text-sm font-medium text-gray-700 dark:text-gray-200"
        >
          GameID
        </label>
        <input
          type="text"
          id="GameID"
          name="GameID"
          placeholder="Enter the 5 character GameID"
          required
          disabled={isLoading}
          className={`mt-1 block w-full rounded-md border p-2 shadow-sm focus:border-blue-200 focus:ring-blue-200 focus:opacity-50 sm:text-sm bg-gray-50 dark:bg-gray-600
            ${
              errors.GameID
                ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                : "border-blue-200 dark:border-blue-500"
            }
          `}
        />
        {errors.GameID && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-300">
            {errors.GameID}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className={`rounded-full px-4 py-2 transition duration-200 ease-in-out
          ${
            isLoading
              ? "bg-orange-300"
              : "bg-orange-300 hover:bg-orange-400 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
          }
        `}
      >
        {isLoading ? "Joining..." : "Join a game!"}
      </button>
    </form>
  );
}

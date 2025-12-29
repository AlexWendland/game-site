import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  FormEvent,
} from "react";

type UserContextType = {
  username: string | null;
  setUsername: (name: string) => void;
  clearUsername: () => void;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [username, setUsernameState] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<Record<
    string,
    FormDataEntryValue
  > | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("username");
    if (stored) setUsernameState(stored);
  }, []);

  const setUsername = (name: string) => {
    localStorage.setItem("username", name);
    setUsernameState(name);
  };

  const clearUsername = () => {
    localStorage.removeItem("username");
    setUsernameState(null);
  };

  const onSubmit = (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    const form = new FormData(formEvent.currentTarget);
    const data = Object.fromEntries(form.entries());
    setSubmitted(data);
    const name = data.username?.toString().trim();
    if (name && name.length >= 3) {
      setUsername(name);
    }
  };
  if (!username || username === undefined) {
    return (
      <>
        <div className="flex items-center justify-center min-h-screen">
          <form className="w-full max-w-xs space-y-4" onSubmit={onSubmit}>
            <div>
              <p className="text-lg font-medium mb-1">
                What be your name, matey?
              </p>
              <div className="space-y-4">
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  placeholder="Enter your username"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  minLength={3}
                />
                {submitted &&
                  submitted.username &&
                  (submitted.username as string).length < 3 && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      Username must be at least 3 characters long
                    </p>
                  )}
              </div>
            </div>
            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-200 hover:bg-blue-300 dark:bg-blue-700 hover:dark:bg-blue-600 hover:scale-105 rounded-lg font-medium transition-all"
            >
              Submit
            </button>
          </form>
        </div>
      </>
    );
  }

  return (
    <UserContext.Provider value={{ username, setUsername, clearUsername }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUserContext = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};

export const getUserName = (): string | null => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context.username;
};

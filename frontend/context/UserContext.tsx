import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  FormEvent,
} from "react";

import { Button, Form, Input } from "@heroui/react";

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
          <Form className="w-full max-w-xs space-y-4" onSubmit={onSubmit}>
            <div>
              <p className="text-lg font-medium mb-1">
                What be your name, matey?
              </p>
              <Input
                isRequired
                label="Username"
                labelPlacement="inside"
                name="username"
                placeholder="Enter your username"
                type="text"
                validate={(value) => {
                  if (value.length < 3) {
                    return "Username must be at least 3 characters long";
                  }
                }}
              />
            </div>
            <Button color="primary" type="submit">
              Submit
            </Button>
          </Form>
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

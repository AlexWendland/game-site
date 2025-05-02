"use client";

import { fetchBaseData } from "@/lib/apiCalls";
import { useEffect, useState } from "react";

export default function Home() {
  const [message, setMessage] = useState("Loading...");

  useEffect(() => {
    fetchBaseData()
      .then((data) => {
        console.log("Data fetched:", data);
        setMessage(data);
      })
      .catch((err) => {
        console.error("Failed to fetch:", err);
        setMessage("Failed to connect to backend");
      });
  }, []);

  return (
    <>
      <h1>Hello!</h1>
      <p>{message}</p>
    </>
  );
}

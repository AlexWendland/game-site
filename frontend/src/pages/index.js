'use client';

import { useEffect, useState } from "react";
import Link from "next/link";

export default function Home() {
  const [message, setMessage] = useState("Loading...");
  console.log("Backend URL:", process.env.NEXT_PUBLIC_BACKEND_URL);
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/`)
      .then((res) => res.json())
      .then((data) => {
        if (data.message) {
          setMessage(data.message);
        } else {
          setMessage("No message field in response");
        }
      })
      .catch((err) => {
        console.error("Failed to fetch:", err);
        setMessage("Failed to connect to backend");
      });
  }, []);

  return (
    <div>
      <p>Backend says: {message}</p>
      <Link href="/about">About</Link>
    </div>
  );
}

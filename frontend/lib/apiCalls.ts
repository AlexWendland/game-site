// Hack for now, as environment variables are not working in render
const BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "https://backend-87oq.onrender.com";

function apiUrl(path: string): string {
  return `${BASE_URL}${path}`;
}

interface BaseResponse {
  message: string;
}

export async function fetchBaseData(): Promise<string> {
  console.log(`BACKEND_URL: ${process.env.NEXT_PUBLIC_BACKEND_URL}`);
  const response = await fetch(apiUrl("/"));
  if (!response.ok) {
    throw new Error(`Error fetching data: ${response.statusText}`);
  }
  const data: BaseResponse = await response.json();
  if (data.message) {
    return data.message;
  }
  throw new Error("Unexpected response format");
}

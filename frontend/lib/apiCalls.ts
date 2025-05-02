const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

function apiUrl(path: string): string {
  return `${BASE_URL}${path}`;
}

interface BaseResponse {
  message: string;
}

export async function fetchBaseData<T>(): Promise<string> {
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

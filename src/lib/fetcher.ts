export class FetchError extends Error {
  info: unknown;
  status: number;
  constructor(message: string, info: unknown, status: number) {
    super(message);
    this.info = info;
    this.status = status;
  }
}

// Fetcher function for SWR that includes credentials and handles non-200 responses
export const fetcher = async (url: string) => {
  console.debug(`[Fetch Request] ${url}`);
  const startTime = performance.now();

  try {
    const res = await fetch(url, {
      credentials: "include",
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    const endTime = performance.now();
    console.debug(`[Fetch Response] ${url} - Status: ${res.status} - Time: ${Math.round(endTime - startTime)}ms`);

    if (!res.ok) {
      let errorInfo: unknown;
      try {
        errorInfo = await res.json();
      } catch {
        errorInfo = { message: 'Failed to parse error response' };
      }

      console.error(`[Fetch Error] ${url}:`, {
        status: res.status,
        info: errorInfo,
      });

      throw new FetchError(
        `Request failed with status ${res.status}`,
        errorInfo,
        res.status,
      );
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error(`[Fetch Error] ${url}:`, error);
    throw error;
  }
};

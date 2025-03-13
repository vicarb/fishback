export const fetcher = async (endpoint: string, options = {}) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, options);
    if (!res.ok) throw new Error("Failed to fetch data");
    return res.json();
  };
  
const API = import.meta.env.VITE_API_URL || '';
export async function request(path, body, signal) {
  const response = await fetch(`${API}/api/${path}`, {
    signal,
    ...(body
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      : {}),
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('The service is unavailable. Please try again.');
  }
  if (!response.ok)
    throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}

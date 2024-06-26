import { ResourceError } from "./errors";

/**
 * Fetches an ArrayBuffer from the specified URL.
 *
 * @param url - The URL to fetch the ArrayBuffer from.
 * @returns A promise that resolves to an ArrayBufferLike object.
 * @throws Will throw an error if the fetch response status is not 200.
 */
export async function fetchArrayBuffer(
  url: URL | string
): Promise<ArrayBufferLike> {
  const resp = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/octet-stream"
    }
  });

  if (resp.status < 200 || resp.status >= 300) {
    throw ResourceError.Not2xxResponse;
  }

  return resp.arrayBuffer();
}

/**
 * Fetches JSON data from the specified URL and optionally type-checks it.
 *
 * @param url - The URL to fetch the JSON from.
 * @param check - An optional type guard function to validate the JSON data.
 * @returns A promise that resolves to the JSON data of type T.
 * @throws Will throw an error if the fetch response status is not 200 or if
 * the type check fails.
 */
export async function fetchJSON<T>(
  url: URL | string,
  check?: (x: unknown) => x is T
): Promise<T> {
  const resp = await fetch(url, {
    headers: {
      Accept: "application/json"
    }
  });

  if (resp.status < 200 || resp.status >= 300) {
    throw ResourceError.Not2xxResponse;
  }

  const json = await resp.json();

  if (check) {
    if (!check(json)) throw ResourceError.FailedTypecheck;
    return json;
  }

  return json;
}

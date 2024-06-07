import { ResourceError } from "./error";

export async function fetchArrayBuffer(
  url: URL | string
): Promise<ArrayBufferLike> {
  const resp = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/octet-stream"
    }
  });

  if (resp.status != 200) {
    console.error(">>", resp.statusText);
    throw "fetch buffer NOT OK";
  }
  return resp.arrayBuffer();
}

export async function fetchJSON<T>(
  url: URL | string,
  check?: (x: unknown) => x is T
): Promise<T> {
  const resp = await fetch(url, {
    headers: {
      Accept: "application/json"
    }
  });

  if (resp.status != 200) throw "fetch json NOT OK";

  const json = await resp.json();

  if (check) {
    if (!check(json)) throw ResourceError.FailedTypecheck;
    return json;
  }

  return json;
}

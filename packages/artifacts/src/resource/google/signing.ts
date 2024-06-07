import { ResourceError } from "../error";
import { GoogleCloudStorageConfig, ResourceURL } from "../types";

export function signer(
  config: GoogleCloudStorageConfig
): (url: ResourceURL) => Promise<string> {
  const { signatory } = config;
  return async (url) => {
    const resp = await fetch(signatory, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: "query ($uri: URI!) { signedUrl(uri: $uri) }",
        variables: {
          uri: url
        }
      })
    });

    const json = (await resp.json()) ?? {};
    if (typeof json != "object") throw ResourceError.FailedTypecheck;

    const signedUrl = json?.data?.signedUrl;
    if (!signedUrl || typeof signedUrl != "string")
      throw ResourceError.FailedTypecheck;

    return signedUrl;
  };
}

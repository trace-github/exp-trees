/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Generated type guards for "types.ts".
 * WARNING: Do not manually change this file.
 */
import { LegacyTreeCatalog } from "./types";

export function isLegacyTreeCatalog(obj: unknown): obj is LegacyTreeCatalog {
  const typedObj = obj as LegacyTreeCatalog;
  return (
    ((typedObj !== null && typeof typedObj === "object") ||
      typeof typedObj === "function") &&
    typeof typedObj["customerId"] === "string" &&
    typeof typedObj["workspaceId"] === "string" &&
    Array.isArray(typedObj["metrics"]) &&
    typedObj["metrics"].every(
      (e: any) =>
        ((e !== null && typeof e === "object") || typeof e === "function") &&
        typeof e["groupId"] === "string" &&
        typeof e["label"] === "string" &&
        Array.isArray(e["tree"]) &&
        e["tree"].every(
          (e: any) =>
            ((e !== null && typeof e === "object") ||
              typeof e === "function") &&
            typeof e["treeId"] === "string" &&
            (e["type"] === "base" || e["type"] === "user-defined") &&
            typeof e["label"] === "string" &&
            typeof e["path"] === "string" &&
            typeof e["author"] === "string" &&
            Array.isArray(e["tags"]) &&
            e["tags"].every((e: any) => typeof e === "string") &&
            (typeof e["timeGrain"] === "undefined" ||
              typeof e["timeGrain"] === "string") &&
            Object.entries<any>(e)
              .filter(
                ([key]) =>
                  ![
                    "treeId",
                    "type",
                    "label",
                    "path",
                    "author",
                    "tags",
                    "timeGrain",
                  ].includes(key)
              )
              .every(([key, _value]) => typeof key === "string")
        ) &&
        (typeof e["hideInNavigation"] === "undefined" ||
          e["hideInNavigation"] === false ||
          e["hideInNavigation"] === true) &&
        Object.entries<any>(e)
          .filter(
            ([key]) =>
              !["groupId", "label", "tree", "hideInNavigation"].includes(key)
          )
          .every(([key, _value]) => typeof key === "string")
    )
  );
}

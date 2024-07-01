import { FixedSegmentDefinition } from "./series-definition";

export function isFixedSegmentDefinition(
  obj: unknown
): obj is FixedSegmentDefinition {
  const typedObj = obj as FixedSegmentDefinition;
  return (
    ((typedObj !== null && typeof typedObj === "object") ||
      typeof typedObj === "function") &&
    typedObj["name"] === "start"
  );
}

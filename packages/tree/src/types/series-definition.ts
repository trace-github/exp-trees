import { Attribute, AttributeValue } from "@trace/artifacts";

export type FixedSegmentDefinition = {
  name: "start";
};

export type SegmentDefinition = {
  name: Attribute;
  value: AttributeValue;
};

export type SeriesDefinition = (FixedSegmentDefinition | SegmentDefinition)[];

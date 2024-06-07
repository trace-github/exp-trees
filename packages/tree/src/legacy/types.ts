/** @see {isLegacyTreeCatalog} ts-auto-guard:type-guard */
export type LegacyTreeCatalog = {
  readonly customerId: string;
  readonly workspaceId: string;
  readonly metrics: {
    readonly groupId: string;
    readonly label: string;
    readonly tree: {
      readonly treeId: string;
      readonly type: "base" | "user-defined";
      readonly label: string;
      readonly path: string;
      readonly author: string;
      readonly tags: string[];
      readonly timeGrain?: string;
      [key: string]: unknown;
    }[];

    readonly hideInNavigation?: boolean;
    [key: string]: unknown;
  }[];
};

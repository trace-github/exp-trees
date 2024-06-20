import { CubeSeries } from "@trace/artifacts";
import { compareAsc } from "date-fns";
import { Observable, combineLatest, defer, map } from "rxjs";
import { sampleCorrelation } from "simple-statistics";
import {
  ComparisonResult,
  CorrelationAnalysisType,
  EdgeId,
  EdgeType,
  Subtree,
  Tree,
  ValueFormat
} from "../../types";
import { AnalysisError } from "../errors";
import { edgeData } from "../utils";

export function correlationEdgeAttributes(
  tree: Tree<CubeSeries> | Subtree<CubeSeries>,
  edge: EdgeId,
  config$: Observable<[Date, Date]>
): {
  type: EdgeType.Analysis;
  analysis: CorrelationAnalysisType.Correlation;
  data: Observable<ComparisonResult<number>>;
} {
  const {
    sourceAttributes: { data: source$ },
    targetAttributes: { data: target$ }
  } = edgeData(tree, edge);

  if (source$ == undefined) throw AnalysisError.InvalidSeries;
  if (target$ == undefined) throw AnalysisError.InvalidSeries;

  const data$ = combineLatest({
    config: config$,
    source: source$,
    target: target$
  }).pipe(
    map(({ config, source, target }) => {
      const [start, end] = config.sort(compareAsc);

      const [sourceValues, targetValues] = [source, target].map((series) =>
        [...series].filter(
          (r) =>
            r && r.a.start && r.value && r.a.start >= start && r.a.start <= end
        )
      );

      // Reduce each series by only including dates what exist in each series.
      const existingSourceDates = new Set(
        sourceValues.map((r) => r.a.start.getTime())
      );
      const existingTargetDates = new Set(
        targetValues.map((r) => r.a.start.getTime())
      );
      const reducedSourceValues = sourceValues.filter((r) =>
        existingTargetDates.has(r.a.start.getTime())
      );
      const reducedTargetValues = targetValues.filter((r) =>
        existingSourceDates.has(r.a.start.getTime())
      );

      if (reducedSourceValues.length !== reducedTargetValues.length) {
        throw AnalysisError.MalformedSeries;
      }

      if (reducedSourceValues.length < 2) {
        return {
          before: config[0],
          after: config[1],
          value: null,
          format: ValueFormat.Decimal
        };
      }

      const value = sampleCorrelation(
        reducedSourceValues.map((r) => Number(r.value)),
        reducedTargetValues.map((r) => Number(r.value))
      );

      return {
        before: config[0],
        after: config[1],
        value,
        format: ValueFormat.Decimal
      };
    })
  );

  return {
    type: EdgeType.Analysis,
    analysis: CorrelationAnalysisType.Correlation,
    data: defer(() => data$)
  };
}

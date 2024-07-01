import { Observable, of } from "rxjs";
import { Row } from "./types";

export const EmptyRow: Row = {};

export const EmptyRow$: Observable<Row> = of(EmptyRow);

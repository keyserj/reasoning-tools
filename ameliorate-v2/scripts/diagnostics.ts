// Where a line sat in the source is a fact about the syntax, not about the ontology, so a line
// number lives here and nowhere in ./model.ts.

export interface ParseError {
  /** 1-based line number in the source */
  line: number;
  message: string;
}

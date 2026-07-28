export const sample = `? How should we handle session storage? &q1
  = Use Redis &i1
    + Fast, battle-tested
    - Another service to operate &c1
      - We have many services already, we're efficient at setting up another one
  = Use Postgres rows &i2
    + One less dependency
    - Slower for hot reads
? How do we run background jobs? &q2
  = Use a worker queue
    / this line is a meta-comment that doesn't show up in mermaid; the next ~ line is a note
    ~ worker queues hit the same operational cost
    - $c1
    ? Which broker? &q3
`;

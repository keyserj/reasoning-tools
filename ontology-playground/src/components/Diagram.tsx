import { memo, useId, useMemo } from "react";
import type { Label, LaidOutEdge, LaidOutNode } from "../diagram/layout.ts";
import { LABEL_CLASS } from "../diagram/measure.ts";
import { type TypeStyle, deriveTypeStyle } from "../ontology/typeColors.ts";
import type { Theme, TypeTables } from "../ontology/types.ts";

// The picture inside the pane's pan/zoom viewport: edges, then their labels, then boxes, so lines
// sit under what they end on. Paint that doesn't depend on a type lives in ./Diagram.css.

interface Props {
  nodes: LaidOutNode[];
  edges: LaidOutEdge[];
  types: TypeTables;
  typeColors: Record<string, string>;
  theme: Theme;
  activeLine: number | null;
  /** Off while the picture is out of date with the text: its lines no longer point anywhere. */
  linked: boolean;
}

/** Room around a label, so a subpixel rounding of its box can't make it wrap differently. */
const LABEL_SLACK = 2;

function LabelBox({ label, className = "" }: { label: Label; className?: string }) {
  return (
    <foreignObject
      x={label.x - label.width / 2 - LABEL_SLACK}
      y={label.y - label.height / 2 - LABEL_SLACK}
      width={label.width + 2 * LABEL_SLACK}
      height={label.height + 2 * LABEL_SLACK}
    >
      <div className="diagram-label-slot">
        <div className={`${LABEL_CLASS} ${className}`}>{label.text}</div>
      </div>
    </foreignObject>
  );
}

function Diagram({ nodes, edges, types, typeColors, theme, activeLine, linked }: Props) {
  const markerPrefix = `arrow-${useId().replace(/[^A-Za-z0-9_-]/g, "")}`;

  const styles = useMemo(() => {
    const byType = new Map<string, TypeStyle>();
    for (const [type, color] of Object.entries(typeColors)) {
      byType.set(type, deriveTypeStyle(color, theme));
    }
    return byType;
  }, [typeColors, theme]);

  const edgeColor = useMemo(() => {
    const byEdgeType = new Map<string, string>();
    for (const def of types.renderedEdgeTypes) {
      const border = def.colorTypeId ? styles.get(def.colorTypeId)?.border : undefined;
      if (border) byEdgeType.set(def.id, border);
    }
    return byEdgeType;
  }, [types, styles]);

  // A marker paints with its own ancestors' styles, not the referencing path's, so each connector
  // color needs a marker of its own.
  const markerColors = [...new Set(edges.flatMap((edge) => edgeColor.get(edge.type) ?? []))];
  const markerFor = (edge: LaidOutEdge) => {
    if (edge.connector === "line") return undefined;
    const color = edgeColor.get(edge.type);
    return `url(#${markerPrefix}${color === undefined ? "" : `-${markerColors.indexOf(color)}`})`;
  };

  /** Classes and the click target shared by everything an element of the document drew. */
  const linking = (base: string, lines: number[]) => {
    const isLinked = linked && lines.length > 0;
    const isActive = isLinked && activeLine !== null && lines.includes(activeLine);
    return {
      className: `${base}${isLinked ? " is-linked" : ""}${isActive ? " is-active" : ""}`,
      "data-line": isLinked ? lines[0] : undefined,
    };
  };

  return (
    <>
      <defs>
        {[undefined, ...markerColors].map((color, i) => (
          <marker
            key={color ?? ""}
            id={color === undefined ? markerPrefix : `${markerPrefix}-${i - 1}`}
            className="diagram-arrow"
            viewBox="0 0 10 10"
            refX={5}
            refY={5}
            markerUnits="userSpaceOnUse"
            markerWidth={8}
            markerHeight={8}
            orient="auto"
          >
            <path d="M0,0L10,5L0,10Z" style={color === undefined ? undefined : { fill: color }} />
          </marker>
        ))}
      </defs>

      {edges.map((edge, i) => {
        const color = edgeColor.get(edge.type);
        return (
          <path
            key={i}
            {...linking(
              `diagram-edge is-${edge.connector}${color ? " is-colored" : ""}`,
              edge.lines,
            )}
            d={edge.path}
            style={color ? { stroke: color } : undefined}
            markerEnd={markerFor(edge)}
          />
        );
      })}

      {/* A labeled connector's midpoint is its label, not the 1.5px path, so the label links too. */}
      {edges.map(
        (edge, i) =>
          edge.label && (
            <g key={i} {...linking("diagram-edge-label", edge.lines)}>
              <LabelBox label={edge.label} className="diagram-edge-label-text" />
            </g>
          ),
      )}

      {nodes.map((node, i) => {
        const style = styles.get(node.type);
        return (
          <g
            key={i}
            {...linking(`diagram-node${node.dashed ? " is-dashed" : ""}`, node.lines)}
            style={style ? { color: style.text } : undefined}
          >
            <path
              d={node.path}
              style={style ? { fill: style.fill, stroke: style.border } : undefined}
            />
            {node.bars && (
              <path
                className="diagram-node-bars"
                d={node.bars}
                style={style ? { stroke: style.border } : undefined}
              />
            )}
            <LabelBox label={node.label} />
          </g>
        );
      })}
    </>
  );
}

export default memo(Diagram);

import React, { useMemo, useRef, useState } from "react";
import {
  forceCollide,
  forceSimulation,
  forceX,
  forceY,
  hierarchy,
  pack,
  scaleLinear,
  timeDay,
} from "d3";
import { FileType } from "./types";
import countBy from "lodash/countBy";
import maxBy from "lodash/maxBy";
import entries from "lodash/entries";
import uniqBy from "lodash/uniqBy";
import flatten from "lodash/flatten";
// file colors are from the github/linguist repo
import fileColors from "./language-colors.json";
import { CircleText } from "./CircleText";
import {
  keepBetween,
  keepCircleInsideCircle,
  truncateString,
} from "./utils";

type Props = {
  data: FileType;
  filesChanged: string[];
};
type ExtendedFileType = {
  extension?: string;
  pathWithoutExtension?: string;
  label?: string;
  color?: string;
  value?: number;
  sortOrder?: number;
} & FileType;
type ProcessedDataItem = {
  data: ExtendedFileType;
  depth: number;
  height: number;
  r: number;
  x: number;
  y: number;
  parent: ProcessedDataItem | null;
  children: Array<ProcessedDataItem>;
};
const colorThemes = ["file", "changes", "last-change"];
const colorTheme = "file";
const looseFilesId = "__structure_loose_file__";
const width = 1000;
const height = 1000;
export const Tree = ({ data, filesChanged = [], maxDepth = 9 }: Props) => {
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const cachedPositions = useRef<{ [key: string]: [number, number] }>({});
  const cachedOrders = useRef<{ [key: string]: string[] }>({});

  const getColor = (d) => {
    if (colorTheme === "file") {
      const isParent = d.children;
      if (isParent) {
        const extensions = countBy(d.children, (c) => c.extension);
        const mainExtension = maxBy(entries(extensions), ([k, v]) => v)?.[0];
        return fileColors[mainExtension] || "#CED6E0";
      }
      return fileColors[d.extension] || "#CED6E0";
    } else if (colorTheme === "changes") {
      const scale = scaleLinear()
        .domain([0, 50])
        .range(["#f4f4f4", "#0fb9b1"]).clamp(true);
      const numberOfChanges = d?.commits?.length;
      return scale(numberOfChanges);
    } else if (colorTheme === "last-change") {
      const scale = scaleLinear()
        .domain([timeDay.offset(new Date(), -100), new Date()])
        .range(["#f4f4f4", "#0fb9b1"]).clamp(true);
      const lastChangeDate = new Date(d?.commits?.[0]?.date);
      return scale(lastChangeDate) || "#fff";
    }
  };

  const packedData = useMemo(() => {
    const hierarchicalData = hierarchy(
      processChild(data, getColor, cachedOrders.current),
    ).sum((d) => d.value)
      .sort((a, b) => {
        if (b.data.path.startsWith("src/fonts")) {
          //   a.data.sortOrder,
          //   b.data.sortOrder,
          //   (b.data.sortOrder - a.data.sortOrder) ||
          //     (b.data.name > a.data.name ? 1 : -1),
          //   a,
          //   b,
          // );
        }
        return (b.data.sortOrder - a.data.sortOrder) ||
          (b.data.name > a.data.name ? 1 : -1);
      });

    let packedTree = pack()
      .size([width, height * 1.3]) // we'll reflow the tree to be more horizontal, but we want larger bubbles (.pack() sizes the bubbles to fit the space)
      .padding((d) => {
        if (d.depth <= 0) return 0;
        const hasChildWithNoChildren = d.children.filter((d) =>
          !d.children?.length
        ).length > 1;
        if (hasChildWithNoChildren) return 5;
        return 11;
        // const hasChildren = !!d.children?.find((d) => d?.children?.length);
        // return hasChildren ? 60 : 8;
        // return [60, 20, 12][d.depth] || 5;
      })(hierarchicalData);
    packedTree.children = reflowSiblings(
      packedTree.children,
      cachedPositions.current,
    );
    const children = packedTree.descendants() as ProcessedDataItem[];

    cachedOrders.current = {};
    cachedPositions.current = {};
    const saveCachedPositionForItem = (item) => {
      cachedOrders.current[item.data.path] = item.data.sortOrder;
      if (item.children) {
        item.children.forEach(saveCachedPositionForItem);
      }
    };
    saveCachedPositionForItem(packedTree);
    children.forEach((d) => {
      cachedPositions.current[d.data.path] = [d.x, d.y];
    });

    return children;
  }, [data]);

  const selectedNode = selectedNodeId &&
    packedData.find((d) => d.data.path === selectedNodeId);

  const fileTypes = uniqBy(
    packedData.map((d) => fileColors[d.data.extension] && d.data.extension),
  ).sort().filter(Boolean);

  const imports = flatten(
    packedData.map(({ x, y, r, depth, children, data }) => (
      data?.imports?.map((im) => {
        if (depth <= 0) return null;
        if (depth > maxDepth) return null;
        const isParent = !!children && depth !== maxDepth;
        if (isParent) return;
        if (data.path === looseFilesId) return null;
        if (!im.moduleName) return;
        const isExternal = im.moduleName.startsWith("lib/");
        const originNode = isExternal
          ? null
          : packedData.find((d) =>
            (d.data.pathWithoutExtension === im.moduleName ||
              d.data.path === im.moduleName) && !d?.children
          );
        if (!originNode) return;
        let start = [originNode.x - x, originNode.y - y];
        // const angle = getAngleFromPosition(...start);
        // const end = [0, 0];
        const end = Math.abs(start[0]) < 5
          ? [
            0,
            Math.min(Math.abs(start[1]), r) * (start[1] > 0 ? 1 : -1),
          ]
          : [
            // Math.min(Math.abs(start[1]), r) * (start[1] > 0 ? 1 : -1),
            0,
            Math.min(Math.abs(start[1]), r) * (start[1] > 0 ? 1 : -1),
          ];
        if (
          ![data.path, originNode.data.path].find((d) =>
            d === selectedNodeId || d.includes(selectedNodeId)
          )
        ) {
          return;
        }
        if (!start[0]) {
          start[1] += 100;
        } else {
          start[0] += Math.min(Math.abs(start[0]), originNode.r) *
            (start[0] > 0 ? -1 : 1);
        }
        const d = [
          "M",
          start[0],
          start[1],
          "Q",
          end[0],
          start[1],
          end[0],
          end[1],
        ].join(" ");
        return {
          x,
          y,
          r,
          d,
          path: data.path,
          toPath: originNode.data.path,
          color: data.color,
        };
      }).filter(Boolean)
    )),
  ).filter(Boolean);
  // console.log(packedData)

  return (
    <svg
      width={width}
      height={height}
      style={{
        background: "white",
        fontFamily: "sans-serif",
        overflow: "visible",
      }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {packedData.map(({ x, y, r, depth, data, children }) => {
        if (depth <= 0) return null;
        if (depth > maxDepth) return null;
        const isParent = !!children && depth !== maxDepth;
        let runningR = r;
        // if (depth <= 1 && !children) runningR *= 3;
        if (data.path === looseFilesId) return null;
        const isHighlighted = filesChanged.includes(data.path);
        const doHighlight = !!filesChanged.length;
        const isInActiveImport = !!imports.find((i) =>
          i.path === data.path || i.toPath === data.path
        );

        return (
          <g
            key={data.path}
            // className="transition-all duration-300"
            style={{
              fill: doHighlight
                ? isHighlighted ? "#FCE68A" : "#29081916"
                : data.color,
              transition: `transform ${isHighlighted ? "0.5s" : "0s"
                } ease-out, fill 0.1s ease-out`,
              // opacity: doHighlight && !isHighlighted ? 0.6 : 1,
            }}
            transform={`translate(${x}, ${y})`}
            onMouseEnter={() => {
              console.log(data);
            }}
            onMouseMove={() => {
              setSelectedNodeId(data.path);
            }}
            onMouseLeave={() => {
              setSelectedNodeId(null);
            }}
          >
            {isParent
              ? (
                <circle
                  r={r}
                  style={{ transition: "all 0.5s ease-out" }}
                  stroke="#290819"
                  opacity="0.2"
                  strokeWidth="1"
                  fill="none"
                // className={`${
                //   depth % 2 ? "text-gray-100" : "text-white"
                // } fill-current`}
                // // stroke="#37415122"
                />
              )
              : (
                <circle
                  style={{
                    filter: isHighlighted ? "url(#glow)" : undefined,
                    transition: "all 0.5s ease-out",
                  }}
                  r={runningR}
                  strokeWidth={selectedNodeId === data.path ? 3 : 0}
                  stroke="#374151"
                />
              )}
          </g>
        );
      })}

      {packedData.map(({ x, y, r, depth, data, children }) => {
        if (depth <= 0) return null;
        if (depth > maxDepth) return null;
        const isParent = !!children && depth !== maxDepth;
        let runningR = r;
        // if (depth <= 1 && !children) runningR *= 3;
        if (data.path === looseFilesId) return null;
        const isHighlighted = filesChanged.includes(data.path);
        const doHighlight = !!filesChanged.length;
        const isInActiveImport = !!imports.find((i) =>
          i.path === data.path || i.toPath === data.path
        );
        if (isParent) return null
        if (!(isHighlighted
          || ((!doHighlight && !selectedNode) && r > 30)
          || isInActiveImport)
        ) return null

        return (
          <g
            key={data.path}
            // className="transition-all duration-300"
            style={{
              fill: doHighlight
                ? isHighlighted ? "#FCE68A" : "#29081916"
                : data.color,
              transition: `transform ${isHighlighted ? "0.5s" : "0s"
                } ease-out, fill 0.1s ease-out`,
              // opacity: doHighlight && !isHighlighted ? 0.6 : 1,
            }}
            transform={`translate(${x}, ${y})`}
          >

            <text
              style={{
                pointerEvents: "none",
                opacity: 0.9,
                fontSize: "14px",
                fontWeight: 500,
                transition: "all 0.5s ease-out",
              }}
              fill="#4B5563"
              textAnchor="middle"
              dominantBaseline="middle"
              stroke="white"
              strokeWidth="3"
              strokeLinejoin="round"
            >
              {data.label}
            </text>
            <text
              style={{
                pointerEvents: "none",
                opacity: 1,
                fontSize: "14px",
                fontWeight: 500,
                transition: "all 0.5s ease-out",
              }}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {data.label}
            </text>
            <text
              style={{
                pointerEvents: "none",
                opacity: 0.9,
                fontSize: "14px",
                fontWeight: 500,
                mixBlendMode: "color-burn",
                transition: "all 0.5s ease-out",
              }}
              fill="#110101"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {data.label}
            </text>
          </g>
        );
      })}

      {imports.map(({ x, y, d, path, toPath, color }) => {
        return (
          <g
            style={{
              fill: color,
              transition: "all 0.5s ease-out",
            }}
            transform={`translate(${x}, ${y})`}
            key={[path, toPath].join("--")}
          >
            <g
              style={{ cursor: "pointer", transition: "all 0.5s ease-out" }}
            >
              <path
                d={d}
                fill="none"
                strokeWidth="3"
                stroke="#1F2937"
                style={{ opacity: 0.3, transition: "all 0.5s ease-out" }}
              />
              <path
                d={d}
                fill="none"
                strokeWidth="3"
                stroke="#1F2937"
                style={{ opacity: 0.3, transition: "all 0.5s ease-out" }}
                className="flowing"
              />
            </g>
          </g>
        );
      })}
      {packedData.map(({ x, y, r, depth, data, children }) => {
        if (depth <= 0) return null;
        if (depth > maxDepth) return null;
        const isParent = !!children && depth !== maxDepth;
        if (!isParent) return null;
        if (data.path === looseFilesId) return null;
        if (r < 10 && selectedNodeId !== data.path) return null;
        return (
          <g
            key={data.path}
            style={{ pointerEvents: "none", transition: "all 0.5s ease-out" }}
            transform={`translate(${x}, ${y})`}
          >
            <CircleText
              style={{ fontSize: "14px", transition: "all 0.5s ease-out" }}
              r={Math.max(20, r - 3)}
              fill="#374151"
              stroke="white"
              strokeWidth="6"
              text={data.label}
            />
            <CircleText
              style={{ fontSize: "14px", transition: "all 0.5s ease-out" }}
              fill="#374151"
              r={Math.max(20, r - 3)}
              text={data.label}
            />
          </g>
        );
      })}

      {!!selectedNode &&
        (!selectedNode.children || selectedNode.depth === maxDepth) && (
          <g transform={`translate(${selectedNode.x}, ${selectedNode.y})`}>
            <text
              style={{
                pointerEvents: "none",
                fontSize: "14px",
                fontWeight: 500,
                transition: "all 0.5s ease-out",
              }}
              stroke="white"
              strokeWidth="3"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {selectedNode.data.label}
            </text>
            <text
              style={{
                pointerEvents: "none",
                fontSize: "14px",
                fontWeight: 500,
                transition: "all 0.5s ease-out",
              }}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {selectedNode.data.label}
            </text>
          </g>
        )}
      {!filesChanged.length && <Legend fileTypes={fileTypes} />}
    </svg>
  );
};

const Legend = ({ fileTypes = [] }) => {
  return (
    <g
      transform={`translate(${width - 80}, ${height - fileTypes.length * 15 -
        20})`}
    >
      {fileTypes.map((extension, i) => (
        <g key={i} transform={`translate(0, ${i * 15})`}>
          <circle
            r="5"
            fill={fileColors[extension]}
          />
          <text
            x="10"
            style={{ fontSize: "14px", fontWeight: 300 }}
            dominantBaseline="middle"
          >
            .{extension}
          </text>
        </g>
      ))}
      <div
        className="w-20 whitespace-nowrap text-sm text-gray-500 font-light italic"
      >
        each dot sized by file size
      </div>
    </g>
  );
};

const processChild = (
  child: FileType,
  getColor,
  cachedOrders,
  i = 0,
): ExtendedFileType => {
  if (!child) return;
  const isRoot = !child.path;
  let name = child.name;
  let path = child.path;
  let children = child?.children?.map((c, i) =>
    processChild(c, getColor, cachedOrders, i)
  );
  if (children?.length === 1) {
    name = `${name}/${children[0].name}`;
    path = children[0].path;
    children = children[0].children;
  }
  const pathWithoutExtension = path?.split(".").slice(0, -1).join(".");
  const extension = name?.split(".").slice(-1)[0];
  const hasExtension = !!fileColors[extension];

  if (isRoot && children) {
    const looseChildren = children?.filter((d) => !d.children?.length);
    children = [
      ...children?.filter((d) => d.children?.length),
      {
        name: looseFilesId,
        path: looseFilesId,
        size: 0,
        children: looseChildren,
      },
    ];
  }

  let extendedChild = {
    ...child,
    name,
    path,
    label: truncateString(name, 13),
    extension,
    pathWithoutExtension,

    value:
      (["woff", "woff2", "ttf", "png", "jpg", "svg"].includes(extension)
        ? 100
        : // I'm sick of these fonts
        Math.min(
          15000,
          hasExtension ? child.size : Math.min(child.size, 9000),
        )) + i, // stupid hack to stabilize circle order/position
    color: "#fff",
    children,
  };
  extendedChild.color = getColor(extendedChild);
  extendedChild.sortOrder = getSortOrder(extendedChild, cachedOrders, i);

  return extendedChild;
};

const reflowSiblings = (
  siblings: ProcessedDataItem[],
  cachedPositions: Record<string, [number, number]> = {},
  parentRadius?: number,
  parentPosition?: [number, number],
) => {
  if (!siblings) return;
  let items = [...siblings.map((d) => {
    return {
      ...d,
      x: cachedPositions[d.data.path]?.[0] || d.x,
      y: cachedPositions[d.data.path]?.[1] || d.y,
      originalX: d.x,
      originalY: d.y,
    };
  })];
  const paddingScale = scaleLinear().domain([4, 1]).range([2, 10]).clamp(true);
  let simulation = forceSimulation(items)
    .force(
      "centerX",
      forceX(width / 2).strength(items[0].depth <= 2 ? 0.01 : 0),
    )
    .force(
      "centerY",
      forceY(height / 2).strength(items[0].depth <= 2 ? 0.05 : 0),
    )
    .force(
      "centerX2",
      forceX(parentPosition?.[0]).strength(parentPosition ? 0.5 : 0),
    )
    .force(
      "centerY2",
      forceY(parentPosition?.[1]).strength(parentPosition ? 0.5 : 0),
    )
    .force(
      "x",
      forceX((d) => cachedPositions[d.data.path]?.[0] || width / 2).strength(
        (d) => cachedPositions[d.data.path]?.[1] ? 0.5 : 0.2,
      ),
    )
    .force(
      "y",
      forceY((d) => cachedPositions[d.data.path]?.[1] || height / 2).strength(
        (d) => cachedPositions[d.data.path]?.[0] ? 0.5 : 0.1,
      ),
    )
    .force(
      "collide",
      forceCollide((d) => d.children ? d.r + paddingScale(d.depth) : d.r + 2)
        .iterations(9).strength(1),
    )
    .stop();

  for (let i = 0; i < 290; i++) {
    simulation.tick();
    items.forEach((d) => {
      d.x = keepBetween(d.r, d.x, width - d.r);
      d.y = keepBetween(d.r + 30, d.y, height - d.r);

      if (parentPosition && parentRadius) {
        // keep within radius
        const containedPosition = keepCircleInsideCircle(
          parentRadius,
          parentPosition,
          d.r,
          [d.x, d.y],
        );
        d.x = containedPosition[0];
        d.y = containedPosition[1];
      }
    });
  }
  // setTimeout(() => simulation.stop(), 100);
  const repositionChildren = (d, xDiff, yDiff) => {
    let newD = { ...d };
    newD.x += xDiff;
    newD.y += yDiff;
    if (newD.children) {
      newD.children = newD.children.map((c) =>
        repositionChildren(c, xDiff, yDiff)
      );
    }
    return newD;
  };
  for (const item of items) {
    const itemCachedPosition = cachedPositions[item.data.path] ||
      [item.x, item.y];
    const itemPositionDiffFromCached = [
      item.x - itemCachedPosition[0],
      item.y - itemCachedPosition[1],
    ];

    if (item.children) {
      let repositionedCachedPositions = { ...cachedPositions };
      const itemReflowDiff = [
        item.x - item.originalX,
        item.y - item.originalY,
      ];

      item.children = item.children.map((child) =>
        repositionChildren(
          child,
          itemReflowDiff[0],
          itemReflowDiff[1],
        )
      );
      if (item.children.length > 4) {
        // if (item.depth > 5) return;
        item.children.forEach((child) => {
          // move cached positions with the parent
          const childCachedPosition =
            repositionedCachedPositions[child.data.path];
          if (childCachedPosition) {
            repositionedCachedPositions[child.data.path] = [
              childCachedPosition[0] + itemPositionDiffFromCached[0],
              childCachedPosition[1] + itemPositionDiffFromCached[1],
            ];
          } else {
            // const diff = getPositionFromAngleAndDistance(100, item.r);
            repositionedCachedPositions[child.data.path] = [
              child.x,
              child.y,
            ];
          }
        });
        item.children = reflowSiblings(
          item.children,
          repositionedCachedPositions,
          item.r,
          [item.x, item.y],
        );
      }
    }
  }
  return items;
};

const getSortOrder = (item: ExtendedFileType, cachedOrders, i = 0) => {
  if (cachedOrders[item.path]) return cachedOrders[item.path];
  if (cachedOrders[item.path?.split("/")?.slice(0, -1)?.join("/")]) {
    return -100000000;
  }
  if (item.name === "public") return -1000000;
  // if (item.depth <= 1 && !item.children) {
  //   // item.value *= 0.33;
  //   return item.value  * 100;
  // }
  // if (item.depth <= 1) return -10;
  return item.value + -i;
  // return b.value - a.value;
};

const transformIn = {
  visible: { transform: "scale(1)", transition: { duration: 0.5 } },
  hidden: { transform: "scale(0)", transition: { duration: 0.5 } },
};

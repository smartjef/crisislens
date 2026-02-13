import React from "react";

const passthrough = (Tag = "div") => ({ children, className = "", style = {}, ...props }) => (
  <Tag className={className} style={style} {...props}>
    {children}
  </Tag>
);

export const ResponsiveContainer = ({ width = "100%", height = 200, children }) => (
  <div style={{ width, height }}>{children}</div>
);

export const LineChart = passthrough();
export const BarChart = passthrough();
export const AreaChart = passthrough();
export const PieChart = passthrough();

export const Line = passthrough();
export const Bar = passthrough();
export const Area = passthrough();
export const Pie = passthrough();
export const Cell = passthrough("span");

export const XAxis = () => null;
export const YAxis = () => null;
export const CartesianGrid = () => null;
export const Tooltip = () => null;
export const Legend = () => null;

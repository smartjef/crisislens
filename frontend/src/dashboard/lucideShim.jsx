import React from "react";

const makeIcon = (name) => {
  const Icon = ({ className = "w-4 h-4" }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-label={name}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12h8" />
    </svg>
  );
  Icon.displayName = name;
  return Icon;
};

export const AlertTriangle = makeIcon("AlertTriangle");
export const MapPin = makeIcon("MapPin");
export const TrendingUp = makeIcon("TrendingUp");
export const Users = makeIcon("Users");
export const FileText = makeIcon("FileText");
export const Settings = makeIcon("Settings");
export const BarChart3 = makeIcon("BarChart3");
export const Menu = makeIcon("Menu");
export const Bell = makeIcon("Bell");
export const Search = makeIcon("Search");
export const Download = makeIcon("Download");
export const Filter = makeIcon("Filter");
export const RefreshCw = makeIcon("RefreshCw");
export const Map = makeIcon("Map");
export const Droplets = makeIcon("Droplets");
export const Thermometer = makeIcon("Thermometer");
export const ChevronRight = makeIcon("ChevronRight");
export const CheckCircle = makeIcon("CheckCircle");
export const Clock = makeIcon("Clock");
export const X = makeIcon("X");
export const Save = makeIcon("Save");
export const Shield = makeIcon("Shield");
export const User = makeIcon("User");
export const Globe = makeIcon("Globe");
export const Database = makeIcon("Database");
export const Mail = makeIcon("Mail");
export const Phone = makeIcon("Phone");
export const Building = makeIcon("Building");
export const Eye = makeIcon("Eye");
export const EyeOff = makeIcon("EyeOff");
export const Printer = makeIcon("Printer");

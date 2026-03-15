import type { GroupColor } from "@/db";

export const GROUP_COLORS: GroupColor[] = [
  "blue",
  "purple",
  "green",
  "orange",
  "pink",
  "gray",
];

export const colorStyles: Record<
  GroupColor,
  { border: string; bg: string; dot: string; label: string }
> = {
  blue: {
    border: "border-blue-400 dark:border-blue-600",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    dot: "bg-blue-400",
    label: "Blue",
  },
  purple: {
    border: "border-purple-400 dark:border-purple-600",
    bg: "bg-purple-50 dark:bg-purple-950/40",
    dot: "bg-purple-400",
    label: "Purple",
  },
  green: {
    border: "border-green-400 dark:border-green-600",
    bg: "bg-green-50 dark:bg-green-950/40",
    dot: "bg-green-400",
    label: "Green",
  },
  orange: {
    border: "border-orange-400 dark:border-orange-600",
    bg: "bg-orange-50 dark:bg-orange-950/40",
    dot: "bg-orange-400",
    label: "Orange",
  },
  pink: {
    border: "border-pink-400 dark:border-pink-600",
    bg: "bg-pink-50 dark:bg-pink-950/40",
    dot: "bg-pink-400",
    label: "Pink",
  },
  gray: {
    border: "border-gray-400 dark:border-gray-600",
    bg: "bg-gray-50 dark:bg-gray-900/60",
    dot: "bg-gray-400",
    label: "Gray",
  },
};

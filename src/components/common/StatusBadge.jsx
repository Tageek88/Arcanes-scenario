import React from "react";

const STATUS_STYLES = {
  brouillon: {
    bg: "bg-gray-100",
    text: "text-gray-800",
    border: "border-gray-200",
  },
  joue: {
    bg: "bg-green-100",
    text: "text-green-800",
    border: "border-green-200",
  },
  clef: {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    border: "border-yellow-200",
  },
};

export default function StatusBadge({ status }) {
  const styles = STATUS_STYLES[status] || STATUS_STYLES.brouillon;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles.bg} ${styles.text} ${styles.border}`}
    >
      {status}
    </span>
  );
}

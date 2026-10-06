import React, { createContext, useContext, useMemo, useState } from "react";

const ExpandedCardContext = createContext({ expandedCardId: null, setExpandedCardId: () => {} });

export function ExpandedCardProvider({ children }) {
  const [expandedCardId, setExpandedCardId] = useState(null);
  const value = useMemo(() => ({ expandedCardId, setExpandedCardId }), [expandedCardId]);
  return <ExpandedCardContext.Provider value={value}>{children}</ExpandedCardContext.Provider>;
}

export function useExpandedCard(cardId) {
  const context = useContext(ExpandedCardContext);
  const expanded = context.expandedCardId === cardId;
  return {
    expanded,
    cardProps: {
      "data-expandable-card": cardId,
      "aria-expanded": expanded,
      tabIndex: 0,
      onClick: (event) => {
        if (event.target.closest("button, a, input, select, textarea, [role='button']")) return;
        context.setExpandedCardId((current) => current === cardId ? null : cardId);
      },
      onKeyDown: (event) => {
        if ((event.key === "Enter" || event.key === " ") && event.target === event.currentTarget) {
          event.preventDefault();
          context.setExpandedCardId((current) => current === cardId ? null : cardId);
        }
      },
    },
    setExpanded: (next) => context.setExpandedCardId(next ? cardId : null),
  };
}

export function useExpandedCardState() {
  return useContext(ExpandedCardContext);
}

import React, { createContext, useContext, useRef } from 'react';

// Lightweight tabs primitive following the WAI-ARIA tabs pattern (the same
// tablist/tab/tabpanel + roving tabindex shape shadcn's Tabs uses), without
// pulling in Radix or Tailwind.

const TabsContext = createContext(null);

export const Tabs = ({ value, onValueChange, children, className = '' }) => (
  <TabsContext.Provider value={{ value, onValueChange }}>
    <div className={className}>{children}</div>
  </TabsContext.Provider>
);

export const TabsList = ({ children, className = '', 'aria-label': ariaLabel }) => {
  const listRef = useRef(null);

  const handleKeyDown = (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const triggers = Array.from(listRef.current.querySelectorAll('[role="tab"]'));
    const currentIndex = triggers.indexOf(document.activeElement);
    if (currentIndex === -1) return;

    let nextIndex = currentIndex;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % triggers.length;
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + triggers.length) % triggers.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = triggers.length - 1;

    event.preventDefault();
    triggers[nextIndex].focus();
    triggers[nextIndex].click();
  };

  return (
    <div ref={listRef} role="tablist" aria-label={ariaLabel} className={className} onKeyDown={handleKeyDown}>
      {children}
    </div>
  );
};

export const TabsTrigger = ({ value: tabValue, children, className = '' }) => {
  const { value, onValueChange } = useContext(TabsContext);
  const isActive = value === tabValue;

  return (
    <button
      type="button"
      role="tab"
      id={`tab-${tabValue}`}
      aria-selected={isActive}
      aria-controls={`panel-${tabValue}`}
      tabIndex={isActive ? 0 : -1}
      className={`${className} ${isActive ? 'is-active' : ''}`.trim()}
      onClick={() => onValueChange(tabValue)}
    >
      {children}
    </button>
  );
};

export const TabsPanel = ({ value: panelValue, children }) => {
  const { value } = useContext(TabsContext);
  if (value !== panelValue) return null;

  return (
    <div role="tabpanel" id={`panel-${panelValue}`} aria-labelledby={`tab-${panelValue}`} tabIndex={0}>
      {children}
    </div>
  );
};

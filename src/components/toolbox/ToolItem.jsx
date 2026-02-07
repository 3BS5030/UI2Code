import React from "react";

export default function ToolItem({ label, type, onAdd }) {

  const handleClick = () => {
    onAdd(type);
  };

  return (
    <div className="tool-item">
      <button onClick={handleClick}>
        {label}
      </button>
    </div>
  );
}

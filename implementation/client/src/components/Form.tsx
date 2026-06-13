import React from "react";

interface FormProps {
  children: React.ReactNode;
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
  className?: string;
}

function Form({ children, onSubmit, className }: FormProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (onSubmit) onSubmit(e);
      }}
      className={className ?? ""}
    >
      {children}
    </form>
  );
}

export default Form;

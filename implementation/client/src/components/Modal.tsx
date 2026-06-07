import React, { useState, useEffect } from "react";
import { Home, X } from "lucide-react";

export interface ModalProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  triggerBtnClass?: string;
  triggerLabel?: React.ReactNode;
  fullScreen?: boolean;
}

const Modal = ({
  title,
  children,
  footer,
  triggerBtnClass = `fixed bottom-6 right-6
          bg-amber-400 hover:bg-amber-500 active:bg-amber-600
          text-white p-4 rounded-full shadow-xl
          flex items-center justify-center
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-amber-300
          z-50`,
  triggerLabel = "Open modal",
  fullScreen = true,
}: ModalProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // Close modal on ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) =>
      e.key === "Escape" && setIsOpen(false);
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, []);

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Add New Space"
        className={triggerBtnClass}
      >
        {triggerLabel}
      </button>

      {/* Modal overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 flex justify-center items-center bg-black/50 z-9999"
          // style={{ zIndex: 9999 }}
          onClick={() => setIsOpen(false)}
        >
          <div
            className={
              fullScreen
                ? `bg-white w-full h-full
          transform transition-all duration-300 ease-out
          scale-100 opacity-100
          flex flex-col overflow-auto relative`
                : `bg-white w-100 h-full
          transform transition-all duration-300 ease-out
          scale-100 opacity-100
          flex flex-col overflow-auto relative`
            }
            onClick={(e) => e.stopPropagation()}
          >
            {title && (
              <div className="px-6 pt-6 flex justify-between items-center mb-4 z-9999">
                <h2 className="text-lg font-semibold flex gap-2 items-center">
                  <Home /> {title}
                </h2>
                <button onClick={() => setIsOpen(false)} aria-label="Close">
                  <X size={24} />
                </button>
              </div>
            )}

            {children}

            {footer && <div className="mt-4 border-t pt-2">{footer}</div>}
          </div>
        </div>
      )}
    </>
  );
};

export default Modal;

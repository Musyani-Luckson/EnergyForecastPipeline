import { AlertCircle } from "lucide-react";
import React from "react";

interface AlertInterface {
  children?: React.ReactNode;
}
function Alert({ children = <AlertCircle size={28} /> }: AlertInterface) {
  return (
    <div className="w-full h-full flex justify-around items-center">
      {children}
    </div>
  );
}

export default Alert;

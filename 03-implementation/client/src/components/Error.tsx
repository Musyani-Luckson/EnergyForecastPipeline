import { AlertCircle } from "lucide-react";
import React from "react";

interface ErrorInterface {
  children?: React.ReactNode;
}
function Error({ children = <AlertCircle size={28} /> }: ErrorInterface) {
  return (
    <div className="w-full h-full flex justify-around items-center">
      {children}
    </div>
  );
}

export default Error;

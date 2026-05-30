import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface InputFieldProps {
  icon?: React.ReactNode;
  name: string;
  placeholder?: string;
  type?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  showError?: boolean;
  disabled?: boolean;
}

const InputField: React.FC<InputFieldProps> = ({
  icon,
  name,
  placeholder = "",
  type = "text",
  value,
  onChange,
  error,
  showError = true,
  disabled = false,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const inputType =
    type === "password" ? (showPassword ? "text" : "password") : type;

  return (
    <div className="flex flex-col rounded-sm w-full mb-1 relative">
      <div className="relative">
        {/* Left icon */}
        {icon && (
          <div
            className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
              disabled ? "text-gray-400" : "text-gray-600"
            }`}
          >
            {icon}
          </div>
        )}

        {/* Input */}
        <input
          id={name}
          name={name}
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-10 py-3 border rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            ${error ? "border-red-500" : "border-gray-300"}
            ${
              disabled
                ? "bg-gray-100 cursor-not-allowed text-gray-500"
                : "bg-white"
            }
          `}
        />

        {/* Right show/hide icon for password */}
        {type === "password" && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
              disabled ? "text-gray-400 cursor-not-allowed" : "text-gray-500"
            }`}
            disabled={disabled}
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        )}
      </div>

      {/* Error message */}
      {showError && (
        <div className="text-red-500 text-sm h-6 rounded-sm">{error}</div>
      )}
    </div>
  );
};

export default InputField;

import { Lock, User } from "lucide-react";
import Form from "../../components/Form";
import InputField from "../../components/InputField";
import { Link } from "react-router-dom";
// import Illustrator from "../../components/Illustrator";
import { useState } from "react";
import type { LoginRequest } from "../../types/auth";
import { useUser } from "../../global/hooks/useAuth";
// import { getFieldError } from "../../utils/utils";

function SigninPage() {
  const { loading, error, login } = useUser();
  const [username, setUsername] = useState<string>("username");
  const [password, setPassword] = useState<string>("password");
  // const [err, setErr] = useState<ApiErrorResponse | null>(null);

  // setErr(error);
  const handleSubmit = async () => {
    const user: LoginRequest = { username, password };
    console.log(user);
    login(user);
  };

  return (
    <>
      {error?.error?.type === "SERVER_ERROR" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-xl bg-red-600/10 border border-red-500/30 px-6 py-5 text-center shadow-lg">
            {/* Icon */}
            <div className="text-red-500 text-4xl">⚠️</div>

            {/* Title */}
            <div className="text-white text-lg font-semibold">
              Server Not Responding
            </div>

            {/* Subtitle */}
            <div className="text-gray-300 text-sm max-w-xs">
              Unable to reach the server. Check your connection or try again
              later.
            </div>
          </div>
        </div>
      )}

      {error?.error?.type === "NETWORK_ERROR" && (
        <div className="flex items-center gap-3 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-yellow-200">
          <div className="text-yellow-400 text-xl">⚠️</div>

          <div className="flex flex-col">
            <div className="font-semibold text-sm">Network Error</div>
            <div className="text-xs text-yellow-200/70">
              Unable to connect to the server. Check your internet connection.
            </div>
          </div>
        </div>
      )}

      {error === null && (
        <div className="h-screen grid lg:grid-cols-2 bg-gray-50">
          {/* Left Illustration Panel */}
          <div className="hidden lg:flex flex-col justify-center items-center">
            <div className="text-center max-w-md">
              <h2 className="text-3xl font-bold text-blue-700 mb-2">
                Energy Forecast Dashboard
              </h2>
              <p className="text-gray-600">
                Monitor, analyze, and forecast energy demand with intelligent
                insights.
              </p>
            </div>
            <div className="mt-8 w-3/4 h-72 rounded-sm flex items-center justify-center text-gray-500">
              {/* <Illustrator src="./b7.svg" alt="signin illustration" width="60%" /> */}
            </div>
          </div>

          {/* Right Form Panel */}
          <div className="flex flex-col justify-center items-center p-4">
            <Form
              className="w-full max-w-sm p-4 rounded-sm"
              onSubmit={handleSubmit}
            >
              <fieldset className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800 mb-2">
                  Welcome Back
                </h1>
                <p className="text-gray-500 text-sm">Sign in to continue.</p>
              </fieldset>

              <InputField
                name="username"
                icon={<User />}
                placeholder="Username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                }}
                disabled={loading}
                // error={getFieldError("username", Array.isArray(error) ? error : [])}
              />
              <InputField
                name="password"
                icon={<Lock />}
                placeholder="Password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                }}
                disabled={loading}
                // error={getFieldError("password", Array.isArray(error) ? error : [])}
              />

              {/* Forgot Password Link */}
              <div className="text-right mt-1">
                <Link
                  to="/forgot-password"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              <button
                disabled={loading}
                type="submit"
                className="w-full mt-4 bg-blue-600 text-white py-3 rounded-sm font-semibold hover:bg-blue-700 transition-all duration-200"
              >
                {loading ? "Loading" : " Sign In"}
              </button>

              <div className="text-sm text-gray-500 text-center mt-4">
                Accounts are created by an administrator.
                <div>Contact your admin for access.</div>
              </div>
            </Form>
          </div>
        </div>
      )}
    </>
    // if error = server error, show a red banner with the message
    // if error = network down, show a yellow banner with the message
  );
}

export default SigninPage;

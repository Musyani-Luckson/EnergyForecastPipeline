import { AuthProvider } from "./global/contexts/AuthContext";
import AppRoutes from "./router/AppRoutes";

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
export default App;

// function App() {
//   return (
//     <div className="relative flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
//       <div className="max-w-3xl text-center">
//         <div className="mb-6 inline-block rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-400">
//           Intelligent Energy Forecasting Platform
//         </div>

//         <h1 className="text-5xl font-extrabold tracking-tight text-green-400 md:text-7xl">
//           BEFDSS
//         </h1>

//         <p className="mt-4 text-xl font-medium text-slate-300 md:text-2xl">
//           Building Energy Forecasting & Decision-Support System
//         </p>

//         <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-400 md:text-lg">
//           An Algorithmic Framework for Building Energy Management integrating
//           IQR-Based Anomaly Detection and Grid-Search Optimized SARIMA
//           forecasting for intelligent energy monitoring, prediction, and
//           decision support.
//         </p>

//         <div className="mt-10">
//           <span className="rounded-full border border-slate-700 bg-slate-900 px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
//             Coming Soon
//           </span>
//         </div>
//       </div>

//       {/* Footer */}
//       <div className="absolute bottom-6 text-center text-sm text-slate-500">
//         Powered by{" "}
//         <span className="font-semibold text-green-400">Musyani Luckson</span>
//       </div>
//     </div>
//   );
// }

// export default App;

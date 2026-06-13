import { useState } from "react";
import UploadCard from "./UploadCard";
import Preprocess from "./Preprocess";
import type { FileUploadResult } from "../../types/fileUpload";

const STEPS = ["Upload File", "Preprocess", "Run Forecast"];

type StepState = {
  completed: boolean;
};

function UploadStep() {
  const [step, setStep] = useState(0);

  const [stepState, setStepState] = useState<StepState[]>(
    STEPS.map(() => ({ completed: false })),
  );
  const [uploadedDataset, setUploadedDataset] =
    useState<FileUploadResult | null>(null);

  const markComplete = (index: number) => {
    setStepState((prev) =>
      prev.map((s, i) => (i === index ? { ...s, completed: true } : s)),
    );
  };

  const next = () => {
    if (stepState[step].completed) {
      setStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const back = () => {
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const canAccessStep = (index: number) => {
    if (index === 0) return true;
    return stepState[index - 1]?.completed;
  };

  const runForecast = () => {
    console.log("Running forecast...");
    // TODO: Trigger forecast request here
  };

  return (
    <div className="space-y-4">
      {/* Step Header */}
      <div className="flex flex-wrap gap-2">
        {STEPS.map((label, index) => {
          const active = index === step;
          const unlocked = canAccessStep(index);
          const completed = stepState[index].completed;

          return (
            <button
              key={label}
              disabled={!unlocked}
              onClick={() => unlocked && setStep(index)}
              className={`
                flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium transition
                ${
                  active
                    ? "bg-blue-600 text-white"
                    : completed
                      ? "bg-green-600 text-white"
                      : unlocked
                        ? "bg-gray-200 text-gray-800 hover:bg-gray-300"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }
              `}
            >
              <span
                className={`
                  flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold
                  ${
                    active || completed
                      ? "bg-white/20"
                      : "bg-white text-gray-700"
                  }
                `}
              >
                {index + 1}
              </span>

              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="">
        {step === 0 && (
          <UploadCard
            onComplete={(data) => {
              setUploadedDataset(data);
              markComplete(0);
            }}
          />
        )}

        {step === 1 && (
          <Preprocess
            dataset={
              uploadedDataset
                ? {
                    fileName: "dataset.csv",
                    rows: uploadedDataset.rows.length,
                    warnings: uploadedDataset.warnings,
                  }
                : null
            }
            onComplete={() => markComplete(1)}
          />
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Forecast Configuration</h2>

            <p className="text-gray-600">
              Review settings and prepare to run forecasting.
            </p>

            <button
              onClick={() => markComplete(2)}
              disabled={stepState[2].completed}
              className="rounded bg-green-600 px-4 py-2 text-white disabled:opacity-50"
            >
              {stepState[2].completed ? "Completed" : "Mark Forecast Ready"}
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        {/* Back appears only after first step */}
        {step > 0 ? (
          <button
            onClick={back}
            className="rounded bg-gray-200 px-4 py-2 hover:bg-gray-300"
          >
            Back
          </button>
        ) : (
          <div />
        )}

        {/* Continue for non-final steps */}
        {step < STEPS.length - 1 ? (
          <button
            onClick={next}
            disabled={!stepState[step].completed}
            className="rounded bg-blue-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue
          </button>
        ) : (
          <button
            onClick={runForecast}
            disabled={!stepState[step].completed}
            className="rounded bg-green-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Run Forecast
          </button>
        )}
      </div>
    </div>
  );
}

export default UploadStep;

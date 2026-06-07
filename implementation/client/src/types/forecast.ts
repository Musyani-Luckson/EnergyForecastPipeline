export type ForecastStatus = "COMPLETED" | "PENDING" | "FAILED";

export type Forecast = {
  id: string;
  name: string;
  status: ForecastStatus;
  createdAt: string; // ISO date string
};

export const recentForecastsMock: Forecast[] = [
  {
    id: crypto.randomUUID(),
    name: "Forecast 1",
    status: "COMPLETED",
    createdAt: "2023-01-01T00:00:00Z",
  },
  {
    id: crypto.randomUUID(),
    name: "Forecast 2",
    status: "PENDING",
    createdAt: "2023-01-02T00:00:00Z",
  },
  {
    id: crypto.randomUUID(),
    name: "Forecast 3",
    status: "FAILED",
    createdAt: "2023-01-03T00:00:00Z",
  },
];

import Button from "../../components/Button";
import PageHeader from "../../components/PageHeader";
import { recentForecastsMock } from "../../types/forecast";
// import type { Forecast } from "../../types/forecast";
import ForecastCard from "../common/ForecastCard";

function Overview() {
  return (
    <div className="">
      <PageHeader
        title="Overview"
        // about="See the latest forecasts and their performance here."
        action={
          <Button onClick={() => alert("New forecast created!")}>
            New Forecast
          </Button>
        }
        children={
          <div className="">
            <div className="">Running</div>
            <div className="">
              Recent Forecasts
              <div className="my-2 gap-2 flex flex-col">
                {recentForecastsMock.map((forecast) => (
                  <ForecastCard key={forecast.id} forecast={forecast} />
                ))}
              </div>
            </div>
          </div>
        }
      />
    </div>
  );
}

export default Overview;

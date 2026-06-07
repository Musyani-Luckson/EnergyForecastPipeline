import Button from "../../components/Button";
import PageHeader from "../../components/PageHeader";

function Forecasts() {
  return (
    <div className="">
      <PageHeader
        title="Forecasts"
        // about="See the latest forecasts and their performance here."
        action={
          <Button onClick={() => alert("New forecast created!")}>
            Create Forecast
          </Button>
        }
        children={
          <div>
            <p>This is the forecasts page.</p>
          </div>
        }
      />
    </div>
  );
}

export default Forecasts;

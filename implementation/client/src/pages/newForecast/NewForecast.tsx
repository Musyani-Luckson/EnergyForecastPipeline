// import React from 'react'

// import Button from "../../components/Button";
import PageHeader from "../../components/PageHeader";
import UploadStep from "./UploadStep";

function NewForecast() {
  return (
    <div className="">
      <PageHeader
        title="New Forecast"
        children={
          <div>
            <UploadStep />
          </div>
        }
      />
    </div>
  );
}

export default NewForecast;

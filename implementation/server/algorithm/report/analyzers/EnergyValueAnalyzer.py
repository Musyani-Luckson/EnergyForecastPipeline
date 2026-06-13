class EnergyValueAnalyzer:

    @staticmethod
    def analyze(df, value_col="Daily_kWh"):

        negative_count = int((df[value_col] < 0).sum())
        zero_count = int((df[value_col] == 0).sum())

        return {
            "negative_values_count": negative_count,
            "zero_values_count": zero_count,
            "has_negative_values": negative_count > 0,
            "has_zero_values": zero_count > 0,
            "is_energy_data_valid": negative_count == 0 and zero_count == 0,
        }

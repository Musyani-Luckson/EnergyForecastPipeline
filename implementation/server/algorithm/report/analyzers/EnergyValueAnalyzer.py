class EnergyValueAnalyzer:
    """
    Domain validity of the value column.

    Consumption cannot be negative, so a negative reading is physically
    invalid. A differenced series, however, measures period-over-period
    change rather than a level: negative values there are ordinary
    decreases in demand and carry no domain violation. The caller states
    which of the two it holds, because the same analyser serves both.
    """

    @staticmethod
    def analyze(df, value_col="Daily_kWh", is_differenced=False):

        negative_count = int((df[value_col] < 0).sum())
        zero_count = int((df[value_col] == 0).sum())

        return {
            "negative_values_count": negative_count,
            "zero_values_count": zero_count,
            "has_negative_values": negative_count > 0,
            "has_zero_values": zero_count > 0,
            # Reported so the interface can explain what the counts mean
            # instead of presenting decreases as invalid readings.
            "is_differenced": is_differenced,
            "is_energy_data_valid": (
                True
                if is_differenced
                else (negative_count == 0 and zero_count == 0)
            ),
        }

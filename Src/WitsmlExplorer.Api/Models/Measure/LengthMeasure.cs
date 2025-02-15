using System.Globalization;

using WitsmlExplorer.Api.Services;

namespace WitsmlExplorer.Api.Models.Measure
{
    public class LengthMeasure : Measure
    {
        public decimal Value { get; set; }

        public T ToWitsml<T>() where T : Witsml.Data.Measures.Measure, new()
        {
            return new()
            {
                Uom = Uom,
                Value = Value.ToString(CultureInfo.InvariantCulture)
            };
        }

        public static T ToEmptyWitsml<T>() where T : Witsml.Data.Measures.Measure, new()
        {
            return new()
            {
                Uom = "",
                Value = ""
            };
        }

        public static LengthMeasure FromWitsml(Witsml.Data.Measures.Measure witsmlMeasure)
        {
            if (witsmlMeasure == null)
            {
                return null;
            }
            return new()
            {
                Uom = witsmlMeasure.Uom,
                Value = StringHelpers.ToDecimal(witsmlMeasure.Value)
            };
        }
    }
}

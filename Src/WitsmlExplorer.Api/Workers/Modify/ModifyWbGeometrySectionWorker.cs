using System;
using System.Linq;
using System.Threading.Tasks;

using Microsoft.Extensions.Logging;

using Witsml;
using Witsml.Data;
using Witsml.ServiceReference;

using WitsmlExplorer.Api.Jobs;
using WitsmlExplorer.Api.Jobs.Common;
using WitsmlExplorer.Api.Models;
using WitsmlExplorer.Api.Models.Measure;
using WitsmlExplorer.Api.Query;
using WitsmlExplorer.Api.Services;

namespace WitsmlExplorer.Api.Workers.Modify
{
    public class ModifyWbGeometrySectionWorker : BaseWorker<ModifyWbGeometrySectionJob>, IWorker
    {
        public JobType JobType => JobType.ModifyWbGeometrySection;

        public ModifyWbGeometrySectionWorker(ILogger<ModifyWbGeometrySectionJob> logger, IWitsmlClientProvider witsmlClientProvider) : base(witsmlClientProvider, logger) { }

        public override async Task<(WorkerResult, RefreshAction)> Execute(ModifyWbGeometrySectionJob job)
        {
            Verify(job.WbGeometrySection, job.WbGeometryReference);

            string wellUid = job.WbGeometryReference.WellUid;
            string wellboreUid = job.WbGeometryReference.WellboreUid;
            string wbGeometryUid = job.WbGeometryReference.Uid;

            WitsmlWbGeometrys query = WbGeometryQueries.UpdateWbGeometrySection(job.WbGeometrySection, job.WbGeometryReference);
            QueryResult result = await GetTargetWitsmlClientOrThrow().UpdateInStoreAsync(query);
            if (result.IsSuccessful)
            {
                Logger.LogInformation("WbGeometrySection modified. {jobDescription}", job.Description());
                RefreshWbGeometry refreshAction = new(GetTargetWitsmlClientOrThrow().GetServerHostname(), wellUid, wellboreUid, wbGeometryUid, RefreshType.Update);
                return (new WorkerResult(GetTargetWitsmlClientOrThrow().GetServerHostname(), true, $"WbGeometrySection updated ({job.WbGeometrySection.Uid})"), refreshAction);
            }

            const string errorMessage = "Failed to update wbGeometrySection";
            Logger.LogError("{ErrorMessage}. {jobDescription}}", errorMessage, job.Description());
            WitsmlWbGeometrys wbGeometryQuery = WbGeometryQueries.GetWitsmlWbGeometryIdOnly(wellUid, wellboreUid, wbGeometryUid);
            WitsmlWbGeometrys wbGeometryResult = await GetTargetWitsmlClientOrThrow().GetFromStoreAsync(wbGeometryQuery, new OptionsIn(ReturnElements.IdOnly));
            WitsmlWbGeometry wbGeometry = wbGeometryResult.WbGeometrys.FirstOrDefault();
            EntityDescription description = null;
            if (wbGeometry != null)
            {
                description = new EntityDescription
                {
                    WellName = wbGeometry.NameWell,
                    WellboreName = wbGeometry.NameWellbore,
                    ObjectName = job.WbGeometrySection.Uid
                };
            }

            return (new WorkerResult(GetTargetWitsmlClientOrThrow().GetServerHostname(), false, errorMessage, result.Reason, description), null);
        }

        private static void Verify(WbGeometrySection wbGeometrySection, ObjectReference wbGeometryReference)
        {
            if (string.IsNullOrEmpty(wbGeometryReference.WellUid))
            {
                throw new InvalidOperationException($"{nameof(wbGeometryReference.WellUid)} cannot be empty");
            }

            if (string.IsNullOrEmpty(wbGeometryReference.WellboreUid))
            {
                throw new InvalidOperationException($"{nameof(wbGeometryReference.WellboreUid)} cannot be empty");
            }

            if (string.IsNullOrEmpty(wbGeometryReference.Uid))
            {
                throw new InvalidOperationException($"{nameof(wbGeometryReference.Uid)} cannot be empty");
            }

            if (string.IsNullOrEmpty(wbGeometrySection.Uid))
            {
                throw new InvalidOperationException($"{nameof(wbGeometrySection.Uid)} cannot be empty");
            }
            VerifyMeasure(wbGeometrySection.DiaDrift, nameof(wbGeometrySection.DiaDrift));
            VerifyMeasure(wbGeometrySection.IdSection, nameof(wbGeometrySection.IdSection));
            VerifyMeasure(wbGeometrySection.OdSection, nameof(wbGeometrySection.OdSection));
            VerifyMeasure(wbGeometrySection.MdBottom, nameof(wbGeometrySection.MdBottom));
            VerifyMeasure(wbGeometrySection.MdTop, nameof(wbGeometrySection.MdTop));
            VerifyMeasure(wbGeometrySection.TvdBottom, nameof(wbGeometrySection.TvdBottom));
            VerifyMeasure(wbGeometrySection.TvdTop, nameof(wbGeometrySection.TvdTop));
            VerifyMeasure(wbGeometrySection.WtPerLen, nameof(wbGeometrySection.WtPerLen));
        }

        private static void VerifyMeasure(Measure measure, string name)
        {
            if (measure != null && string.IsNullOrEmpty(measure.Uom))
            {
                throw new InvalidOperationException($"unit of measure for {name} cannot be empty");
            }
        }
    }
}

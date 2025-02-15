using System;
using System.Threading.Tasks;

using WitsmlExplorer.Api.Configuration;
using WitsmlExplorer.Api.HttpHandlers;

namespace WitsmlExplorer.Api.Services
{
    public interface ICredentialsService
    {
        public Task VerifyCredentials(ServerCredentials serverCreds);
        public string GetClaimFromToken(IEssentialHeaders headers, string claim);
        public ServerCredentials GetCredentialsFromCache(bool useOauth, IEssentialHeaders headers, string serverUrl, Func<string, string> delDecrypt = null);
        public void CacheCredentials(string clientId, ServerCredentials credentials, double ttl, Func<string, string> delEncrypt = null);
        public void RemoveCachedCredentials(string clientId);
        public void RemoveAllCachedCredentials();
        public Task<ServerCredentials> GetSystemCredentialsByToken(string token, Uri server);
        public Task<ServerCredentials> GetCredentialsFromHeaderValue(string headerValue, string token = null);
        public (ServerCredentials targetServer, ServerCredentials sourceServer) GetWitsmlUsernamesFromCache(IEssentialHeaders headers);
    }
}

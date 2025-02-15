using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Cryptography;
using System.Text;

using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

using Moq;

using Witsml.Data;

using WitsmlExplorer.Api.Configuration;
using WitsmlExplorer.Api.HttpHandlers;
using WitsmlExplorer.Api.Models;
using WitsmlExplorer.Api.Repositories;
using WitsmlExplorer.Api.Services;

using Xunit;
namespace WitsmlExplorer.Api.Tests.Services
{
    public class CredentialsServiceTests
    {
        private readonly CredentialsService _credentialsService;

        public CredentialsServiceTests()
        {
            Mock<IDataProtectionProvider> dataProtectorProvider = new();
            Mock<ITimeLimitedDataProtector> dataProtector = new();
            Mock<ILogger<CredentialsService>> logger = new();
            Mock<IOptions<WitsmlClientCapabilities>> clientCapabilities = new();
            Mock<IWitsmlSystemCredentials> witsmlServerCredentials = new();
            Mock<IDocumentRepository<Server, Guid>> witsmlServerRepository = new();
            CredentialsCache credentialsCache = new(new Mock<ILogger<CredentialsCache>>().Object);

            dataProtector.Setup(p => p.Protect(It.IsAny<byte[]>())).Returns((byte[] a) => a);
            dataProtector.Setup(p => p.Unprotect(It.IsAny<byte[]>())).Returns((byte[] a) => a);
            dataProtectorProvider.Setup(pp => pp.CreateProtector("WitsmlServerPassword")).Returns(dataProtector.Object);
            clientCapabilities.Setup(cc => cc.Value).Returns(new WitsmlClientCapabilities());

            // Keyvault secrets
            witsmlServerCredentials.Setup(w => w.WitsmlCreds).Returns(new ServerCredentials[] {
                new ServerCredentials() {
                    Host = new Uri("http://some.url.com"),
                    UserId = "systemuser",
                    Password = "systempassword"
                }
            });
            // Configuration DB
            witsmlServerRepository.Setup(wsr => wsr.GetDocumentsAsync()).ReturnsAsync(new List<Server>() {
                new Server()
                {
                    Name = "Test Server",
                    Url = new Uri("http://some.url.com"),
                    Description = "Testserver for SystemCreds testing",
                    SecurityScheme = "OAuth2",
                    Roles = new List<string>() {"validrole","developer"}
                }
            });

            _credentialsService = new(
                dataProtectorProvider.Object,
                clientCapabilities.Object,
                witsmlServerCredentials.Object,
                witsmlServerRepository.Object,
                credentialsCache,
                logger.Object
            );
        }

        [Fact]
        public void GetCredentialsFromHeaderValue_BasicCreds_ReturnBasicCreds()
        {
            string token = null;
            string basicHeader = CreateBasicHeaderValue("basicuser", "basicpassword", "http://some.url.com");

            ServerCredentials creds = _credentialsService.GetCredentialsFromHeaderValue(basicHeader, token).Result;
            Assert.True(creds.UserId == "basicuser" && creds.Password == "basicpassword");
            Cleanup();
        }

        [Fact]
        public void GetCredentialsFromHeaderValue_BasicNoCreds_ReturnEmpty()
        {
            string token = null;
            string basicHeader = "http://some.url.com";

            ServerCredentials creds = _credentialsService.GetCredentialsFromHeaderValue(basicHeader, token).Result;
            Assert.True(creds.IsCredsNullOrEmpty());
            Cleanup();
        }

        [Fact]
        public void GetCredentialsFromHeaderValue_BasicNoHeader_ReturnEmpty()
        {
            string token = null;
            string basicHeader = null;

            ServerCredentials creds = _credentialsService.GetCredentialsFromHeaderValue(basicHeader, token).Result;
            Assert.True(creds.IsCredsNullOrEmpty());
            Cleanup();
        }
        [Fact]
        public void GetCredentialsFromHeaderValue_BasicAndTokenValidRolesHeaderValidURL_ReturnBasicCreds()
        {
            // WHEN
            //  Valid Basic credentials and Valid Bearer token are present along with Valid URL
            // THEN 
            //  Basic auth should always be preferred
            string basicHeader = CreateBasicHeaderValue("basicuser", "basicpassword", "http://some.url.com");
            string token = CreateJwtToken(new string[] { "validrole" }, false, "tokenuser@arpa.net");

            ServerCredentials creds = _credentialsService.GetCredentialsFromHeaderValue(basicHeader, token).Result;
            Assert.True(creds.UserId == "basicuser" && creds.Password == "basicpassword");
            Cleanup();
        }

        [Fact]
        public void GetCredentialsFromHeaderValue_ValidTokenValidRolesValidURLBasicHeader_ReturnSystemCreds()
        {
            // 1. CONFIG:   There is a server config in DB with URL: "http://some.url.com" and role: ["user"]
            // 2. CONFIG:   There exist system credentials in keyvault for server with URL: "http://some.url.com"
            // 3. REQUEST:  User provide token and valid roles in token
            // 4. REQUEST:  Header WitsmlTargetServer Header with URL: "http://some.url.com"
            // 5. RESPONSE: System creds should be returned because server-roles and user-roles overlap
            string basicHeader = "http://some.url.com";
            string token = CreateJwtToken(new string[] { "validrole" }, false, "tokenuser@arpa.net");

            ServerCredentials creds = _credentialsService.GetCredentialsFromHeaderValue(basicHeader, token).Result;
            Assert.True(creds.UserId == "systemuser" && creds.Password == "systempassword");
            Cleanup();
        }

        [Fact]
        public void GetCredentialsFromHeaderValue_ValidTokenValidRolesInvalidURLBasicHeader_ReturnEmpty()
        {
            string basicHeader = "http://some.invalidurl.com";
            string token = CreateJwtToken(new string[] { "validrole" }, false, "tokenuser@arpa.net");

            ServerCredentials creds = _credentialsService.GetCredentialsFromHeaderValue(basicHeader, token).Result;
            Assert.True(creds.IsCredsNullOrEmpty());
            Cleanup();
        }

        [Fact]
        public void GetCredentialsFromHeaderValue_InvalidTokenRolesURLOnlyBasicHeader_ReturnEmpty()
        {
            string basicHeader = "http://some.url.com";
            string token = CreateJwtToken(new string[] { "invalidrole" }, false, "tokenuser@arpa.net");

            ServerCredentials creds = _credentialsService.GetCredentialsFromHeaderValue(basicHeader, token).Result;
            Assert.True(creds.IsCredsNullOrEmpty());
            Cleanup();
        }

        [Fact]
        public void CacheCredentials_InsertOne_GetCredentialsFromCache()
        {

            string clientId = Guid.NewGuid().ToString();
            ServerCredentials sc = new() { UserId = "username", Password = "dummypassword", Host = new Uri("https://somehost.url") };
            string b64Creds = Convert.ToBase64String(Encoding.ASCII.GetBytes(sc.UserId + ":" + sc.Password));
            string headerValue = b64Creds + "@" + sc.Host;

            Mock<IEssentialHeaders> headersMock = new();
            headersMock.Setup(x => x.GetCookieValue()).Returns(clientId);
            headersMock.SetupGet(x => x.TargetServer).Returns(sc.Host.ToString());

            _credentialsService.CacheCredentials(clientId, sc, 1.0, n => n);
            ServerCredentials fromCache = _credentialsService.GetCredentialsFromCache(false, headersMock.Object, headersMock.Object.TargetServer);
            Assert.Equal(sc, fromCache);
            _credentialsService.RemoveAllCachedCredentials();
            Cleanup();
        }
        private void Cleanup()
        {
            _credentialsService.RemoveAllCachedCredentials();
        }
        private static string CreateBasicHeaderValue(string username, string dummypassword, string host)
        {
            ServerCredentials sc = new() { UserId = username, Password = dummypassword, Host = new Uri(host) };
            string b64Creds = Convert.ToBase64String(Encoding.ASCII.GetBytes(sc.UserId + ":" + sc.Password));
            return b64Creds + "@" + sc.Host.ToString();
        }

        private static string CreateJwtToken(string[] appRoles, bool signed, string upn)
        {
            SecurityTokenDescriptor tokenDescriptor = new()
            {
                Expires = DateTime.UtcNow.AddSeconds(60),
                Claims = new Dictionary<string, object>() {
                    { "roles", new List<string>(appRoles) },
                    { "upn", upn },
                    { "sub", Guid.NewGuid().ToString() }
                }
            };
            if (signed)
            {
                byte[] secret = new byte[64];
                RandomNumberGenerator.Create().GetBytes(secret);
                tokenDescriptor.SigningCredentials = new SigningCredentials(
                    new SymmetricSecurityKey(secret),
                    SecurityAlgorithms.HmacSha256Signature,
                    SecurityAlgorithms.Sha512Digest
                );
            }
            return new JwtSecurityTokenHandler().WriteToken(new JwtSecurityTokenHandler().CreateJwtSecurityToken(tokenDescriptor));
        }
    }
}

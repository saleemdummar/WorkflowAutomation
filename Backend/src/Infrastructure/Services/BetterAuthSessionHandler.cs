using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace WorkflowAutomation.Infrastructure.Services
{
    /// <summary>
    /// Scheme options that carry the SQL Server connection string
    /// so the handler can query auth_sessions + auth_users.
    /// </summary>
    public class BetterAuthSessionOptions : AuthenticationSchemeOptions
    {
        public string ConnectionString { get; set; } = string.Empty;
    }

    /// <summary>
    /// Custom ASP.NET Core authentication handler that validates
    /// Better Auth session tokens sent as <c>Authorization: Bearer {token}</c>.
    /// 
    /// On every authenticated request the handler:
    ///   1. Extracts the session token from the Authorization header (or
    ///      the <c>access_token</c> query-string param for SignalR).
    ///   2. Looks up the token in the <c>auth_sessions</c> table joined
    ///      with <c>auth_users</c>.
    ///   3. Checks expiry and banned status.
    ///   4. Builds a <see cref="ClaimsPrincipal"/> with standard claim types
    ///      (NameIdentifier, Email, Role, etc.) so existing [Authorize] policies
    ///      and controller code continue to work unchanged.
    /// </summary>
    public class BetterAuthSessionHandler : AuthenticationHandler<BetterAuthSessionOptions>
    {
        private static readonly MemoryCache _sessionCache = new(new MemoryCacheOptions
        {
            SizeLimit = 1024 // Max 1024 cached sessions
        });

        private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(2);

        public BetterAuthSessionHandler(
            IOptionsMonitor<BetterAuthSessionOptions> options,
            ILoggerFactory logger,
            UrlEncoder encoder)
            : base(options, logger, encoder)
        {
        }

        protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            // ── 1. Extract session token ────────────────────────
            string? token = null;

            if (Request.Headers.TryGetValue("Authorization", out var authHeader))
            {
                var headerValue = authHeader.ToString();
                if (headerValue.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                {
                    token = headerValue["Bearer ".Length..].Trim();
                }
            }

            // For SignalR WebSocket connections: also check query string
            if (string.IsNullOrEmpty(token) && Request.Path.StartsWithSegments("/hubs"))
            {
                token = Request.Query["access_token"];
            }

            if (string.IsNullOrEmpty(token))
            {
                return AuthenticateResult.NoResult();
            }

            // ── Check cache first ───────────────────────────
            var cacheKey = $"session:{token}";
            if (_sessionCache.TryGetValue(cacheKey, out AuthenticateResult? cachedResult) && cachedResult != null)
            {
                return cachedResult;
            }

            // ── 2. Validate session against database ────────────
            try
            {
                using var connection = new SqlConnection(Options.ConnectionString);
                await connection.OpenAsync();

                using var cmd = connection.CreateCommand();
                cmd.CommandText = @"
                    SELECT u.id, u.name, u.email, u.role, u.banned
                    FROM auth_sessions s
                    INNER JOIN auth_users u ON s.userId = u.id
                    WHERE s.token = @Token
                      AND s.expiresAt > GETUTCDATE()";
                cmd.Parameters.AddWithValue("@Token", token);

                using var reader = await cmd.ExecuteReaderAsync();
                if (!await reader.ReadAsync())
                {
                    return AuthenticateResult.Fail("Invalid or expired session token");
                }

                // Check banned flag
                var bannedOrd = reader.GetOrdinal("banned");
                if (!reader.IsDBNull(bannedOrd) && reader.GetBoolean(bannedOrd))
                {
                    return AuthenticateResult.Fail("User account is suspended");
                }

                // ── 3. Build ClaimsPrincipal ────────────────────
                var userId = reader.GetString(reader.GetOrdinal("id"));
                var name = reader.IsDBNull(reader.GetOrdinal("name"))
                    ? "" : reader.GetString(reader.GetOrdinal("name"));
                var email = reader.IsDBNull(reader.GetOrdinal("email"))
                    ? "" : reader.GetString(reader.GetOrdinal("email"));
                var roleStr = reader.IsDBNull(reader.GetOrdinal("role"))
                    ? "" : reader.GetString(reader.GetOrdinal("role"));

                var claims = new List<Claim>
                {
                    new(ClaimTypes.NameIdentifier, userId),
                    new("sub", userId),
                    new(ClaimTypes.Email, email),
                    new("email", email),
                    new(ClaimTypes.Name, name),
                    new("preferred_username", email),
                };

                // Split full name into first / last
                var nameParts = (name ?? "").Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
                if (nameParts.Length > 0)
                    claims.Add(new Claim(ClaimTypes.GivenName, nameParts[0]));
                if (nameParts.Length > 1)
                    claims.Add(new Claim(ClaimTypes.Surname, nameParts[1]));

                // Map comma-separated role string → individual ClaimTypes.Role claims
                if (!string.IsNullOrWhiteSpace(roleStr))
                {
                    foreach (var role in roleStr.Split(',',
                        StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                    {
                        claims.Add(new Claim(ClaimTypes.Role, role));
                    }
                }

                var identity = new ClaimsIdentity(claims, Scheme.Name);
                var principal = new ClaimsPrincipal(identity);
                var ticket = new AuthenticationTicket(principal, Scheme.Name);

                var result = AuthenticateResult.Success(ticket);

                // Cache successful authentication for 2 minutes
                _sessionCache.Set(cacheKey, result, new MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = CacheDuration,
                    Size = 1
                });

                return result;
            }
            catch (SqlException ex)
            {
                Logger.LogError(ex, "Database error while validating Better Auth session token");
                return AuthenticateResult.Fail("Authentication service unavailable");
            }
        }
    }
}

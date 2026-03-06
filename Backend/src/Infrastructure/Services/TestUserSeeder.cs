using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using WorkflowAutomation.Application.DTOs.Auth;
using WorkflowAutomation.Application.Interfaces;

namespace WorkflowAutomation.Infrastructure.Services
{
    /// <summary>
    /// Seeds default test users for all application roles.
    /// Each user is created via the BetterAuthUserAdminService (which inserts into auth_users + auth_accounts).
    /// Runs once at application startup — skips users that already exist (by email).
    /// </summary>
    public class TestUserSeeder
    {
        private readonly IUserAdminService _adminService;
        private readonly ILogger<TestUserSeeder> _logger;

        public TestUserSeeder(
            IUserAdminService adminService,
            ILogger<TestUserSeeder> logger)
        {
            _adminService = adminService;
            _logger = logger;
        }

        /// <summary>
        /// Creates test users for every role if they don't already exist.
        /// All passwords are: Test@12345
        /// </summary>
        public async Task SeedAsync()
        {
            var testUsers = new List<CreateUserDto>
            {
                new()
                {
                    Username = "superadmin@workflow.test",
                    Email = "superadmin@workflow.test",
                    FirstName = "Super",
                    LastName = "Admin",
                    Password = "Test@12345",
                    Roles = new List<string> { "super-admin" }
                },
                new()
                {
                    Username = "admin@workflow.test",
                    Email = "admin@workflow.test",
                    FirstName = "System",
                    LastName = "Admin",
                    Password = "Test@12345",
                    Roles = new List<string> { "admin" }
                },
                new()
                {
                    Username = "formdesigner@workflow.test",
                    Email = "formdesigner@workflow.test",
                    FirstName = "Form",
                    LastName = "Designer",
                    Password = "Test@12345",
                    Roles = new List<string> { "form-designer" }
                },
                new()
                {
                    Username = "workflowdesigner@workflow.test",
                    Email = "workflowdesigner@workflow.test",
                    FirstName = "Workflow",
                    LastName = "Designer",
                    Password = "Test@12345",
                    Roles = new List<string> { "workflow-designer" }
                },
                new()
                {
                    Username = "approver@workflow.test",
                    Email = "approver@workflow.test",
                    FirstName = "Task",
                    LastName = "Approver",
                    Password = "Test@12345",
                    Roles = new List<string> { "approver" }
                },
                new()
                {
                    Username = "submitter@workflow.test",
                    Email = "submitter@workflow.test",
                    FirstName = "Form",
                    LastName = "Submitter",
                    Password = "Test@12345",
                    Roles = new List<string> { "submitter" }
                },
                new()
                {
                    Username = "viewer@workflow.test",
                    Email = "viewer@workflow.test",
                    FirstName = "Read",
                    LastName = "Only",
                    Password = "Test@12345",
                    Roles = new List<string> { "viewer" }
                },
                // Multi-role user: admin + approver (department head scenario)
                new()
                {
                    Username = "depthead@workflow.test",
                    Email = "depthead@workflow.test",
                    FirstName = "Department",
                    LastName = "Head",
                    Password = "Test@12345",
                    Roles = new List<string> { "admin", "approver" }
                },
                // Multi-role user: form-designer + workflow-designer
                new()
                {
                    Username = "fulldesigner@workflow.test",
                    Email = "fulldesigner@workflow.test",
                    FirstName = "Full",
                    LastName = "Designer",
                    Password = "Test@12345",
                    Roles = new List<string> { "form-designer", "workflow-designer" }
                }
            };

            _logger.LogInformation("Starting test user seeding...");

            // First check which users already exist
            var existingUsers = await _adminService.GetUsersAsync(0, 100);
            var existingEmails = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var user in existingUsers)
            {
                existingEmails.Add(user.Email);
            }

            int created = 0;
            int skipped = 0;

            foreach (var userDto in testUsers)
            {
                try
                {
                    if (existingEmails.Contains(userDto.Email))
                    {
                        _logger.LogDebug("User {Email} already exists, skipping", userDto.Email);
                        skipped++;
                        continue;
                    }

                    await _adminService.CreateUserAsync(userDto);
                    created++;
                    _logger.LogInformation("Created test user: {Email} with roles [{Roles}]",
                        userDto.Email, string.Join(", ", userDto.Roles));
                }
                catch (HttpRequestException ex) when (ex.StatusCode == System.Net.HttpStatusCode.Conflict)
                {
                    _logger.LogDebug("User {Email} already exists (conflict), skipping", userDto.Email);
                    skipped++;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to create test user {Email}", userDto.Email);
                }
            }

            _logger.LogInformation("Test user seeding complete: {Created} created, {Skipped} skipped",
                created, skipped);
        }
    }
}

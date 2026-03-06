using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace WorkflowAutomation.Application.DTOs.Auth
{
    public class CreateUserDto
    {
        [Required]
        public string Username { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string FirstName { get; set; } = string.Empty;

        [Required]
        public string LastName { get; set; } = string.Empty;

        [Required]
        [MinLength(8)]
        public string Password { get; set; } = string.Empty;

        public bool TemporaryPassword { get; set; } = true;

        public List<string> Roles { get; set; } = new();
    }
}

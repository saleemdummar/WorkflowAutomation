namespace WorkflowAutomation.Application.DTOs.Auth
{
    public class UpdateUserDto
    {
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? Email { get; set; }
        public bool? Enabled { get; set; }
    }

    public class ResetPasswordDto
    {
        public string Password { get; set; } = string.Empty;
        public bool Temporary { get; set; } = true;
    }

    public class AssignRoleDto
    {
        public string RoleName { get; set; } = string.Empty;
    }
}

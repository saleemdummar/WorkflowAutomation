using System.Collections.Generic;

namespace WorkflowAutomation.Application.Interfaces
{
    public interface IJintExecutionService
    {
        object ExecuteJavaScript(string script, Dictionary<string, object> variables);
        bool ValidateJavaScriptSyntax(string script);
        bool EvaluateCondition(string condition, Dictionary<string, object> context);
    }
}

using System;
using System.Collections.Generic;
using System.Text;
using Jint;
using Microsoft.Extensions.Logging;
using WorkflowAutomation.Application.Interfaces;

namespace WorkflowAutomation.Infrastructure.Services
{
    public class JintExecutionService : IJintExecutionService
    {
        private readonly ILogger<JintExecutionService> _logger;

        public JintExecutionService(
            ILogger<JintExecutionService> logger)
        {
            _logger = logger;
        }

        public object ExecuteJavaScript(string script, Dictionary<string, object> variables)
        {
            try
            {
                _logger.LogDebug($"Executing JavaScript: {script}");

                var engine = new Engine(options =>
                {
                    // Set strict mode and timeouts for security
                    options.Strict();
                    options.TimeoutInterval(TimeSpan.FromSeconds(5));
                    options.MaxStatements(1000); // Prevent infinite loops
                    options.LimitMemory(4_000_000); // ~4 MB memory cap
                    options.LimitRecursion(100);
                });

                // Add variables to engine
                foreach (var kvp in variables)
                {
                    engine.SetValue(kvp.Key, kvp.Value);
                }

                var result = engine.Evaluate(script);
                var resultValue = result.ToObject();

                _logger.LogDebug($"JavaScript execution successful. Result: {resultValue}");
                return resultValue;
            }
            catch (Jint.Runtime.JavaScriptException jsEx)
            {
                var errorMessage = $"JavaScript execution error: {jsEx.Error}. Script: {script}";
                _logger.LogError(jsEx, errorMessage);

                throw new InvalidOperationException(errorMessage, jsEx);
            }
            catch (Exception ex)
            {
                var errorMessage = $"Unexpected error executing JavaScript: {ex.Message}. Script: {script}";
                _logger.LogError(ex, errorMessage);

                throw new InvalidOperationException(errorMessage, ex);
            }
        }

        public bool ValidateJavaScriptSyntax(string script)
        {
            try
            {
                var engine = new Engine(options =>
                {
                    options.Strict();
                    options.TimeoutInterval(TimeSpan.FromSeconds(1));
                    options.MaxStatements(200);
                    options.LimitMemory(1_000_000);
                    options.LimitRecursion(50);
                });

                // Try to evaluate in a function context to catch syntax errors
                engine.Evaluate($"(function() {{ {script} }})");

                _logger.LogDebug($"JavaScript syntax validation successful: {script}");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, $"JavaScript validation failed: {ex.Message}");
                return false;
            }
        }

        public bool EvaluateCondition(string condition, Dictionary<string, object> context)
        {
            try
            {
                _logger.LogDebug($"Evaluating condition: {condition}");

                var engine = new Engine(options =>
                {
                    options.Strict();
                    options.TimeoutInterval(TimeSpan.FromSeconds(5));
                    options.MaxStatements(500);
                    options.LimitMemory(4_000_000);
                    options.LimitRecursion(100);
                });

                // Add context variables
                foreach (var kvp in context)
                {
                    engine.SetValue(kvp.Key, kvp.Value);
                }

                var result = engine.Evaluate(condition);

                // Handle different result types
                bool boolResult;
                if (result.IsBoolean())
                {
                    boolResult = result.AsBoolean();
                }
                else if (result.IsNull() || result.IsUndefined())
                {
                    boolResult = false;
                }
                else if (result.IsNumber())
                {
                    boolResult = result.AsNumber() != 0;
                }
                else if (result.IsString())
                {
                    boolResult = !string.IsNullOrEmpty(result.AsString());
                }
                else
                {
                    // Try to convert to boolean
                    try
                    {
                        boolResult = Convert.ToBoolean(result.ToObject());
                    }
                    catch
                    {
                        _logger.LogWarning($"Could not convert condition result to boolean. Condition: {condition}, Result: {result}");
                        boolResult = false;
                    }
                }

                _logger.LogDebug($"Condition evaluation result: {boolResult}");
                return boolResult;
            }
            catch (Jint.Runtime.JavaScriptException jsEx)
            {
                var errorMessage = $"JavaScript error evaluating condition: {jsEx.Error}. Condition: {condition}";
                _logger.LogError(jsEx, errorMessage);

                // Throw so the calling engine can log the error to execution log (ISSUE-013)
                throw new InvalidOperationException(errorMessage, jsEx);
            }
            catch (Exception ex)
            {
                var errorMessage = $"Unexpected error evaluating condition: {ex.Message}. Condition: {condition}";
                _logger.LogError(ex, errorMessage);

                // Throw so the calling engine can log the error to execution log
                throw new InvalidOperationException(errorMessage, ex);
            }
        }
    }
}

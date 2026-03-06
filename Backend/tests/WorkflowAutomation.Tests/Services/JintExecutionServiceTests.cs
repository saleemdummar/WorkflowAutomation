using System;
using System.Collections.Generic;
using Microsoft.Extensions.Logging;
using Moq;
using WorkflowAutomation.Infrastructure.Services;
using Xunit;

namespace WorkflowAutomation.Tests.Services
{
    public class JintExecutionServiceTests
    {
        private readonly JintExecutionService _sut;

        public JintExecutionServiceTests()
        {
            var logger = new Mock<ILogger<JintExecutionService>>();
            _sut = new JintExecutionService(logger.Object);
        }

        [Fact]
        public void EvaluateCondition_ReturnsTrue_ForValidExpression()
        {
            var result = _sut.EvaluateCondition("age >= 18", new Dictionary<string, object>
            {
                ["age"] = 21
            });

            Assert.True(result);
        }

        [Fact]
        public void ValidateJavaScriptSyntax_ReturnsFalse_ForInvalidScript()
        {
            var result = _sut.ValidateJavaScriptSyntax("function () { invalid js");

            Assert.False(result);
        }

        [Fact]
        public void ExecuteJavaScript_Throws_ForUnboundedRecursionScript()
        {
            Assert.Throws<InvalidOperationException>(() =>
                _sut.ExecuteJavaScript("function f(){ return f(); } f();", new Dictionary<string, object>()));
        }
    }
}

namespace WorkflowAutomation.Application.DTOs
{
    public class PerformanceMetricsDto
    {
        public SystemMetrics System { get; set; } = new();
        public DatabaseMetrics Database { get; set; } = new();
        public ActivityMetrics Activity { get; set; } = new();

        public class SystemMetrics
        {
            public double Uptime { get; set; }
            public long MemoryUsageMB { get; set; }
            public int ThreadCount { get; set; }
            public double CpuTimeMs { get; set; }
        }

        public class DatabaseMetrics
        {
            public int FormCount { get; set; }
            public int WorkflowCount { get; set; }
            public int SubmissionCount { get; set; }
            public int ActiveInstances { get; set; }
            public int PendingApprovals { get; set; }
            public int UnreadNotifications { get; set; }
            public int UserCount { get; set; }
        }

        public class ActivityMetrics
        {
            public int SubmissionsLast24h { get; set; }
            public int WorkflowRunsLast24h { get; set; }
            public double AvgWorkflowExecutionMs { get; set; }
            public double WorkflowSuccessRate { get; set; }
        }
    }
}

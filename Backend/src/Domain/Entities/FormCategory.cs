using System;
using System.Collections.Generic;
using WorkflowAutomation.Domain.Common;

namespace WorkflowAutomation.Domain.Entities
{
    public class FormCategory : BaseAuditableEntity
    {
        public string CategoryName { get; set; }
        public Guid? ParentCategoryId { get; set; }
        public FormCategory ParentCategory { get; set; }
        public string Description { get; set; }
        public int DisplayOrder { get; set; }

        public ICollection<FormCategory> SubCategories { get; set; } = new List<FormCategory>();
        public ICollection<Form> Forms { get; set; } = new List<Form>();
    }
}
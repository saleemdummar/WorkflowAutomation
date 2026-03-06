# Form & Approval Workflow Automation Platform - Detailed Testing Guide

This document provides a comprehensive and detailed workflow for testing the Form & Approval Workflow Automation Platform based on the project specifications in [`Backend/README.md`](Backend/README.md).

---

## Table of Contents

1. [Application Overview](#application-overview)
2. [Environment Setup](#environment-setup)
3. [Detailed Testing Workflows](#detailed-testing-workflows)
4. [Form Builder Testing - Complete Guide](#form-builder-testing---complete-guide)
5. [Conditional Logic Testing - Complete Guide](#conditional-logic-testing---complete-guide)
6. [Workflow Designer Testing - Complete Guide](#workflow-designer-testing---complete-guide)
7. [Form Submission & Approval Testing](#form-submission--approval-testing)
8. [Admin & Configuration Testing](#admin--configuration-testing)
9. [API Testing Reference](#api-testing-reference)
10. [Troubleshooting](#troubleshooting)

---

## Application Overview

This is an **n8n-style workflow automation platform** with:

- **Drag-and-drop form builder** (using @dnd-kit)
- **Visual workflow designer** (using React Flow)
- **Conditional logic engine** (using expr-eval and Jint)
- **Multi-level approval workflows**
- **Real-time updates** (using Microsoft SignalR)

### Technical Stack

| Component          | Technology                              |
| ------------------ | --------------------------------------- |
| Frontend Framework | Next.js 16.1.3 + TypeScript             |
| UI Components      | React 19.2.3                            |
| Form Builder       | @dnd-kit/core, @dnd-kit/sortable        |
| Workflow Designer  | React Flow                              |
| Authentication     | better-auth                             |
| Database           | SQL Server (Kysely ORM, tedious driver) |
| Real-time          | Microsoft SignalR                       |
| Conditional Logic  | expr-eval (frontend), Jint (backend)    |

---

## Environment Setup

### 1. Database Setup

```env
Server: 127.0.0.1
Port: 1433
Database: WorkflowAutomationDb
Username: sa
Password: YourStrongPassword123!
```

**Verify Database:**

1. Open SQL Server Management Studio
2. Connect to `127.0.0.1,1433`
3. Verify `WorkflowAutomationDb` database exists
4. Check tables are created:
   - Users
   - Forms
   - FormFields
   - FormSubmissions
   - Workflows
   - WorkflowNodes
   - Approvals
   - Notifications

### 2. Backend API Setup

```bash
# Navigate to Backend directory
cd Backend/src/Api

# Run the API
dotnet run

# Verify it's running
# API should be available at http://localhost:5121
```

**Verify Backend:**

1. Open browser: http://localhost:5121/swagger
2. You should see API documentation
3. Test health endpoint (if available)

### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies (if not done)
npm install

# Run development server
npm run dev

# Frontend should be available at http://localhost:3000
```

**Verify Frontend:**

1. Open browser: http://localhost:3000
2. You should see the login page or redirect to authentication

---

## Detailed Testing Workflows

### WORKFLOW 1: User Registration & Authentication Testing

#### Step 1.1: Register a New User

1. Navigate to: `http://localhost:3000/auth/register`
2. Fill in the registration form:
   - **Email**: `testuser@example.com`
   - **Password**: `Test@123456`
   - **Confirm Password**: `Test@123456`
   - **First Name**: `John`
   - **Last Name**: `Doe`
3. Click "Register" or "Sign Up" button
4. **Expected Result**:
   - User created in database
   - Redirected to login page OR auto-logged in

#### Step 1.2: Login with New User

1. Navigate to: `http://localhost:3000/auth/login`
2. Enter credentials:
   - **Email**: `testuser@example.com`
   - **Password**: `Test@123456`
3. Click "Login" button
4. **Expected Result**:
   - Successful login
   - Redirected to dashboard at `http://localhost:3000/`

#### Step 1.3: Test Protected Routes

1. Try accessing without login:
   - `http://localhost:3000/admin`
   - `http://localhost:3000/forms/new`
   - `http://localhost:3000/workflows/new`
2. **Expected Result**: Redirect to login page

#### Step 1.4: Verify Session Persistence

1. After login, refresh the page
2. **Expected Result**: Stay logged in (session persists)

---

### WORKFLOW 2: Form Builder Testing - Complete Guide

#### Step 2.1: Create a New Form

**Navigate to**: `http://localhost:3000/forms/new`

**Fill in Form Details**:
| Field | Value |
|-------|-------|
| Form Name | `Employee Onboarding Form` |
| Description | `Form to collect new employee information` |
| Category | Select "HR" or create new category |

**Click**: "Create Form" or "Create" button

**Expected Result**: Redirect to form editor at `http://localhost:3000/forms/edit/[form-id]`

---

#### Step 2.2: Add Form Fields Using Drag & Drop

At the form editor, you should see:

- **Left Sidebar**: Field palette with draggable field types
- **Center Canvas**: Drop zone for fields
- **Right Panel**: Field properties editor

**Add these fields in order** (drag from sidebar to canvas):

| #   | Field Type | Field Label               | Field ID                |
| --- | ---------- | ------------------------- | ----------------------- |
| 1   | Text Input | `Full Name`               | `fullName`              |
| 2   | Text Input | `Email Address`           | `email`                 |
| 3   | Text Input | `Phone Number`            | `phone`                 |
| 4   | Number     | `Age`                     | `age`                   |
| 5   | Date       | `Date of Birth`           | `dateOfBirth`           |
| 6   | Dropdown   | `Gender`                  | `gender`                |
| 7   | Radio      | `Employment Type`         | `employmentType`        |
| 8   | Checkbox   | `Skills`                  | `skills`                |
| 9   | Text Input | `Emergency Contact Name`  | `emergencyContactName`  |
| 10  | Text Input | `Emergency Contact Phone` | `emergencyContactPhone` |

**For Dropdown (Gender)**:

- Add options: `Male`, `Female`, `Other`, `Prefer not to say`

**For Radio (Employment Type)**:

- Add options: `Full-time`, `Part-time`, `Contract`, `Intern`

**For Checkbox (Skills)**:

- Add options: `JavaScript`, `TypeScript`, `React`, `Node.js`, `.NET`, `Python`

---

#### Step 2.3: Configure Field Properties

Click on each field and configure:

**Field 1: Full Name**
| Property | Value |
|----------|-------|
| Label | `Full Name` |
| Placeholder | `Enter your full name` |
| Required | `Yes` ✓ |
| Min Length | `2` |
| Max Length | `100` |

**Field 2: Email Address**
| Property | Value |
|----------|-------|
| Label | `Email Address` |
| Placeholder | `Enter your email` |
| Required | `Yes` ✓ |
| Validation Type | `Email` |

**Field 3: Phone Number**
| Property | Value |
|----------|-------|
| Label | `Phone Number` |
| Placeholder | `Enter phone number` |
| Required | `Yes` ✓ |
| Pattern | `^\+?[1-9]\d{1,14}$` |

**Field 4: Age**
| Property | Value |
|----------|-------|
| Label | `Age` |
| Required | `Yes` ✓ |
| Min Value | `18` |
| Max Value | `65` |

**Field 5: Date of Birth**
| Property | Value |
|----------|-------|
| Label | `Date of Birth` |
| Required | `Yes` ✓ |
| Min Date | `01/01/1950` |
| Max Date | (today) |

---

#### Step 2.4: Add Rich Text and Signature Fields

**Add Rich Text Field (About Yourself)**:
| Property | Value |
|----------|-------|
| Field Type | Rich Text (Quill) |
| Label | `About Yourself` |
| Field ID | `aboutYourself` |
| Required | No |

**Add Signature Field**:
| Property | Value |
|----------|-------|
| Field Type | Signature |
| Label | `Your Signature` |
| Field ID | `signature` |
| Required | Yes ✓ |

---

#### Step 2.5: Add File Upload Field

**Add File Upload Field (Resume)**:
| Property | Value |
|----------|-------|
| Field Type | File Upload |
| Label | `Upload Resume` |
| Field ID | `resume` |
| Required | Yes ✓ |
| Allowed File Types | `.pdf,.doc,.docx` |
| Max File Size (MB) | `5` |

---

#### Step 2.6: Save and Preview Form

1. Click **Save** button
2. **Expected**: Form saved successfully (toast notification)
3. Click **Preview** button
4. **Test Preview**:
   - Fill in fields
   - Test validation (try submitting empty required fields)
   - Test field interactions

---

### WORKFLOW 3: Conditional Logic Testing - Complete Guide

We'll create detailed conditions for the **Employee Onboarding Form** created above.

#### Step 3.1: Simple Show/Hide Condition

**Scenario**: Show "Emergency Contact Name" only when Age is less than 18

**Configure Condition on "Emergency Contact Name" field**:

1. Click on `Emergency Contact Name` field
2. Open **Conditions** section in properties panel
3. Add condition:

| Setting    | Value           |
| ---------- | --------------- |
| Action     | `Show`          |
| Operator   | `AND`           |
| Field      | `age`           |
| Comparison | `Less Than (<)` |
| Value      | `18`            |

**Add second condition** (to show when age is empty too):

| Setting    | Value      |
| ---------- | ---------- |
| Operator   | `OR`       |
| Field      | `age`      |
| Comparison | `Is Empty` |

**Test It**:

1. Save form
2. Preview form
3. Enter Age: `25` → Emergency contact fields should be **HIDDEN**
4. Enter Age: `15` → Emergency contact fields should be **SHOWN**
5. Clear Age field → Emergency contact fields should be **SHOWN**

---

#### Step 3.2: Complex Condition with Multiple Operators

**Scenario**: Show different fields based on Employment Type

**Condition for "Skills" Checkbox**:
| Setting | Value |
|---------|-------|
| Action | `Show` |
| Operator | `AND` |
| Field | `employmentType` |
| Comparison | `Equals` |
| Value | `Full-time` |

**Additional condition (OR)**:
| Setting | Value |
|---------|-------|
| Operator | `OR` |
| Field | `employmentType` |
| Comparison | `Equals` |
| Value | `Part-time` |

**Test It**:

1. Select Employment Type: `Full-time` → Skills checkbox **SHOWN**
2. Select Employment Type: `Intern` → Skills checkbox **HIDDEN**

---

#### Step 3.3: Required Field Condition

**Scenario**: Make signature required only for contract employees

**Configure on "Signature" field**:
| Setting | Value |
|---------|-------|
| Condition Type | `Required` |
| Operator | `AND` |
| Field | `employmentType` |
| Comparison | `Equals` |
| Value | `Contract` |

**Test It**:

1. Select Employment Type: `Contract` → Submit without signature → **Validation Error**
2. Select Employment Type: `Full-time` → Submit without signature → **No Error**

---

#### Step 3.4: Email Domain Validation Condition

**Scenario**: Validate email based on company domain

**Create condition on Email field**:
| Setting | Value |
|---------|-------|
| Action | `Show Warning` |
| Custom Message | `Please use your company email` |
| Operator | `AND` |
| Field | `email` |
| Comparison | `Does Not Contain` |
| Value | `@company.com` |

---

#### Step 3.5: Date-Based Condition

**Scenario**: Show "Date of Birth" hint for users under 21

**Create condition on Date of Birth field**:
| Setting | Value |
|---------|-------|
| Action | `Show Info` |
| Custom Message | `You must be at least 18 years old to work here` |
| Operator | `AND` |
| Field | `age` |
| Comparison | `Less Than` |
| Value | `21` |

---

### WORKFLOW 4: Workflow Designer Testing - Complete Guide

#### Step 4.1: Create a New Workflow

**Navigate to**: `http://localhost:3000/workflows/new`

**Fill in Workflow Details**:
| Field | Value |
|-------|-------|
| Workflow Name | `Employee Onboarding Approval` |
| Description | `Workflow for processing new employee onboarding requests` |

Click **Create Workflow**

**Expected Result**: Redirect to workflow editor at `http://localhost:3000/workflows/edit/[workflow-id]`

---

#### Step 4.2: Understand the Workflow Designer Interface

You should see:

- **Left Sidebar**: Node palette with workflow node types
- **Center Canvas**: React Flow canvas for building workflow
- **Top Toolbar**: Save, Test, Publish, Settings buttons
- **Right Panel**: Selected node properties

**Node Types Available**:
| Node | Icon | Purpose |
|------|------|---------|
| Trigger | ⚡ | Starts the workflow |
| Condition | 🔀 | If/else branching |
| Action | ⚙️ | Perform operations |
| Approval | ✅ | Request approval |
| Wait | ⏱️ | Delay/duration |
| Script | 📝 | Custom scripts |
| End | 🏁 | Terminate workflow |

---

#### Step 4.3: Build the Approval Workflow

**Create this workflow structure**:

```
[Trigger: Form Submission] → [Condition: Check Amount] → [Approval: Manager Approval] → [Action: Send Notification] → [End: Complete]
                                  |
                                  └→ [Action: Auto-Approve] → [End]
```

**Step-by-Step Build**:

1. **Add Trigger Node**
   - Drag "Trigger" node to canvas
   - Click to configure:
     | Property | Value |
     |----------|-------|
     | Trigger Type | `Form Submission` |
     | Form | Select `Employee Onboarding Form` |

2. **Add Condition Node**
   - Drag "Condition" node to canvas
   - Connect Trigger → Condition (drag from trigger output to condition input)
   - Click to configure:
     | Property | Value |
     |----------|-------|
     | Condition Name | `Check Employment Type` |
     | Field | `employmentType` |
     | Operator | `Equals` |
     | Value | `Contract` |

3. **Add Approval Node (for Contract employees)**
   - Drag "Approval" node to canvas
   - Connect Condition → Approval (connect to "True" output)
   - Configure:
     | Property | Value |
     |----------|-------|
     | Approval Type | `Single` |
     | Approver | Select a user or role |
     | Deadline | `24` hours |
     | Escalation | Enable |

4. **Add Action Node (Send Notification)**
   - Drag "Action" node to canvas
   - Connect Approval → Action
   - Configure:
     | Property | Value |
     |----------|-------|
     | Action Type | `Send Notification` |
     | To | `Form Submitter` |
     | Message | `Your onboarding form has been received` |

5. **Add Auto-Approve Action Node (for non-contract)**
   - Drag "Action" node to canvas
   - Connect Condition → Action (connect to "False" output)
   - Configure:
     | Property | Value |
     |----------|-------|
     | Action Type | `Update Status` |
     | Status | `Approved` |

6. **Add End Nodes**
   - Drag two "End" nodes
   - Connect each path to an End node
   - Label one "Approved" and other "Pending Review"

---

#### Step 4.4: Configure Each Node Type in Detail

**Trigger Node Configuration**:
| Property | Description | Example Value |
|----------|-------------|----------------|
| Type | What triggers the workflow | `Form Submission` |
| Form | Which form triggers it | `Employee Onboarding Form` |
| Event | Specific event | `On Submit` |

**Condition Node Configuration**:
| Property | Description | Example Value |
|----------|-------------|----------------|
| Name | Condition label | `Check Amount` |
| Field | Form field to evaluate | `employmentType` |
| Operator | Comparison type | `Equals`, `Contains`, `Greater Than` |
| Value | Comparison value | `Contract` |
| Logic | Combine multiple conditions | `AND`, `OR` |

**Approval Node Configuration**:
| Property | Description | Example Value |
|----------|-------------|----------------|
| Approval Type | Single or Multiple | `Single` |
| Approvers | Who approves | `Manager Role` |
| Approval Levels | Number of levels | `1` |
| Deadline | Hours to respond | `24` |
| Escalation | Enable escalation | `Yes` |
| Escalation After | Hours before escalation | `12` |
| Escalation To | Who receives escalation | `Director` |

**Action Node Configuration**:
| Property | Description | Example Value |
|----------|-------------|----------------|
| Action Type | What to do | `Send Notification` |
| To | Recipient | `Form Submitter` |
| Subject | Email subject | `Form Received` |
| Message | Content | `Your form has been submitted` |

**Wait Node Configuration**:
| Property | Description | Example Value |
|----------|-------------|----------------|
| Duration | How long to wait | `24` |
| Unit | Hours/Days/Weeks | `Hours` |

**Script Node Configuration**:
| Property | Description | Example Value |
|----------|-------------|----------------|
| Script | JavaScript code | `return data.age >= 18;` |

---

#### Step 4.5: Test the Workflow

1. Click **Test Workflow** button in toolbar
2. A modal will appear with test input fields
3. Fill in test data:

| Field          | Test Value 1       | Test Value 2       |
| -------------- | ------------------ | ------------------ |
| fullName       | `John Doe`         | `Jane Smith`       |
| email          | `john@company.com` | `jane@company.com` |
| age            | `25`               | `17`               |
| employmentType | `Full-time`        | `Contract`         |

4. Click **Run Test**
5. View results:
   - For Test 1 (Full-time): Should skip approval, go to auto-approve
   - For Test 2 (Contract): Should go to approval node

6. Check execution timeline to verify path taken

---

#### Step 4.6: Publish the Workflow

1. Click **Publish** button
2. Confirm publishing
3. **Status should change to**: `Active` / `Published`

---

### WORKFLOW 5: Form Submission & Approval Testing

#### Step 5.1: Submit the Employee Onboarding Form

**Navigate to**: `http://localhost:3000/forms/submit/[form-id]`

_(Replace [form-id] with the ID of the Employee Onboarding Form you created)_

**Fill in the Form**:

| Field                   | Value (Test 1)         | Value (Test 2)           |
| ----------------------- | ---------------------- | ------------------------ |
| Full Name               | `John Doe`             | `Jane Smith`             |
| Email Address           | `john.doe@company.com` | `jane.smith@company.com` |
| Phone Number            | `+1234567890`          | `+0987654321`            |
| Age                     | `28`                   | `17`                     |
| Date of Birth           | `1996-05-15`           | `2008-03-20`             |
| Gender                  | `Male`                 | `Female`                 |
| Employment Type         | `Full-time`            | `Contract`               |
| Skills                  | `JavaScript`, `React`  | (none)                   |
| Emergency Contact Name  | (leave empty)          | `Emergency Contact`      |
| Emergency Contact Phone | (leave empty)          | `+1122334455`            |

**Click Submit**

**Expected Results**:

- Form submitted successfully
- Confirmation message shown
- Redirected to submissions list

---

#### Step 5.2: View Submission in Submissions List

**Navigate to**: `http://localhost:3000/submissions`

**Verify Submission**:

1. Find your submission in the list
2. Click on the submission
3. View all submitted data at `http://localhost:3000/submissions/[submission-id]`

**Verify Conditional Logic Worked**:

- For Test 1 (Age 28): Emergency contact fields should be HIDDEN (in submission)
- For Test 2 (Age 17): Emergency contact fields should be SHOWN (in submission)

---

#### Step 5.3: Check Workflow Execution

**Navigate to**: `http://localhost:3000/workflows/executions`

**View Execution Details**:

1. Find the workflow execution for your submission
2. Click to view details at `http://localhost:3000/workflows/executions/[execution-id]`

**Verify Path Taken**:

- For Test 1 (Full-time): Should have taken "False" path → Auto-approve
- For Test 2 (Contract): Should have taken "True" path → Approval

---

#### Step 5.4: Process Approval (for Contract Employee)

**As Approver**:

1. Navigate to: `http://localhost:3000/approvals`
2. Find pending approval for "Jane Smith" submission
3. Click on the approval

**Review Submission**:

1. View all submitted form data
2. Review workflow execution timeline

**Take Action**:

| Action      | Description            | Result                            |
| ----------- | ---------------------- | --------------------------------- |
| **Approve** | Accept the submission  | Moves to next level or completes  |
| **Reject**  | Reject the submission  | Notifies submitter, workflow ends |
| **Return**  | Return for corrections | Sends back to submitter           |

**Click Approve**

**Verify**:

- Approval recorded
- Notification sent to submitter
- Submission status updated

---

#### Step 5.5: Test Notifications

**Navigate to**: `http://localhost:3000/notifications`

**Verify Notifications**:

1. Find notification about approval decision
2. Click notification to view details

---

### WORKFLOW 6: Admin & Configuration Testing

#### Step 6.1: User Management

**Navigate to**: `http://localhost:3000/admin/users`

**Test Cases**:

1. **View Users**: See list of all users
2. **Add User**: Create new user manually
3. **Edit User**: Modify user details
4. **Disable User**: Deactivate a user account

---

#### Step 6.2: Role Management

**Navigate to**: `http://localhost:3000/admin/roles`

**Test Cases**:

1. **View Roles**: See existing roles (Admin, User, Manager, etc.)
2. **Create Role**: Add new role (e.g., "HR Manager")
3. **Assign Permissions**: Set permissions for role
4. **Edit Role**: Modify role permissions

---

#### Step 6.3: Form Categories

**Navigate to**: `http://localhost:3000/categories`

**Test Cases**:

1. **Create Category**: Add "Onboarding", "Leave Request", etc.
2. **Edit Category**: Modify category name/description
3. **Delete Category**: Remove category (if no forms assigned)
4. **Assign Forms**: Link forms to categories

---

#### Step 6.4: Audit Logs

**Navigate to**: `http://localhost:3000/admin/audit-logs`

**Verify Actions Logged**:
| Action | Expected Log Entry |
|--------|-------------------|
| User Login | Login event |
| Form Created | Form created event |
| Form Submitted | Submission event |
| Approval Action | Approval approved/rejected event |
| Settings Changed | Configuration change event |

**Test Filtering**:

- Filter by date range
- Filter by user
- Filter by action type

---

#### Step 6.5: System Settings

**Navigate to**: `http://localhost:3000/admin/settings`

**Test Settings**:

1. **General Settings**: Company name, logo, timezone
2. **Notification Settings**: Email notifications, in-app notifications
3. **Approval Settings**: Default deadlines, escalation rules

---

### WORKFLOW 7: Templates & Reusability Testing

#### Step 7.1: Create Form Template

1. Create a form with common fields
2. Navigate to: `http://localhost:3000/templates/new`
3. Save as template:
   | Field | Value |
   |-------|-------|
   | Template Name | `Standard Onboarding` |
   | Description | `Basic employee onboarding form` |
   | Category | `Onboarding` |

---

#### Step 7.2: Use Template to Create New Form

1. Navigate to: `http://localhost:3000/templates`
2. Find your template
3. Click "Use Template" or "Create Form from Template"
4. New form created with all fields from template
5. Modify as needed

---

## API Testing Reference

### Key API Endpoints

| Module            | Endpoint                      | Method | Description        |
| ----------------- | ----------------------------- | ------ | ------------------ |
| **Forms**         | `/api/forms`                  | GET    | List all forms     |
|                   | `/api/forms`                  | POST   | Create new form    |
|                   | `/api/forms/{id}`             | GET    | Get form by ID     |
|                   | `/api/forms/{id}`             | PUT    | Update form        |
|                   | `/api/forms/{id}`             | DELETE | Delete form        |
| **Form Fields**   | `/api/forms/{formId}/fields`  | GET    | Get form fields    |
|                   | `/api/forms/{formId}/fields`  | POST   | Add field          |
| **Submissions**   | `/api/submissions`            | GET    | List submissions   |
|                   | `/api/submissions`            | POST   | Submit form        |
|                   | `/api/submissions/{id}`       | GET    | Get submission     |
| **Workflows**     | `/api/workflows`              | GET    | List workflows     |
|                   | `/api/workflows`              | POST   | Create workflow    |
|                   | `/api/workflows/{id}`         | GET    | Get workflow       |
|                   | `/api/workflows/{id}/execute` | POST   | Execute workflow   |
| **Approvals**     | `/api/approvals`              | GET    | List approvals     |
|                   | `/api/approvals/{id}`         | GET    | Get approval       |
|                   | `/api/approvals/{id}/approve` | POST   | Approve            |
|                   | `/api/approvals/{id}/reject`  | POST   | Reject             |
| **Categories**    | `/api/formcategories`         | GET    | List categories    |
|                   | `/api/formcategories`         | POST   | Create category    |
| **Users**         | `/api/users`                  | GET    | List users         |
|                   | `/api/users/{id}`             | GET    | Get user           |
| **Notifications** | `/api/notifications`          | GET    | List notifications |

### Testing API with curl

```bash
# Get all forms
curl http://localhost:5121/api/forms

# Create a form
curl -X POST http://localhost:5121/api/forms \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Form","description":"Test"}'

# Get submissions
curl http://localhost:5121/api/submissions
```

---

## Troubleshooting

### Issue 1: Database Connection Failed

**Symptoms**: Error connecting to database

**Solution**:

```bash
# 1. Check SQL Server is running
# 2. Verify connection in .env.local:
DB_SERVER=127.0.0.1
DB_PORT=1433
DB_NAME=WorkflowAutomationDb
DB_USER=sa
DB_PASSWORD=YourStrongPassword123!

# 3. Test connection with SQL Server Management Studio
```

---

### Issue 2: Frontend Not Loading

**Symptoms**: Page not loading, blank screen

**Solution**:

```bash
# 1. Clear node_modules and reinstall
cd frontend
rm -rf node_modules
npm install

# 2. Clear .next folder
rm -rf .next

# 3. Rebuild
npm run dev
```

---

### Issue 3: API Not Responding

**Symptoms**: API calls fail, connection refused

**Solution**:

```bash
# 1. Check API is running
cd Backend/src/Api
dotnet run

# 2. Verify port 5121 is not blocked
# 3. Check CORS settings in Program.cs
```

---

### Issue 4: Drag and Drop Not Working

**Symptoms**: Can't drag fields in form builder

**Solution**:

1. Check browser console for JavaScript errors
2. Verify @dnd-kit packages are installed
3. Clear browser cache
4. Try in different browser

---

### Issue 5: Workflow Nodes Not Connecting

**Symptoms**: Can't connect nodes in workflow designer

**Solution**:

1. Check React Flow is properly configured
2. Verify node handles are visible
3. Check console for errors

---

### Issue 6: Real-time Updates Not Working

**Symptoms**: Notifications not appearing in real-time

**Solution**:

```bash
# 1. Check SignalR is configured
# 2. Verify WebSocket is enabled in browser
# 3. Check firewall allows WebSocket connections
# 4. Check SignalR service is running
```

---

## Test Summary Checklist

Use this checklist to track testing progress:

### Authentication

- [ ] User registration works
- [ ] Login works
- [ ] Session persists
- [ ] Protected routes work

### Form Builder

- [ ] Create new form
- [ ] Drag and drop fields work
- [ ] All field types work (text, number, date, dropdown, radio, checkbox, file, signature, rich text)
- [ ] Field validation works
- [ ] Form preview works
- [ ] Form saves correctly

### Conditional Logic

- [ ] Show/hide conditions work
- [ ] Required field conditions work
- [ ] Complex conditions (AND/OR) work
- [ ] Conditions evaluate correctly

### Workflow Designer

- [ ] Create workflow
- [ ] Add all node types
- [ ] Connect nodes
- [ ] Configure trigger
- [ ] Configure conditions
- [ ] Configure approvals
- [ ] Configure actions
- [ ] Test workflow
- [ ] Publish workflow

### Form Submission & Approval

- [ ] Submit form
- [ ] View submissions
- [ ] Workflow triggers on submission
- [ ] Approval created
- [ ] Approve/reject works
- [ ] Notifications sent

### Admin

- [ ] User management
- [ ] Role management
- [ ] Categories
- [ ] Audit logs
- [ ] Settings

---

_Last Updated: Based on Backend/README.md specifications and frontend implementation_
_For source code references, see the original WORKFLOW.md file_

# Task 04: Test and Validate

**Estimated Time:** 30 minutes  
**Priority:** High  
**Status:** ⏳ Pending  
**Depends On:** Tasks 01, 02, 03

---

## 🎯 Objective

Test the workflow system with real OpenCode agents and validate that all components work correctly.

---

## 📋 Test Plan

### Test 1: Basic Workflow Execution
**Goal:** Verify workflows execute and complete successfully

```bash
# Test feature workflow
/workflow feature "Add user authentication"

# Expected:
# ✅ Creates plan session
# ✅ Waits for plan to complete
# ✅ Creates build session with plan context
# ✅ Waits for build to complete
# ✅ Creates test session with build context
# ✅ Returns success message
```

**Validation:**
- [ ] Workflow starts without errors
- [ ] Each step creates a session
- [ ] Sessions complete successfully
- [ ] Context passes between steps
- [ ] Final result is returned
- [ ] Success message is displayed

---

### Test 2: Custom Agent Workflow
**Goal:** Verify OpenAgents custom agents work in workflows

```bash
# Test analyze workflow
/workflow analyze "Analyze authentication module"

# Expected:
# ✅ Uses researcher agent (OpenAgents)
# ✅ Uses reviewer agent (OpenAgents)
# ✅ Context passes from researcher to reviewer
# ✅ Returns analysis results
```

**Validation:**
- [ ] Custom agents are resolved correctly
- [ ] Custom agents execute via sessions
- [ ] Context passes between custom agents
- [ ] Results are extracted correctly

---

### Test 3: Error Handling
**Goal:** Verify error handling and retries work

```bash
# Test workflow with potential errors
/workflow refactor "Refactor complex module"

# Expected:
# ✅ If step fails, retries up to max_retries
# ✅ If still fails, routes to error handler
# ✅ Error handler attempts recovery
# ✅ Workflow continues or fails gracefully
```

**Validation:**
- [ ] Retries work correctly
- [ ] Error handlers are invoked
- [ ] Error messages are clear
- [ ] Workflow fails gracefully if unrecoverable

---

### Test 4: Timeout Handling
**Goal:** Verify timeouts are enforced

```bash
# Test workflow with short timeout
# (Modify workflow to have very short timeout for testing)

# Expected:
# ❌ Step times out after specified duration
# ❌ Workflow fails with timeout error
```

**Validation:**
- [ ] Timeouts are enforced
- [ ] Timeout errors are clear
- [ ] Workflow stops on timeout

---

### Test 5: Context Passing
**Goal:** Verify context flows correctly between steps

```bash
# Test feature workflow with specific input
/workflow feature "Create login endpoint with JWT"

# Expected:
# ✅ Plan receives input
# ✅ Build receives plan output
# ✅ Test receives build output
# ✅ Each step can access previous results
```

**Validation:**
- [ ] Input reaches first step
- [ ] Each step receives previous step output
- [ ] Context is properly formatted
- [ ] Context is accessible in prompts

---

### Test 6: Tool and MCP Integration
**Goal:** Verify agents use their configured tools and MCPs

```bash
# Test workflow that requires tools
/workflow feature "Add file upload feature"

# Expected:
# ✅ Build agent uses write/edit tools
# ✅ Test agent uses bash tool
# ✅ Tools execute correctly
# ✅ MCPs are available if configured
```

**Validation:**
- [ ] Agents have access to configured tools
- [ ] Tools execute successfully
- [ ] Tool results are returned
- [ ] MCPs work if configured

---

### Test 7: Missing Workflow
**Goal:** Verify error handling for missing workflows

```bash
# Test with non-existent workflow
/workflow nonexistent

# Expected:
# ❌ Error: Workflow 'nonexistent' not found
```

**Validation:**
- [ ] Clear error message
- [ ] No crash or hang
- [ ] Helpful error message

---

### Test 8: Invalid Workflow
**Goal:** Verify validation of workflow definitions

```bash
# Create invalid workflow (missing required fields)
# Test with invalid workflow

# Expected:
# ❌ Validation error with details
```

**Validation:**
- [ ] Workflow validation works
- [ ] Clear validation errors
- [ ] Workflow doesn't execute if invalid

---

## 🔍 Manual Verification

### Check Session Creation
```bash
# During workflow execution, check sessions
# (In another terminal or via OpenCode UI)

# Verify:
# - Sessions are created for each step
# - Sessions have correct agent names
# - Sessions complete and are cleaned up
```

### Check Logs
```bash
# Check console logs for:
# - Workflow execution start
# - Step execution
# - Session creation/cleanup
# - Errors and warnings
```

### Check Results
```bash
# Verify workflow results:
# - Results are extracted correctly
# - Results contain expected data
# - Results are formatted properly
```

---

## 🐛 Common Issues and Fixes

### Issue: Session creation fails
**Symptoms:** Error creating session for agent  
**Fix:** Check agent is registered, check OpenCode is running

### Issue: Session never completes
**Symptoms:** Workflow hangs, timeout after 5 minutes  
**Fix:** Check agent is responding, check for infinite loops

### Issue: Context not passing
**Symptoms:** Steps don't receive previous results  
**Fix:** Check `input` field in workflow, check result extraction

### Issue: Tools not working
**Symptoms:** Agent can't use tools  
**Fix:** Check agent tool configuration, check permissions

### Issue: Workflow not found
**Symptoms:** Error loading workflow  
**Fix:** Check file exists in `.openagents/workflows/`, check JSON is valid

---

## ✅ Acceptance Criteria

- [ ] All 8 tests pass
- [ ] Workflows execute successfully
- [ ] Custom agents work
- [ ] Error handling works
- [ ] Timeouts work
- [ ] Context passing works
- [ ] Tools and MCPs work
- [ ] Error messages are clear
- [ ] No crashes or hangs
- [ ] Sessions are cleaned up

---

## 📝 Test Results

Document test results here:

### Test 1: Basic Workflow Execution
- Status: ⏳ Not tested
- Notes:

### Test 2: Custom Agent Workflow
- Status: ⏳ Not tested
- Notes:

### Test 3: Error Handling
- Status: ⏳ Not tested
- Notes:

### Test 4: Timeout Handling
- Status: ⏳ Not tested
- Notes:

### Test 5: Context Passing
- Status: ⏳ Not tested
- Notes:

### Test 6: Tool and MCP Integration
- Status: ⏳ Not tested
- Notes:

### Test 7: Missing Workflow
- Status: ⏳ Not tested
- Notes:

### Test 8: Invalid Workflow
- Status: ⏳ Not tested
- Notes:

---

## 🔗 Related Files

- `src/workflow/opencode-agent-executor.ts` - Agent executor
- `src/plugin/index.ts` - Plugin integration
- `.openagents/workflows/*.json` - Example workflows

---

## ⏭️ Next Task

After completing this task, proceed to:
- `05-documentation.md` - Document the workflow system

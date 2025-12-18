# OpenAgents v1 - Quick Start

**Ready to build? Start here!**

---

## 🎯 What We're Building

A **minimal multi-agent plugin** (~300 lines) that:
- ✅ Tracks parallel agents
- ✅ Shows toast notifications
- ✅ Shares context via JSON files
- ✅ Handles 3k text limit
- ✅ Uses free models

---

## 📚 Read These (In Order)

1. **[README.md](./README.md)** - Overview & philosophy (5 min)
2. **[v1-implementation.md](./v1-implementation.md)** - Step-by-step code (30 min)
3. **[v1-config.md](./v1-config.md)** - Configuration reference (10 min)

---

## 🚀 Implementation Checklist

### **Files to Create** (~300 lines total):

- [ ] `src/features/task-tracker.ts` (~50 lines)
- [ ] `src/features/context.ts` (~50 lines)
- [ ] `src/features/ui.ts` (~30 lines)
- [ ] `src/utils/chunker.ts` (~100 lines)
- [ ] `src/features/index.ts` (~5 lines)
- [ ] `src/utils/index.ts` (~5 lines)

### **Files to Update**:

- [ ] `src/config/schema.ts` (simplify)
- [ ] `src/plugin/index.ts` (wire features)

---

## ⏱️ Time Estimate

- **Setup**: 30 min
- **Core features**: 4 hours
- **Integration**: 2 hours
- **Testing**: 1.5 hours

**Total**: ~8 hours

---

## ✅ Success Criteria

When done, you should be able to:

1. Launch 3 agents in parallel
2. See toasts: "🚀 agent started"
3. See toasts: "✅ agent completed (Xs)"
4. Find context files in `.openagents/context/`
5. No crashes with large text

---

## 🎬 Next Steps

1. Read [v1-implementation.md](./v1-implementation.md)
2. Start with Step 1 (config schema)
3. Work through steps 2-7
4. Test manually
5. Ship it!

---

**Let's build this! 🚀**

# Project TODO

---

## DevOps & Configuration

### GitHub Secrets Setup by @29DianaYakubuk

- [ ] Add `MONGODB_URI` to GitHub repository secrets
  - Go to: Repository Settings → Secrets and variables → Actions → New repository secret
  - Name: `MONGODB_URI`
  - Value: Get from `.env.local` file (DO N
  - OT commit this value!)
  - After adding, uncomment MONGODB_URI in `.github/workflows/ci.yml` (lines 82, 111)

---

## Post-MVP Enhancements

### Phase 2: Task Activity/Comments

- [ ] useTaskActivities React hook
- [ ] ActivityTimeline component
- [ ] ActivityItem component
- [ ] Activity tab in TaskDetailsDrawer
- [ ] Comment creation and display
- [ ] Activity logging for all task changes

### Phase 3: Task Templates

- [ ] Template data model and MongoDB schema
- [ ] `/api/templates` CRUD endpoints
- [ ] `/api/templates/[id]/apply` endpoint
- [ ] useTemplates React hook
- [ ] TemplateSelector component
- [ ] TemplateCard component
- [ ] Template integration in CreateTaskModal
- [ ] "Save as Template" feature in TaskDetailsDrawer

### Phase 4: Undo/Redo Functionality

- [ ] useUndoRedo hook with Command pattern
- [ ] Command builders for each operation type
- [ ] UndoRedoButtons component
- [ ] Board component integration
- [ ] Keyboard shortcuts: Ctrl+Z (undo), Ctrl+Y (redo)
- [ ] Session-based history (50 actions max)

---

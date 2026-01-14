# Database Documentation

This document covers the database setup, schema, migrations, and maintenance scripts for the Admin Panel (Kanban Board).

## Table of Contents

- [Database Overview](#database-overview)
- [Schema](#schema)
- [Seed Data](#seed-data)
- [Migrations](#migrations)
- [Backup & Restore](#backup--restore)
- [Troubleshooting](#troubleshooting)

---

## Database Overview

### Technology

- **Database**: MongoDB
- **ODM**: Mongoose
- **Hosting**: MongoDB Atlas (recommended for production)

### Connection

The application connects to MongoDB using the connection string from environment variables:

```typescript
// src/lib/mongodb.ts
const MONGODB_URI = process.env.MONGODB_URI!;
```

Make sure to set `MONGODB_URI` in your `.env.local` file (see [.env.example](./.env.example)).

---

## Schema

### Task Model

Location: `src/models/Task.ts`

```typescript
{
  title: String,              // Required, max 200 chars
  description: String,        // Optional, max 2000 chars
  status: String,             // Enum: 'Backlog', 'Todo', 'In Progress', 'Done'
  priority: String,           // Enum: 'low', 'medium', 'high', 'critical'
  tags: [String],            // Array of tag names
  assignee: {
    name: String,            // Assignee name
    color: String            // Avatar color (hex)
  },
  dueDate: Date,             // Optional due date
  order: Number,             // Position within column (for drag & drop)
  createdAt: Date,           // Auto-generated
  updatedAt: Date            // Auto-updated
}
```

### Field Validation

#### Title

- **Required**: Yes
- **Type**: String
- **Min length**: 1 character (after trim)
- **Max length**: 200 characters
- **Validation**: Trimmed, sanitized against XSS

#### Description

- **Required**: No
- **Type**: String
- **Max length**: 2000 characters
- **Validation**: Trimmed, sanitized against XSS

#### Status

- **Required**: Yes
- **Type**: String (Enum)
- **Allowed values**: `Backlog`, `Todo`, `In Progress`, `Done`
- **Default**: `Backlog`

#### Priority

- **Required**: No
- **Type**: String (Enum)
- **Allowed values**: `low`, `medium`, `high`, `critical`
- **Default**: `medium`

#### Tags

- **Required**: No
- **Type**: Array of Strings
- **Default**: `[]`
- **Validation**: Each tag sanitized

#### Assignee

- **Required**: No
- **Type**: Object
- **Fields**:
  - `name`: String
  - `color`: String (hex color code)

#### Due Date

- **Required**: No
- **Type**: Date
- **Validation**: Must be a valid date

#### Order

- **Required**: Yes
- **Type**: Number
- **Default**: `0`
- **Purpose**: Defines position within column for drag & drop ordering

---

## Seed Data

### Purpose

The seed script (`scripts/seed.ts`) populates the database with sample tasks for development and testing.

### Running the Seed Script

```bash
# Seed the database with sample data
npm run db:seed
```

### What it Does

1. Connects to MongoDB using `MONGODB_URI` from `.env.local`
2. **Clears all existing tasks** (⚠️ Warning: This deletes all data!)
3. Inserts 10 sample tasks across all columns:
   - 2 tasks in **Done**
   - 2 tasks in **In Progress**
   - 3 tasks in **Todo**
   - 3 tasks in **Backlog**
4. Disconnects from database

### Sample Tasks

The seed script includes realistic sample data:

```javascript
[
  {
    title: 'Set up project structure',
    description: 'Initialize the project with Next.js, TypeScript, and Tailwind CSS',
    status: 'Done',
    priority: 'high',
    tags: ['setup', 'infrastructure'],
    assignee: { name: 'Diana', color: '#6366f1' },
  },
  // ... 9 more tasks
];
```

### Customizing Seed Data

To add your own seed data:

1. Open `scripts/seed.ts`
2. Modify the `seedTasks` array (lines 41-128)
3. Run `npm run db:seed`

**Example:**

```typescript
const seedTasks = [
  {
    title: 'Your Custom Task',
    description: 'Task description here',
    status: 'Todo',
    priority: 'high',
    tags: ['custom'],
    order: 0,
  },
  // Add more tasks...
];
```

### ⚠️ Important Warnings

- **The seed script deletes ALL existing tasks**
- **Never run this in production** unless you want to reset the database
- Create a backup before running (see [Backup & Restore](#backup--restore))

---

## Migrations

### Current State

The application currently **does not use traditional migrations** because:

1. MongoDB is schema-less (flexible schema)
2. Mongoose handles schema validation at the application level
3. The schema has been stable since initial release

### Schema Evolution Strategy

When the schema needs to change (e.g., adding new fields), follow this process:

#### Option 1: Additive Changes (Recommended)

For backwards-compatible changes (adding optional fields):

1. **Update the Mongoose Model**

   ```typescript
   // src/models/Task.ts
   const TaskSchema = new Schema({
     // ... existing fields
     newField: { type: String, default: '' }, // Add new field
   });
   ```

2. **Deploy** - Existing documents will use the default value

3. **No migration needed** - MongoDB handles missing fields gracefully

#### Option 2: Breaking Changes (Requires Migration)

For non-backwards-compatible changes (renaming fields, changing types):

1. **Create a migration script**

   ```typescript
   // scripts/migrations/001-rename-field.ts
   import mongoose from 'mongoose';
   import Task from '@/models/Task';

   async function migrate() {
     await mongoose.connect(process.env.MONGODB_URI!);

     // Update all documents
     await Task.updateMany({ oldField: { $exists: true } }, { $rename: { oldField: 'newField' } });

     await mongoose.disconnect();
   }

   migrate();
   ```

2. **Test on development database**

   ```bash
   tsx scripts/migrations/001-rename-field.ts
   ```

3. **Backup production database** (see [Backup & Restore](#backup--restore))

4. **Run migration on production**

5. **Update the model** to reflect new schema

6. **Deploy** the updated application

### Future: Automated Migrations

If the application grows and requires frequent schema changes, consider using:

- **migrate-mongo**: MongoDB migration tool
- **Flyway**: Database migration tool
- **Custom migration system**: Track migration versions in a separate collection

---

## Backup & Restore

### MongoDB Atlas Backup (Automatic)

If using MongoDB Atlas, backups are **automatic**:

- **M2+ clusters**: Continuous backups with point-in-time restore
- **M0 (free tier)**: No automatic backups (manual export recommended)

To restore from backup (M2+ only):

1. Go to MongoDB Atlas Dashboard
2. Navigate to your cluster
3. Click "Backups" tab
4. Select a snapshot or point in time
5. Click "Restore"

### Manual Backup (mongodump)

For manual backups or free tier clusters:

```bash
# Install MongoDB Database Tools
brew install mongodb/brew/mongodb-database-tools  # macOS
# OR
sudo apt install mongodb-database-tools           # Linux

# Export all data
mongodump --uri="mongodb+srv://user:pass@cluster.mongodb.net/admin-panel" \
          --out=./backups/$(date +%Y%m%d)

# Export specific collection
mongodump --uri="mongodb+srv://user:pass@cluster.mongodb.net/admin-panel" \
          --collection=tasks \
          --out=./backups/tasks-$(date +%Y%m%d)
```

### Manual Restore (mongorestore)

```bash
# Restore entire database
mongorestore --uri="mongodb+srv://user:pass@cluster.mongodb.net/admin-panel" \
             ./backups/20260111

# Restore specific collection
mongorestore --uri="mongodb+srv://user:pass@cluster.mongodb.net/admin-panel" \
             --collection=tasks \
             ./backups/tasks-20260111/admin-panel/tasks.bson

# Drop existing data before restore
mongorestore --uri="mongodb+srv://user:pass@cluster.mongodb.net/admin-panel" \
             --drop \
             ./backups/20260111
```

### Automated Backup Script

Create a cron job for automated backups:

```bash
#!/bin/bash
# scripts/backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups/$DATE"
MONGODB_URI="your-connection-string"

mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR"

# Keep only last 7 days of backups
find ./backups -type d -mtime +7 -exec rm -rf {} +

echo "Backup completed: $BACKUP_DIR"
```

Add to crontab (runs daily at 2 AM):

```bash
0 2 * * * /path/to/scripts/backup.sh
```

---

## Database Maintenance

### Indexing

The application automatically creates indexes via Mongoose:

```typescript
// Indexes defined in src/models/Task.ts
TaskSchema.index({ status: 1, order: 1 }); // For efficient column queries
TaskSchema.index({ createdAt: -1 }); // For sorting by creation date
TaskSchema.index({ tags: 1 }); // For tag filtering
```

### Verify Indexes

```bash
# Connect to MongoDB
mongosh "mongodb+srv://cluster.mongodb.net/admin-panel" --username <user>

# List all indexes
db.tasks.getIndexes()

# Check index usage
db.tasks.aggregate([{ $indexStats: {} }])
```

### Performance Monitoring

**Check slow queries:**

In MongoDB Atlas:

1. Go to "Performance Advisor"
2. Review recommended indexes
3. Check slow queries in "Profiler"

**Query Performance:**

```javascript
// Enable profiling in MongoDB shell
db.setProfilingLevel(1, { slowms: 100 }); // Log queries slower than 100ms

// View slow queries
db.system.profile.find().sort({ ts: -1 }).limit(10);
```

### Database Statistics

```bash
# Connect to MongoDB shell
mongosh "mongodb+srv://cluster.mongodb.net/admin-panel"

# Collection statistics
db.tasks.stats()

# Database size
db.stats()

# Count documents
db.tasks.countDocuments()
```

---

## Troubleshooting

### Connection Issues

**Problem:** `MongooseError: Operation buffering timed out`

**Solutions:**

- Verify `MONGODB_URI` is set correctly
- Check MongoDB Atlas IP whitelist
- Ensure cluster is running (not paused)
- Test connection with `mongosh`:
  ```bash
  mongosh "your-mongodb-uri"
  ```

### Seed Script Fails

**Problem:** `Error seeding database: MongoServerError`

**Solutions:**

- Check database user permissions (needs write access)
- Verify database name in connection string
- Ensure `.env.local` file exists with `MONGODB_URI`
- Run with verbose logging:
  ```bash
  DEBUG=* npm run db:seed
  ```

### Slow Queries

**Problem:** Tasks loading slowly

**Solutions:**

- Check indexes are created (`db.tasks.getIndexes()`)
- Add pagination for large datasets
- Use MongoDB Atlas Performance Advisor
- Enable query profiling to identify slow operations

### Data Corruption

**Problem:** Tasks have invalid data

**Solutions:**

1. Restore from backup
2. Run data validation script:

   ```typescript
   // scripts/validate-data.ts
   import Task from '@/models/Task';

   const tasks = await Task.find({});
   const invalid = tasks.filter((task) => {
     return !task.title || !task.status;
   });

   console.log(`Found ${invalid.length} invalid tasks`);
   ```

3. Fix invalid documents:
   ```javascript
   db.tasks.updateMany(
     { status: { $nin: ['Backlog', 'Todo', 'In Progress', 'Done'] } },
     { $set: { status: 'Backlog' } }
   );
   ```

### Duplicate Entries

**Problem:** Same task appears multiple times

**Solutions:**

1. Find duplicates:

   ```javascript
   db.tasks.aggregate([
     { $group: { _id: '$title', count: { $sum: 1 } } },
     { $match: { count: { $gt: 1 } } },
   ]);
   ```

2. Remove duplicates (keep newest):
   ```javascript
   // In MongoDB shell
   db.tasks
     .aggregate([
       { $sort: { title: 1, createdAt: -1 } },
       {
         $group: {
           _id: '$title',
           docs: { $push: '$_id' },
           count: { $sum: 1 },
         },
       },
       { $match: { count: { $gt: 1 } } },
     ])
     .forEach((doc) => {
       doc.docs.shift(); // Keep first (newest)
       db.tasks.deleteMany({ _id: { $in: doc.docs } });
     });
   ```

---

## Best Practices

1. **Always backup before migrations**

   ```bash
   npm run db:backup  # (if script exists)
   ```

2. **Test schema changes in development first**
   - Create a test database
   - Run migrations
   - Verify data integrity

3. **Use transactions for critical operations**

   ```typescript
   const session = await mongoose.startSession();
   session.startTransaction();
   try {
     await Task.create([...], { session });
     await session.commitTransaction();
   } catch (error) {
     await session.abortTransaction();
   } finally {
     session.endSession();
   }
   ```

4. **Monitor database size**
   - Set up alerts in MongoDB Atlas
   - Archive old completed tasks if needed

5. **Regular maintenance**
   - Review indexes quarterly
   - Clean up orphaned data
   - Optimize queries based on profiler data

---

## Additional Resources

- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com)
- [Mongoose Documentation](https://mongoosejs.com/docs/)
- [MongoDB Schema Design Best Practices](https://www.mongodb.com/developer/products/mongodb/mongodb-schema-design-best-practices/)
- [MongoDB University (Free Courses)](https://university.mongodb.com)

---

**Last Updated:** 2026-01-11

For questions or issues, please open an issue on GitHub.

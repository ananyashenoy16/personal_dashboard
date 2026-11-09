## Planned Mongoose models

Create one schema per collection and include `userId` on every user-owned document:
- User: email, passwordHash, Google provider id, timezone, preferences
- Habit: name, icon, frequency, startDate, archivedAt
- HabitLog: habitId, dateKey, completed, completedAt (unique index: userId + habitId + dateKey)
- JournalEntry: dateKey, title, rich-text JSON/HTML, mood, tags, createdAt (multiple entries per day are allowed)
- JournalPhoto: entryId, private storageKey, caption, sortOrder
- WorkTask: workDate, title, priority, status, minutesSpent, achievements, links, followUp, followUpDate
- CycleRecord: startDate, endDate, flow, symptoms, mood, notes
- DsaProblem: name, platform, topic, difficulty, status, problemUrl, solutionUrl, date, revisionDates, notes

Every read/write route must derive the authenticated user id from the server-side session and filter by both document id and user id. Never trust a `userId` from the request body. Validate dates and URLs server-side. For journal photos, use private object storage and short-lived signed URLs; do not store base64 photos in MongoDB.

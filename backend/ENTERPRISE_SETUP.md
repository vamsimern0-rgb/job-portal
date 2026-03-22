# Enterprise Feature Setup

## Enabled in this upgrade
- AI-based skill match outreach when a job opens
- Auto in-app notifications for students
- Auto email alerts for matched students
- HR manual rebroadcast action per job
- Student communication preferences and alert threshold
- Screening questions support on job apply
- Saved jobs (student)
- Recruiter notes (HR candidate workflow)
- Interview reminder scheduler (24h and 1h)

## Environment variables
Add these in your backend `.env`:

```env
# Existing
MONGO_URI=...
JWT_SECRET=...
EMAIL_USER=...
EMAIL_PASS=...

# Optional scheduler tuning
INTERVIEW_REMINDER_INTERVAL_MS=300000
# DISABLE_INTERVIEW_REMINDER_SCHEDULER=true
```

## Notes
- Student can enable/disable channels from Student Profile.
- HR can rebroadcast any job from HR Job List via `Rebroadcast` button.
- `matchThreshold` accepts either decimal (`0.65`) or percent (`65`) payloads.
- Interview scheduler sends reminders once per interview:
  - around 24 hours before
  - around 1 hour before

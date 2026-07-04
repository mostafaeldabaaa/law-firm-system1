const Session = require('../models/Session');
const AppError = require('../utils/AppError');
const { createNotification } = require('./notificationService');

/**
 * Conflict Detection.
 *
 * Two sessions for the same lawyer conflict if their time ranges overlap:
 *   existing.startTime < newEnd  AND  existing.endTime > newStart
 *
 * `excludeSessionId` is used when rescheduling an existing session,
 * so it doesn't conflict with itself.
 */
const findConflictingSession = async ({ lawyerId, startTime, endTime, excludeSessionId = null }) => {
  const query = {
    lawyer: lawyerId,
    status: { $in: ['scheduled'] }, // cancelled/completed sessions can't conflict
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  };

  if (excludeSessionId) {
    query._id = { $ne: excludeSessionId };
  }

  return Session.findOne(query);
};

/**
 * Throws if the lawyer already has a session overlapping the given window.
 * Mirrors the business rule from the original spec:
 *   if (lawyer.hasSessionAt(date)) { throw ConflictException; }
 *
 * `t` is the request's translation function (req.t), passed in so this
 * service stays decoupled from the Express request object while still
 * producing a localized error message.
 */
const assertNoConflict = async ({ lawyerId, startTime, endTime, excludeSessionId, t = (k) => k }) => {
  const conflict = await findConflictingSession({ lawyerId, startTime, endTime, excludeSessionId });
  if (conflict) {
    throw new AppError(
      t('session.conflict', {
        title: conflict.title,
        start: conflict.startTime.toISOString(),
        end: conflict.endTime.toISOString(),
      }),
      409,
      { conflictingSessionId: conflict._id }
    );
  }
};

/**
 * Reschedules a session: creates a brand-new session document linked
 * via `rescheduledFrom`, marks the old one as 'rescheduled', and runs
 * the same conflict check as a normal creation.
 */
// const rescheduleSession = async (oldSession, { startTime, endTime, location }, userId, t) => {
//   await assertNoConflict({
//     lawyerId: oldSession.lawyer,
//     startTime,
//     endTime,
//     t,
//   });
const rescheduleSession = async (oldSession, { startTime, endTime, location }, userId, t) => {
  await assertNoConflict({
    lawyerId: oldSession.lawyer,
    startTime,
    endTime,
    excludeSessionId: oldSession._id,   
    t,
  });

  oldSession.status = 'rescheduled';
  await oldSession.save();

  const newSession = await Session.create({
    case: oldSession.case,
    type: oldSession.type,
    title: oldSession.title,
    location: location || oldSession.location,
    startTime,
    endTime,
    lawyer: oldSession.lawyer,
    attendees: oldSession.attendees,
    rescheduledFrom: oldSession._id,
  });

  return newSession;
};

/**
 * Proactive session reminders: notifies the assigned lawyer ahead of a
 * scheduled session at configurable lead times (default: 24h and 1h
 * before). This complements the one-time "session scheduled"
 * notification sent at creation — that one confirms the booking, this
 * one is the actual day-of/hour-of reminder so the lawyer doesn't miss
 * a court hearing.
 *
 * Intended to run frequently (e.g. every 30 minutes) from a cron job,
 * since the 1-hour-before threshold needs finer granularity than a
 * daily check would give.
 */
const sendUpcomingSessionReminders = async (leadHoursList = [24, 1]) => {
  const now = new Date();
  const horizonMs = Math.max(...leadHoursList) * 60 * 60 * 1000;

  const candidates = await Session.find({
    status: 'scheduled',
    startTime: { $gte: now, $lte: new Date(now.getTime() + horizonMs) },
  }).populate('case', 'caseNumber title');

  let remindersFired = 0;

  for (const session of candidates) {
    const hoursRemaining = (session.startTime - now) / (1000 * 60 * 60);

    const dueThreshold = leadHoursList
      .filter((h) => hoursRemaining <= h && !session.remindersSent.includes(h))
      .sort((a, b) => a - b)[0];

    if (dueThreshold === undefined) continue;

    await createNotification({
      recipientId: session.lawyer,
      title: 'Upcoming session reminder',
      message: `Session "${session.title}" for case ${session.case?.caseNumber || ''} starts at ${session.startTime.toLocaleString()}.`,
      type: 'warning',
      relatedResource: { resourceType: 'Session', resourceId: session._id },
    });

    session.remindersSent.push(dueThreshold);
    await session.save();
    remindersFired += 1;
  }

  return remindersFired;
};

module.exports = { findConflictingSession, assertNoConflict, rescheduleSession, sendUpcomingSessionReminders };

const { LegalDeadline } = require('../models/LegalDeadline');
const { createNotification } = require('./notificationService');

/**
 * Marks deadlines whose due date has passed (and that are still
 * pending/due_soon) as 'missed', and notifies the responsible lawyer
 * immediately — missing a legal deadline (e.g. an appeal window) can
 * mean losing a right permanently, so this is treated with more
 * urgency than a regular overdue task.
 *
 * Intended to run from a daily cron job (see jobs/deadlineReminder.js),
 * right before the reminder pass, so a missed deadline isn't also
 * reported as "due soon" in the same run.
 */
const flagMissedDeadlines = async () => {
  const now = new Date();

  const overdue = await LegalDeadline.find({
    status: { $in: ['pending', 'due_soon'] },
    dueDate: { $lt: now },
  });

  for (const deadline of overdue) {
    deadline.status = 'missed';
    await deadline.save();

    await createNotification({
      recipientId: deadline.responsibleLawyer,
      title: 'Legal deadline missed',
      message: `The deadline "${deadline.title}" was due on ${deadline.dueDate.toLocaleDateString()} and has not been marked completed.`,
      type: 'error',
      relatedResource: { resourceType: 'LegalDeadline', resourceId: deadline._id },
    });
  }

  return overdue.length;
};

/**
 * Sends proactive reminders for deadlines approaching one of their
 * configured `reminderLeadDays` thresholds (e.g. 7, 3, 1 days out),
 * and marks the deadline 'due_soon'. Tracks which thresholds have
 * already fired in `remindersSent` so the same reminder never sends twice.
 */
const sendUpcomingDeadlineReminders = async () => {
  const now = new Date();
  const candidates = await LegalDeadline.find({
    status: { $in: ['pending', 'due_soon'] },
    dueDate: { $gte: now },
  }).populate('case', 'caseNumber title');

  let remindersFired = 0;

  for (const deadline of candidates) {
    const daysRemaining = Math.ceil((deadline.dueDate - now) / (1000 * 60 * 60 * 24));

    // Find the largest configured lead-day threshold that we've now
    // reached but haven't already sent a reminder for.
    const dueThreshold = deadline.reminderLeadDays
      .filter((d) => daysRemaining <= d && !deadline.remindersSent.includes(d))
      .sort((a, b) => a - b)[0];

    if (dueThreshold === undefined) continue;

    await createNotification({
      recipientId: deadline.responsibleLawyer,
      title: 'Upcoming legal deadline',
      message: `"${deadline.title}" for case ${deadline.case?.caseNumber || ''} is due in ${daysRemaining} day(s) (${deadline.dueDate.toLocaleDateString()}).`,
      type: 'warning',
      relatedResource: { resourceType: 'LegalDeadline', resourceId: deadline._id },
    });

    deadline.remindersSent.push(dueThreshold);
    deadline.status = 'due_soon';
    await deadline.save();
    remindersFired += 1;
  }

  return remindersFired;
};

module.exports = { flagMissedDeadlines, sendUpcomingDeadlineReminders };

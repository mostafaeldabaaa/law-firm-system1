const Task = require('../models/Task');
const { createNotification } = require('./notificationService');

/**
 * Workflow Engine: automated task generation.
 * Mirrors the spec's flow:
 *   New Case Created -> Assign Lawyer -> Assign Assistant
 *   -> Generate Initial Tasks -> Notify Team
 *
 * Called from caseController right after a case is created.
 */
const generateInitialTasksForCase = async (caseDoc, createdByUserId) => {
  const dueIn = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const taskTemplates = [
    {
      title: `Review case file: ${caseDoc.title}`,
      description: 'Initial review of all documents and client intake information.',
      priority: 'high',
      dueDate: dueIn(2),
      slaHours: 48,
    },
    {
      title: `Prepare case strategy: ${caseDoc.title}`,
      description: 'Draft initial legal strategy and identify required documents.',
      priority: 'medium',
      dueDate: dueIn(5),
      slaHours: 120,
    },
    {
      title: `Contact client: ${caseDoc.title}`,
      description: 'Confirm case details and required documents with the client.',
      priority: 'medium',
      dueDate: dueIn(3),
      slaHours: 72,
    },
  ];

  // Assign every generated task to the lead lawyer; in a richer system
  // this could route to an assistant/secretary based on workload.
  const tasks = await Task.insertMany(
    taskTemplates.map((t) => ({
      ...t,
      case: caseDoc._id,
      assignedTo: caseDoc.leadLawyer,
      assignedBy: createdByUserId,
    }))
  );

  await createNotification({
    recipientId: caseDoc.leadLawyer,
    title: 'New case assigned',
    message: `You have been assigned as lead lawyer for case "${caseDoc.title}" (${caseDoc.caseNumber}). ${tasks.length} initial tasks were generated.`,
    relatedResource: { resourceType: 'Case', resourceId: caseDoc._id },
  });

  return tasks;
};

/**
 * SLA Monitoring: flags tasks that are past their due date and not
 * yet completed. Intended to be run by a scheduled cron job
 * (see jobs/slaMonitor.js).
 */
const flagOverdueTasks = async () => {
  const now = new Date();
  const result = await Task.updateMany(
    {
      status: { $in: ['pending', 'in_progress'] },
      dueDate: { $lt: now },
    },
    { $set: { status: 'overdue', escalated: true } }
  );
  return result;
};

module.exports = { generateInitialTasksForCase, flagOverdueTasks };

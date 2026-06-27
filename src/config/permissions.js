/**
 * Centralized Permissions Matrix (RBAC).
 *
 * Resource -> action -> array of roles allowed to perform it.
 * This is the single source of truth for "who can do what" in the system.
 * The authorize() middleware reads from this file, so adding a new role
 * or resource never requires touching route/controller code.
 */

const RESOURCES = {
  CASES: 'cases',
  CLIENTS: 'clients',
  LAWYERS: 'lawyers',
  SESSIONS: 'sessions',
  TASKS: 'tasks',
  DOCUMENTS: 'documents',
  REPORTS: 'reports',
  USERS: 'users',
  AUDIT_LOGS: 'audit_logs',
  DEADLINES: 'deadlines',
  CONSULTATIONS: 'consultations',
};

const ACTIONS = {
  VIEW: 'view',
  CREATE: 'create',
  EDIT: 'edit',
  DELETE: 'delete',
  EXPORT: 'export',
};

// Permission matrix: resource -> action -> roles allowed
const PERMISSIONS = {
  [RESOURCES.CASES]: {
    [ACTIONS.VIEW]: ['super_admin', 'branch_manager', 'senior_lawyer', 'lawyer', 'secretary', 'client'],
    [ACTIONS.CREATE]: ['super_admin', 'branch_manager', 'senior_lawyer', 'lawyer', 'secretary'],
    [ACTIONS.EDIT]: ['super_admin', 'branch_manager', 'senior_lawyer', 'lawyer'],
    [ACTIONS.DELETE]: ['super_admin', 'branch_manager'],
  },
  [RESOURCES.CLIENTS]: {
    [ACTIONS.VIEW]: ['super_admin', 'branch_manager', 'senior_lawyer', 'lawyer', 'secretary'],
    [ACTIONS.CREATE]: ['super_admin', 'branch_manager', 'senior_lawyer', 'lawyer', 'secretary'],
    [ACTIONS.EDIT]: ['super_admin', 'branch_manager', 'senior_lawyer', 'lawyer', 'secretary'],
    [ACTIONS.DELETE]: ['super_admin', 'branch_manager'],
  },
  [RESOURCES.LAWYERS]: {
    [ACTIONS.VIEW]: ['super_admin', 'branch_manager', 'senior_lawyer', 'lawyer', 'secretary'],
    [ACTIONS.CREATE]: ['super_admin', 'branch_manager'],
    [ACTIONS.EDIT]: ['super_admin', 'branch_manager'],
    [ACTIONS.DELETE]: ['super_admin'],
  },
  [RESOURCES.SESSIONS]: {
    [ACTIONS.VIEW]: ['super_admin', 'branch_manager', 'senior_lawyer', 'lawyer', 'secretary', 'client'],
    [ACTIONS.CREATE]: ['super_admin', 'branch_manager', 'senior_lawyer', 'lawyer', 'secretary'],
    [ACTIONS.EDIT]: ['super_admin', 'branch_manager', 'senior_lawyer', 'lawyer', 'secretary'],
    [ACTIONS.DELETE]: ['super_admin', 'branch_manager', 'senior_lawyer'],
  },
  [RESOURCES.TASKS]: {
    [ACTIONS.VIEW]: ['super_admin', 'branch_manager', 'senior_lawyer', 'lawyer', 'secretary'],
    [ACTIONS.CREATE]: ['super_admin', 'branch_manager', 'senior_lawyer', 'lawyer'],
    [ACTIONS.EDIT]: ['super_admin', 'branch_manager', 'senior_lawyer', 'lawyer', 'secretary'],
    [ACTIONS.DELETE]: ['super_admin', 'branch_manager', 'senior_lawyer'],
  },
  [RESOURCES.DOCUMENTS]: {
    [ACTIONS.VIEW]: ['super_admin', 'branch_manager', 'senior_lawyer', 'lawyer', 'secretary', 'client'],
    [ACTIONS.CREATE]: ['super_admin', 'branch_manager', 'senior_lawyer', 'lawyer', 'secretary'],
    [ACTIONS.EDIT]: ['super_admin', 'branch_manager', 'senior_lawyer', 'lawyer'],
    [ACTIONS.DELETE]: ['super_admin', 'branch_manager'],
  },
  [RESOURCES.REPORTS]: {
    [ACTIONS.VIEW]: ['super_admin', 'branch_manager', 'senior_lawyer'],
    [ACTIONS.EXPORT]: ['super_admin', 'branch_manager'],
  },
  [RESOURCES.USERS]: {
    [ACTIONS.VIEW]: ['super_admin', 'branch_manager'],
    [ACTIONS.CREATE]: ['super_admin'],
    [ACTIONS.EDIT]: ['super_admin', 'branch_manager'],
    [ACTIONS.DELETE]: ['super_admin'],
  },
  [RESOURCES.AUDIT_LOGS]: {
    [ACTIONS.VIEW]: ['super_admin'],
  },
  [RESOURCES.DEADLINES]: {
    // Legal deadlines/appeals are case-critical: clients can see that
    // one exists and its status, but never create/edit/delete it —
    // only staff with case responsibility can manage the procedural clock.
    [ACTIONS.VIEW]: ['super_admin', 'branch_manager', 'senior_lawyer', 'lawyer', 'secretary', 'client'],
    [ACTIONS.CREATE]: ['super_admin', 'branch_manager', 'senior_lawyer', 'lawyer'],
    [ACTIONS.EDIT]: ['super_admin', 'branch_manager', 'senior_lawyer', 'lawyer'],
    [ACTIONS.DELETE]: ['super_admin', 'branch_manager', 'senior_lawyer'],
  },
  [RESOURCES.CONSULTATIONS]: {
    // Clients create their own consultation requests; staff manage the
    // queue and respond. A client viewing/creating is naturally scoped
    // to their own requests at the controller/query level.
    [ACTIONS.VIEW]: ['super_admin', 'branch_manager', 'senior_lawyer', 'lawyer', 'secretary', 'client'],
    [ACTIONS.CREATE]: ['client', 'secretary', 'super_admin', 'branch_manager'],
    [ACTIONS.EDIT]: ['super_admin', 'branch_manager', 'senior_lawyer', 'lawyer', 'secretary'],
    [ACTIONS.DELETE]: ['super_admin', 'branch_manager'],
  },
};

/**
 * Checks whether a given role can perform an action on a resource.
 */
const can = (role, resource, action) => {
  const allowedRoles = PERMISSIONS?.[resource]?.[action];
  if (!allowedRoles) return false;
  return allowedRoles.includes(role);
};

module.exports = { RESOURCES, ACTIONS, PERMISSIONS, can };

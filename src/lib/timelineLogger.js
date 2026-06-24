import { base44 } from "@/api/base44Client";

/**
 * Timeline Logger Utility
 * 
 * Simplified interface for logging timeline events from frontend components.
 * Call this whenever a significant action occurs.
 */

export async function logTimelineEvent({
  entityType,
  entityId,
  entityDisplay,
  action,
  summary,
  details = '',
  metadata = {},
  currentUser = null,
  icon = undefined,
  color = undefined
}) {
  try {
    // Get current user if not provided
    let user = currentUser;
    if (!user) {
      try {
        user = await base44.auth.me();
      } catch {
        // User not authenticated, use system actor
        user = { id: 'system', role: 'system', full_name: 'System' };
      }
    }

    // Invoke timeline service
    const response = await base44.functions.invoke('timelineEventService', {
      actorId: user?.id || 'system',
      actorRole: user?.role || 'system',
      actorName: user?.full_name || 'System',
      entityType,
      entityId,
      entityDisplay: entityDisplay || entityId,
      action,
      summary,
      details,
      metadata,
      icon,
      color
    });

    return response.data;
  } catch (error) {
    console.error('Failed to log timeline event:', error);
    return null;
  }
}

/**
 * Template functions for common events
 */

export async function logLoadCreated(loadId, loadNumber, user) {
  return logTimelineEvent({
    entityType: 'Load',
    entityId: loadId,
    entityDisplay: loadNumber,
    action: 'created',
    summary: `Created load ${loadNumber}`,
    currentUser: user
  });
}

export async function logLoadAssigned(loadId, loadNumber, driverName, user) {
  return logTimelineEvent({
    entityType: 'Load',
    entityId: loadId,
    entityDisplay: loadNumber,
    action: 'assigned',
    summary: `Assigned load ${loadNumber} to ${driverName}`,
    currentUser: user
  });
}

export async function logDocumentApproved(documentId, documentType, user) {
  return logTimelineEvent({
    entityType: 'Document',
    entityId: documentId,
    entityDisplay: documentType,
    action: 'approved',
    summary: `Approved ${documentType} document`,
    currentUser: user
  });
}

export async function logDocumentRejected(documentId, documentType, reason, user) {
  return logTimelineEvent({
    entityType: 'Document',
    entityId: documentId,
    entityDisplay: documentType,
    action: 'rejected',
    summary: `Rejected ${documentType} document`,
    details: reason,
    metadata: { reason },
    currentUser: user
  });
}

export async function logInvoiceCreated(invoiceId, invoiceNumber, amount, user) {
  return logTimelineEvent({
    entityType: 'Invoice',
    entityId: invoiceId,
    entityDisplay: invoiceNumber,
    action: 'invoiced',
    summary: `Created invoice ${invoiceNumber} for $${amount}`,
    metadata: { amount },
    currentUser: user
  });
}

export async function logInvoicePaid(invoiceId, invoiceNumber, amount, user) {
  return logTimelineEvent({
    entityType: 'Invoice',
    entityId: invoiceId,
    entityDisplay: invoiceNumber,
    action: 'paid',
    summary: `Paid invoice ${invoiceNumber} for $${amount}`,
    metadata: { amount },
    currentUser: user
  });
}

export async function logLoadCompleted(loadId, loadNumber, user) {
  return logTimelineEvent({
    entityType: 'Load',
    entityId: loadId,
    entityDisplay: loadNumber,
    action: 'completed',
    summary: `Completed load ${loadNumber}`,
    currentUser: user
  });
}

export async function logRCSent(rcId, loadId, loadNumber, user) {
  return logTimelineEvent({
    entityType: 'Load',
    entityId: loadId,
    entityDisplay: loadNumber,
    action: 'sent',
    summary: `Rate confirmation sent for ${loadNumber}`,
    metadata: { rc_id: rcId },
    icon: 'Send',
    color: 'blue',
    currentUser: user
  });
}

export async function logRCViewed(rcId, loadId, loadNumber, user) {
  return logTimelineEvent({
    entityType: 'Load',
    entityId: loadId,
    entityDisplay: loadNumber,
    action: 'viewed',
    summary: `Rate confirmation viewed for ${loadNumber}`,
    metadata: { rc_id: rcId },
    icon: 'Eye',
    color: 'cyan',
    currentUser: user
  });
}

export async function logRCSigned(rcId, loadId, loadNumber, user) {
  return logTimelineEvent({
    entityType: 'Load',
    entityId: loadId,
    entityDisplay: loadNumber,
    action: 'signed',
    summary: `Rate confirmation signed for ${loadNumber}`,
    metadata: { rc_id: rcId },
    icon: 'CheckCircle',
    color: 'green',
    currentUser: user
  });
}

export async function logRCRejected(rcId, loadId, loadNumber, reason, user) {
  return logTimelineEvent({
    entityType: 'Load',
    entityId: loadId,
    entityDisplay: loadNumber,
    action: 'rejected',
    summary: `Rate confirmation rejected for ${loadNumber}`,
    details: reason,
    metadata: { rc_id: rcId, reason },
    icon: 'XCircle',
    color: 'red',
    currentUser: user
  });
}

export async function logInvoiceSent(invoiceId, invoiceNumber, user) {
  return logTimelineEvent({
    entityType: 'Invoice',
    entityId: invoiceId,
    entityDisplay: invoiceNumber,
    action: 'sent',
    summary: `Invoice ${invoiceNumber} sent`,
    icon: 'Send',
    color: 'blue',
    currentUser: user
  });
}

export async function logInvoiceOverdue(invoiceId, invoiceNumber, daysOverdue, user) {
  return logTimelineEvent({
    entityType: 'Invoice',
    entityId: invoiceId,
    entityDisplay: invoiceNumber,
    action: 'overdue',
    summary: `Invoice ${invoiceNumber} is ${daysOverdue} days overdue`,
    metadata: { daysOverdue },
    icon: 'AlertTriangle',
    color: 'red',
    currentUser: user
  });
}
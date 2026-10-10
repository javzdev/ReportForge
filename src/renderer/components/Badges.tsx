import React from 'react';
import type { Severity, FindingStatus, DocumentClassification } from '@shared/types';
import { SEVERITY_LABELS, STATUS_LABELS, CLASSIFICATION_LABELS } from '../lib/format';

export function SeverityBadge({ severity }: { severity: Severity }): React.ReactElement {
  return <span className={`badge badge--${severity}`}>{SEVERITY_LABELS[severity] ?? severity}</span>;
}

export function StatusBadge({ status }: { status: FindingStatus }): React.ReactElement {
  return <span className="badge badge--neutral">{STATUS_LABELS[status] ?? status}</span>;
}

export function ClassificationBadge({ classification }: { classification: DocumentClassification }): React.ReactElement {
  return <span className="badge badge--neutral">{CLASSIFICATION_LABELS[classification] ?? classification}</span>;
}

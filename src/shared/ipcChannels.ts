// Lista cerrada de canales IPC permitidos. El preload solo expone estas funciones,
// nunca un invoke generico, para minimizar la superficie expuesta al renderer.
export const IPC = {
  PROJECTS_LIST: 'projects:list',
  PROJECTS_CREATE: 'projects:create',
  PROJECTS_UPDATE: 'projects:update',
  PROJECTS_DELETE: 'projects:delete',

  TEMPLATES_LIST: 'templates:list',
  TEMPLATES_GET: 'templates:get',
  TEMPLATES_DUPLICATE: 'templates:duplicate',
  TEMPLATES_SAVE: 'templates:save',
  TEMPLATES_CREATE_CUSTOM: 'templates:createCustom',
  TEMPLATES_DELETE: 'templates:delete',

  REPORTS_LIST_BY_PROJECT: 'reports:listByProject',
  REPORTS_GET: 'reports:get',
  REPORTS_CREATE: 'reports:create',
  REPORTS_SAVE: 'reports:save',
  REPORTS_DELETE: 'reports:delete',

  FINDINGS_LIST: 'findings:list',
  FINDINGS_GET: 'findings:get',
  FINDINGS_CREATE: 'findings:create',
  FINDINGS_SAVE: 'findings:save',
  FINDINGS_DELETE: 'findings:delete',

  ATTACHMENTS_LIST_BY_PROJECT: 'attachments:listByProject',
  ATTACHMENTS_LIST_BY_FINDING: 'attachments:listByFinding',
  ATTACHMENTS_ADD: 'attachments:add',
  ATTACHMENTS_DELETE: 'attachments:delete',
  ATTACHMENTS_READ_AS_DATA_URL: 'attachments:readAsDataUrl',
  ATTACHMENTS_PICK_FILES: 'attachments:pickFiles',

  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',

  EXPORT_REPORT_TO_PDF: 'export:reportToPdf',

  BACKUP_CREATE: 'backup:create',
  BACKUP_PICK_FILE: 'backup:pickFile',
  BACKUP_VALIDATE: 'backup:validate',
  BACKUP_IMPORT: 'backup:import',

  APP_GET_INFO: 'app:getInfo',
  APP_DELETE_ALL_DATA: 'app:deleteAllData',
} as const;

export type IpcChannel = (typeof IPC)[keyof typeof IPC];

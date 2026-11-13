-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentNo" TEXT,
    "staffNo" TEXT,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "approvalStatus" TEXT NOT NULL DEFAULT 'APPROVED',
    "approvedAt" DATETIME,
    "approvedBy" TEXT,
    "externalId" TEXT,
    "gender" TEXT,
    "ethnicity" TEXT,
    "educationStage" TEXT,
    "trainingUnit" TEXT,
    "college" TEXT,
    "major" TEXT,
    "grade" TEXT,
    "enrollmentYear" INTEGER,
    "graduationYear" INTEGER,
    "email" TEXT,
    "boundFinancePlatform" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "skills" TEXT NOT NULL DEFAULT '',
    "showRecords" BOOLEAN NOT NULL DEFAULT true,
    "showAwards" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Competition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "publishStatus" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "year" INTEGER NOT NULL,
    "organizer" TEXT,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Track" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "competitionId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'TRACK',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Track_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Track_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Track" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "college" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "competitionId" TEXT,
    "trackId" TEXT,
    "ownerId" TEXT,
    "payeeMemberId" TEXT,
    "applicationUnit" TEXT NOT NULL DEFAULT '',
    "trainingUnit" TEXT NOT NULL DEFAULT '',
    "groupName" TEXT,
    "categoryName" TEXT,
    "batchName" TEXT,
    "propositionName" TEXT,
    "propositionCompany" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'SCHOOL',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "score" REAL,
    "remark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" DATETIME,
    "deletedAt" DATETIME,
    CONSTRAINT "Project_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Project_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Project_payeeMemberId_fkey" FOREIGN KEY ("payeeMemberId") REFERENCES "TeamMember" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectAlias" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "aliasType" TEXT NOT NULL,
    "aliasValue" TEXT NOT NULL,
    CONSTRAINT "ProjectAlias_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "userId" TEXT,
    "personNo" TEXT,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "backupOrder" INTEGER,
    "isInternal" BOOLEAN NOT NULL DEFAULT true,
    "school" TEXT NOT NULL DEFAULT '武汉大学',
    "educationStage" TEXT NOT NULL DEFAULT '',
    "trainingUnit" TEXT NOT NULL DEFAULT '',
    "major" TEXT NOT NULL DEFAULT '',
    "gender" TEXT NOT NULL DEFAULT '',
    "ethnicity" TEXT NOT NULL DEFAULT '汉族',
    "enrollmentYear" INTEGER,
    "graduationYear" INTEGER,
    "phone" TEXT,
    "email" TEXT,
    "remark" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPayee" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Teacher" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "userId" TEXT,
    "isInternal" BOOLEAN NOT NULL DEFAULT true,
    "staffNo" TEXT,
    "name" TEXT NOT NULL,
    "gender" TEXT,
    "phone" TEXT,
    "school" TEXT NOT NULL DEFAULT '武汉大学',
    "unit" TEXT NOT NULL,
    "title" TEXT,
    "email" TEXT,
    "confirmStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "confirmedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Teacher_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Teacher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PayeeBank" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "boundFinancePlatform" BOOLEAN NOT NULL DEFAULT false,
    "organization" TEXT,
    "phone" TEXT,
    "idCardEncrypted" TEXT,
    "bankCardEncrypted" TEXT,
    "bankName" TEXT,
    "accountName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PayeeBank_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "TeamMember" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Work" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "fileName" TEXT,
    "fileUrl" TEXT,
    "externalUrl" TEXT,
    "form" TEXT NOT NULL,
    "category" TEXT,
    "groupName" TEXT,
    "pptFileName" TEXT,
    "pptFileUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Work_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SealedFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "versionNo" INTEGER NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "reviewResult" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    CONSTRAINT "SealedFile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SealedFile_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "reason" TEXT,
    "reviewerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Review_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Review_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChangeLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "changedBy" TEXT NOT NULL,
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'DIRECT',
    "requestId" TEXT,
    CONSTRAINT "ChangeLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChangeLog_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ChangeLog_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ChangeRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChangeRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fieldDiffJson" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "evidenceFileName" TEXT,
    "evidenceFileUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_COLLEGE',
    "collegeReviewerId" TEXT,
    "collegeReviewedAt" DATETIME,
    "collegeReason" TEXT,
    "schoolReviewerId" TEXT,
    "schoolReviewedAt" DATETIME,
    "schoolReason" TEXT,
    "cooldownUntil" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChangeRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChangeRequest_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ChangeRequest_collegeReviewerId_fkey" FOREIGN KEY ("collegeReviewerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ChangeRequest_schoolReviewerId_fkey" FOREIGN KEY ("schoolReviewerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CompetitionAttachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "competitionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'NOTICE',
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER,
    "uploadedBy" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "knowledgeStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "knowledgeError" TEXT,
    "knowledgeIndexedAt" DATETIME,
    "replacesAttachmentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompetitionAttachment_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CompetitionAttachment_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TimeWindow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "competitionId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "configuredBy" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TimeWindow_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TimeWindow_configuredBy_fkey" FOREIGN KEY ("configuredBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "competitionId" TEXT,
    "templateId" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'SCHOOL',
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL DEFAULT 'xlsx',
    "sourceType" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL,
    "successRows" INTEGER NOT NULL,
    "failureRows" INTEGER NOT NULL,
    "mappingJson" TEXT NOT NULL DEFAULT '{}',
    "importedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImportBatch_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ImportBatch_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "FormTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ImportBatch_importedBy_fkey" FOREIGN KEY ("importedBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExportRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exporterId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fieldsJson" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "watermarkNo" TEXT NOT NULL,
    "fileName" TEXT,
    "includeSensitive" BOOLEAN NOT NULL DEFAULT false,
    "filtersJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExportRecord_exporterId_fkey" FOREIGN KEY ("exporterId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SensitiveAccessLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "memberId" TEXT,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "fieldNames" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SensitiveAccessLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SensitiveAccessLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SensitiveAccessLog_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "TeamMember" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Award" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'SCHOOL',
    "awardLevel" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Award_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Award_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Award_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AwardHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "awardId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "reason" TEXT,
    "changedBy" TEXT NOT NULL,
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AwardHistory_awardId_fkey" FOREIGN KEY ("awardId") REFERENCES "Award" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AwardHistory_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DictOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "trackId" TEXT,
    "parentId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DictOption_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DictOption_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "DictOption" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FormTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "competitionId" TEXT,
    "stage" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "fieldsJson" TEXT NOT NULL,
    "fileName" TEXT,
    "fileUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FormTemplate_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FormTemplate_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DataSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recordType" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceRef" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "syncedAt" DATETIME NOT NULL,
    CONSTRAINT "DataSource_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ImportBatch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KbDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT,
    "year" INTEGER NOT NULL,
    "effectiveAt" DATETIME,
    "expiresAt" DATETIME,
    "competitionId" TEXT,
    "sourceAttachmentId" TEXT,
    "replacesId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KbDocument_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "KbDocument_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KbChunk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "page" INTEGER,
    "content" TEXT NOT NULL,
    "keywords" TEXT NOT NULL,
    CONSTRAINT "KbChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "KbDocument" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AwardRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "awardLevel" TEXT NOT NULL,
    "evidenceType" TEXT NOT NULL,
    "evidenceRef" TEXT NOT NULL,
    "verifiedBy" TEXT NOT NULL,
    "verifiedAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "voidReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AwardRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AwardRecord_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AwardRecord_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MemberSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "versionNo" INTEGER NOT NULL,
    "membersJson" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "changedAt" DATETIME NOT NULL,
    "reason" TEXT,
    CONSTRAINT "MemberSnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemberSnapshot_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Anomaly" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ruleId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "resolution" TEXT,
    "resolvedBy" TEXT,
    "resolvedAt" DATETIME,
    CONSTRAINT "Anomaly_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Anomaly_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserRoleLink" (
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "grant" TEXT NOT NULL DEFAULT 'SELF',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("userId", "role"),
    CONSTRAINT "UserRoleLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TeamPost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "authorId" TEXT NOT NULL,
    "competitionId" TEXT,
    "trackId" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "expectation" TEXT,
    "skills" TEXT NOT NULL DEFAULT '',
    "memberLimit" INTEGER NOT NULL DEFAULT 5,
    "currentCount" INTEGER NOT NULL DEFAULT 1,
    "requirement" TEXT NOT NULL DEFAULT '全部',
    "contact" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RECRUITING',
    "expiresAt" DATETIME NOT NULL,
    "removedBy" TEXT,
    "removedReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeamPost_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TeamPost_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TeamJoinRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "handledAt" DATETIME,
    "handledBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamJoinRequest_postId_fkey" FOREIGN KEY ("postId") REFERENCES "TeamPost" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeamJoinRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeamJoinRequest_handledBy_fkey" FOREIGN KEY ("handledBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_studentNo_key" ON "User"("studentNo");

-- CreateIndex
CREATE UNIQUE INDEX "User_staffNo_key" ON "User"("staffNo");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Competition_name_year_key" ON "Competition"("name", "year");

-- CreateIndex
CREATE INDEX "Track_competitionId_enabled_idx" ON "Track"("competitionId", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "Track_competitionId_parentId_name_key" ON "Track"("competitionId", "parentId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Project_payeeMemberId_key" ON "Project"("payeeMemberId");

-- CreateIndex
CREATE INDEX "Project_year_college_idx" ON "Project"("year", "college");

-- CreateIndex
CREATE INDEX "Project_competitionId_stage_status_idx" ON "Project"("competitionId", "stage", "status");

-- CreateIndex
CREATE INDEX "Project_trackId_idx" ON "Project"("trackId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectAlias_aliasType_aliasValue_key" ON "ProjectAlias"("aliasType", "aliasValue");

-- CreateIndex
CREATE INDEX "TeamMember_projectId_personNo_idx" ON "TeamMember"("projectId", "personNo");

-- CreateIndex
CREATE INDEX "TeamMember_personNo_idx" ON "TeamMember"("personNo");

-- CreateIndex
CREATE INDEX "Teacher_userId_confirmStatus_idx" ON "Teacher"("userId", "confirmStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_projectId_staffNo_key" ON "Teacher"("projectId", "staffNo");

-- CreateIndex
CREATE UNIQUE INDEX "PayeeBank_memberId_key" ON "PayeeBank"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "Work_projectId_key" ON "Work"("projectId");

-- CreateIndex
CREATE INDEX "SealedFile_projectId_isFinal_idx" ON "SealedFile"("projectId", "isFinal");

-- CreateIndex
CREATE UNIQUE INDEX "SealedFile_projectId_versionNo_key" ON "SealedFile"("projectId", "versionNo");

-- CreateIndex
CREATE INDEX "Review_projectId_createdAt_idx" ON "Review"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "ChangeLog_projectId_changedAt_idx" ON "ChangeLog"("projectId", "changedAt");

-- CreateIndex
CREATE INDEX "ChangeRequest_projectId_status_createdAt_idx" ON "ChangeRequest"("projectId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionAttachment_replacesAttachmentId_key" ON "CompetitionAttachment"("replacesAttachmentId");

-- CreateIndex
CREATE INDEX "CompetitionAttachment_competitionId_kind_sortOrder_idx" ON "CompetitionAttachment"("competitionId", "kind", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "TimeWindow_competitionId_stage_key" ON "TimeWindow"("competitionId", "stage");

-- CreateIndex
CREATE UNIQUE INDEX "ExportRecord_watermarkNo_key" ON "ExportRecord"("watermarkNo");

-- CreateIndex
CREATE INDEX "ExportRecord_exporterId_createdAt_idx" ON "ExportRecord"("exporterId", "createdAt");

-- CreateIndex
CREATE INDEX "SensitiveAccessLog_userId_createdAt_idx" ON "SensitiveAccessLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SensitiveAccessLog_projectId_createdAt_idx" ON "SensitiveAccessLog"("projectId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Award_projectId_competitionId_stage_key" ON "Award"("projectId", "competitionId", "stage");

-- CreateIndex
CREATE INDEX "AwardHistory_awardId_changedAt_idx" ON "AwardHistory"("awardId", "changedAt");

-- CreateIndex
CREATE INDEX "DictOption_type_enabled_sortOrder_idx" ON "DictOption"("type", "enabled", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "DictOption_type_trackId_value_key" ON "DictOption"("type", "trackId", "value");

-- CreateIndex
CREATE UNIQUE INDEX "FormTemplate_competitionId_stage_version_key" ON "FormTemplate"("competitionId", "stage", "version");

-- CreateIndex
CREATE UNIQUE INDEX "KbDocument_sourceAttachmentId_key" ON "KbDocument"("sourceAttachmentId");

-- CreateIndex
CREATE INDEX "KbDocument_competitionId_isActive_effectiveAt_idx" ON "KbDocument"("competitionId", "isActive", "effectiveAt");

-- CreateIndex
CREATE UNIQUE INDEX "AwardRecord_projectId_competitionId_key" ON "AwardRecord"("projectId", "competitionId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberSnapshot_projectId_versionNo_key" ON "MemberSnapshot"("projectId", "versionNo");

-- CreateIndex
CREATE UNIQUE INDEX "Anomaly_ruleId_projectId_key" ON "Anomaly"("ruleId", "projectId");

-- CreateIndex
CREATE INDEX "UserRoleLink_role_idx" ON "UserRoleLink"("role");

-- CreateIndex
CREATE INDEX "TeamPost_status_createdAt_idx" ON "TeamPost"("status", "createdAt");

-- CreateIndex
CREATE INDEX "TeamPost_competitionId_status_idx" ON "TeamPost"("competitionId", "status");

-- CreateIndex
CREATE INDEX "TeamPost_authorId_idx" ON "TeamPost"("authorId");

-- CreateIndex
CREATE INDEX "TeamJoinRequest_userId_status_idx" ON "TeamJoinRequest"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TeamJoinRequest_postId_userId_status_key" ON "TeamJoinRequest"("postId", "userId", "status");


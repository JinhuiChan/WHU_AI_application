export const datasetFields = [
  { key: "submittedAt", label: "提交时间", sensitive: false },
  { key: "batchName", label: "批次", sensitive: false },
  { key: "applicationUnit", label: "申报单位", sensitive: false },
  { key: "groupName", label: "分组", sensitive: false },
  { key: "leaderStudentNo", label: "负责人（学号）", sensitive: false },
  { key: "leaderName", label: "负责人姓名", sensitive: false },
  { key: "grade", label: "年级", sensitive: false },
  { key: "enrollmentYear", label: "入学年份", sensitive: false },
  { key: "graduationYear", label: "毕业年份", sensitive: false },
  { key: "educationStage", label: "培养阶段", sensitive: false },
  { key: "trainingUnit", label: "培养单位", sensitive: false },
  { key: "gender", label: "性别", sensitive: false },
  { key: "ethnicity", label: "民族", sensitive: false },
  { key: "payeeName", label: "奖金领款人", sensitive: false },
  { key: "trackDisplay", label: "赛道", sensitive: false },
  { key: "projectName", label: "项目名称", sensitive: false },
  { key: "workName", label: "作品", sensitive: false },
  { key: "workForm", label: "作品形式", sensitive: false },
  { key: "workCategory", label: "作品类别", sensitive: false },
  { key: "workGroup", label: "作品组别", sensitive: false },
  { key: "applicantName", label: "申报者姓名（集体名称）", sensitive: false },
  { key: "phone", label: "申请人手机号", sensitive: false },
  { key: "email", label: "申报者邮箱", sensitive: false },
  { key: "score", label: "评分（二课遗留，只读展示）", sensitive: false },
  { key: "status", label: "状态", sensitive: false },
  { key: "teachers", label: "指导老师（多人）", sensitive: false },
  { key: "members", label: "团队成员（多人）", sensitive: false },
  { key: "idCard", label: "身份证号", sensitive: true },
  { key: "bankCard", label: "银行卡号", sensitive: true },
] as const;

export type DatasetFieldKey = (typeof datasetFields)[number]["key"];

export const datasetFieldMap = Object.fromEntries(
  datasetFields.map((field) => [field.key, field]),
) as Record<DatasetFieldKey, (typeof datasetFields)[number]>;

export const defaultDatasetFields = datasetFields.filter((field) => !field.sensitive).map((field) => field.key);
export const requiredDatasetFields: DatasetFieldKey[] = ["projectName", "status"];

export function isDatasetFieldKey(value: unknown): value is DatasetFieldKey {
  return typeof value === "string" && Object.hasOwn(datasetFieldMap, value);
}

export function normalizeDatasetFields(value: unknown): DatasetFieldKey[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const normalized: DatasetFieldKey[] = [];
  for (const item of value) {
    if (!isDatasetFieldKey(item)) return null;
    if (!normalized.includes(item)) normalized.push(item);
  }
  return normalized;
}

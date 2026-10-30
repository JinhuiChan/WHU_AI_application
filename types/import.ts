export const importSystemFields = [
  {
    key: "projectName",
    label: "项目名称",
    required: true,
    aliases: ["项目名"],
  },
  {
    key: "leaderPersonNo",
    label: "负责人学号",
    required: true,
    aliases: ["负责人（学号）", "负责人(学号)", "负责人编号", "负责人"],
  },
  {
    key: "leaderName",
    label: "负责人姓名",
    required: true,
    aliases: ["队长姓名"],
  },
  {
    key: "college",
    label: "学院",
    required: true,
    aliases: ["培养单位", "申报单位", "学院名称"],
  },
  {
    key: "track",
    label: "赛道",
    required: false,
    aliases: ["竞赛赛道"],
  },
  {
    key: "group",
    label: "组别",
    required: false,
    aliases: ["作品组别", "项目组别", "分组"],
  },
  {
    key: "category",
    label: "类别",
    required: false,
    aliases: ["作品类别", "项目类别"],
  },
  {
    key: "members",
    label: "成员",
    required: false,
    aliases: ["团队成员", "团队成员（多人）", "团队成员(多人)"],
  },
  {
    key: "teachers",
    label: "指导老师",
    required: false,
    aliases: ["指导教师", "指导老师（多人）", "指导老师(多人)", "指导教师（多人）"],
  },
  {
    key: "payee",
    label: "领款人",
    required: false,
    aliases: ["奖金领款人", "领款人姓名"],
  },
  {
    key: "applicationUnit",
    label: "申报单位",
    required: false,
    aliases: ["报送单位"],
  },
  {
    key: "trainingUnit",
    label: "培养单位",
    required: false,
    aliases: ["所属单位", "培养单位（全称）"],
  },
  {
    key: "grade",
    label: "年级",
    required: false,
    aliases: ["入学年级"],
  },
  {
    key: "enrollmentYear",
    label: "入学年份",
    required: false,
    aliases: ["入学年", "入学时间"],
  },
  {
    key: "graduationYear",
    label: "毕业年份",
    required: false,
    aliases: ["毕业年", "毕业时间"],
  },
  {
    key: "educationStage",
    label: "培养阶段",
    required: false,
    aliases: ["学历层次", "学历", "层次"],
  },
  {
    key: "gender",
    label: "性别",
    required: false,
    aliases: [],
  },
  {
    key: "ethnicity",
    label: "民族",
    required: false,
    aliases: ["民族（x族）"],
  },
  {
    key: "phone",
    label: "手机号",
    required: false,
    aliases: ["申报者手机号", "申请人手机号", "联系电话", "申报者电话"],
  },
  {
    key: "email",
    label: "邮箱",
    required: false,
    aliases: ["申报者邮箱", "邮箱地址", "电子邮箱"],
  },
  {
    key: "workForm",
    label: "作品形式",
    required: false,
    aliases: [],
  },
  {
    key: "workCategory",
    label: "作品类别",
    required: false,
    aliases: [],
  },
  {
    key: "workGroup",
    label: "作品组别",
    required: false,
    aliases: [],
  },
  {
    key: "status",
    label: "状态",
    required: false,
    aliases: ["审核状态", "当前状态"],
  },
] as const;

export type ImportSystemFieldKey = (typeof importSystemFields)[number]["key"];
export type ImportMapping = Partial<Record<ImportSystemFieldKey, string>>;
export type ImportFileType = "xlsx" | "docx" | "pdf";
export type ImportStage = "SCHOOL" | "PROVINCE";

export type ImportParseResult = {
  fileName: string;
  fileType: ImportFileType;
  columns: string[];
  previewRows: string[][];
  suggestedMapping: ImportMapping;
  requiresConfirm: boolean;
  totalRows: number;
};

export type ImportMappingSaveInput = {
  competitionId: string;
  stage: ImportStage;
  fileName: string;
  totalRows: number;
  mapping: ImportMapping;
};

export type ImportMappingSaveResult = {
  batchId: string;
};

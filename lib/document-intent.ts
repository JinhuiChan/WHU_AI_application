export type DocumentIntent = "overview" | "process" | "materials" | "eligibility" | "rules";

export function documentIntent(question: string): DocumentIntent | null {
  if (/总结|概括|梳理|拆解|解读|读一下|重点/.test(question)) return "overview";
  if (/流程|步骤|赛程|(?:报名|初赛|复赛).*总决赛|怎么(?:报名|参赛|参加|申报)|如何(?:报名|参赛|参加|申报)|怎样(?:报名|参赛|参加|申报)|报名方式|参赛方式|操作指南|先做什么/.test(question)) return "process";
  if (/材料|清单|表格|填表|填写|怎么填|如何填|提交什么|准备什么|交什么/.test(question)) return "materials";
  if (/资格|条件|能否参加|能参加|能参赛|可以参加|可以参赛|适合.*组|属于.*组|限制|例外|学籍|学历|毕业|股权|法人|年龄/.test(question)) return "eligibility";
  if (/规则|规程|通知|要求|原文|规定|人数|几人|几名|几个人|多少人|团队规模|跨校|跨学院|跨院|借用|同时报|多个赛道|重复报名|金奖|银奖|费用|收费|评审|评分/.test(question)) return "rules";
  return null;
}

export const intentTopics: Record<DocumentIntent, string[]> = {
  overview: ["资格", "条件", "组别", "报名", "流程", "材料", "赛程", "要求", "限制"],
  process: ["流程", "赛程", "报名", "提交", "审核", "审查", "推荐", "评审", "公示", "材料", "时间"],
  materials: ["材料", "清单", "提交", "填写", "格式", "附件", "盖章", "签字", "表格"],
  eligibility: ["资格", "条件", "对象", "组别", "学籍", "学历", "毕业", "年龄", "注册", "股权"],
  rules: ["要求", "规则", "限制", "评审", "评分", "组别", "参赛"],
};

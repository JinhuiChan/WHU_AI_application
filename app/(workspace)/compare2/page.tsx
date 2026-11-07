import type { Metadata } from "next";
import { AlertTriangle, Check, ChevronDown, Info, Upload } from "lucide-react";

export const metadata: Metadata = { title: "界面问题对照 · 第二组" };

function Case({
  index,
  title,
  pain,
  gain,
  cost,
  children,
}: {
  index: number;
  title: string;
  pain: string;
  gain: string;
  cost: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
          {index}
        </span>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">{cost}</span>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{pain}</p>
      {children}
      <p className="mt-3 flex items-start gap-1.5 text-xs leading-5 text-emerald-700">
        <Check size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
        {gain}
      </p>
    </section>
  );
}

function Side({ kind, label, children }: { kind: "now" | "next"; label: string; children: React.ReactNode }) {
  return (
    <div
      className={
        kind === "now"
          ? "rounded-lg border border-slate-200 bg-slate-50 p-3"
          : "rounded-lg border border-blue-200 bg-blue-50/40 p-3"
      }
    >
      <div className="mb-2">
        <span
          className={
            kind === "now"
              ? "rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600"
              : "rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white"
          }
        >
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

export default function ComparePage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">界面问题对照 · 第二组</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
          左边<strong className="text-slate-900">现在真实的样子</strong>，右边
          <strong className="text-slate-900">建议改成的样子</strong>。告诉我改哪几个编号，改完这页就删掉。
        </p>
      </div>

      <Case
        index={1}
        title="审计日志的「操作对象」是一串乱码"
        cost="中，要补一次名称查询"
        pain="日志页是给管理员查「谁在什么时候动了哪个项目」的，但「操作对象」那一列显示的是数据库内部编号：52306aba-e947-47d3-ad49-40ea22eacaba。看到这串东西，等于什么也没看到。类型「User」还是英文。"
        gain="显示成人能读的：类型做成小标签，下面跟项目名或人名。查「谁改了低碳校园那个项目」才查得出来。"
      >
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Side kind="now" label="现在">
            <div className="rounded border border-slate-200 bg-white p-3 text-xs">
              <p className="mb-2 text-[11px] text-slate-500">操作对象</p>
              <div className="text-slate-700">User</div>
              <div className="mt-1 break-all font-mono text-[11px] text-slate-400">52306aba-e947-47d3-ad49-40ea22eacaba</div>
              <hr className="my-3 border-slate-100" />
              <div className="text-slate-700">Project</div>
              <div className="mt-1 break-all font-mono text-[11px] text-slate-400">ff57275f-3d14-46db-bb49-0c97f354e9c0</div>
            </div>
            <p className="mt-1.5 text-[11px] text-red-600">↑ 两行都是编号，看不出动的是谁</p>
          </Side>
          <Side kind="next" label="建议">
            <div className="rounded border border-slate-200 bg-white p-3 text-xs">
              <p className="mb-2 text-[11px] text-slate-500">操作对象</p>
              <div>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">用户</span>
                <div className="mt-1 text-slate-800">陈宇轩</div>
                <div className="text-[11px] text-slate-400">13800010001</div>
              </div>
              <hr className="my-3 border-slate-100" />
              <div>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">项目</span>
                <div className="mt-1 text-slate-800">低碳校园能源优化系统</div>
                <div className="text-[11px] text-slate-400">国创赛 · 机械与动力学院</div>
              </div>
            </div>
            <p className="mt-1.5 text-[11px] text-emerald-700">↑ 一眼看出动的是谁</p>
          </Side>
        </div>
      </Case>

      <Case
        index={2}
        title="两个上传页：主操作像个次要按钮"
        cost="小，两个页面各改一段"
        pain="数据导入和材料检查都是同一个毛病。「选择文件」是深蓝实心按钮，最显眼；真正的主操作「上传并解析」「开始检查」却在下面另一个位置，还是浅蓝的禁用色，看着像个可有可无的按钮。而且页面下半屏全空着。"
        gain="文件选好之后，主操作变成实心蓝、放在虚线框右下角，视线从「选文件」顺着走到「开始」。没选文件时它是灰的，也没人点错。"
      >
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Side kind="now" label="现在">
            <div className="rounded border border-slate-200 bg-white p-3">
              <div className="rounded border border-dashed border-slate-300 p-3">
                <p className="text-[11px] text-slate-500">选择报名数据文件</p>
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1 text-[11px] font-medium text-white">
                  选择文件
                </span>
                <span className="ml-2 text-[11px] text-slate-500">未选择任何文件</span>
              </div>
              <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-blue-300 px-3 py-1 text-[11px] font-medium text-white">
                <Upload size={12} aria-hidden="true" /> 上传并解析
              </span>
              <div className="mt-2 h-[70px] rounded border border-dashed border-slate-200" />
            </div>
            <p className="mt-1.5 text-[11px] text-red-600">↑ 深蓝的在上面（选文件），浅蓝的在下面（真主操作）</p>
          </Side>
          <Side kind="next" label="建议">
            <div className="rounded border border-slate-200 bg-white p-3">
              <div className="rounded border border-dashed border-slate-300 p-3">
                <p className="text-[11px] text-slate-500">选择报名数据文件</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-medium text-slate-700">
                    选择文件
                  </span>
                  <span className="text-[11px] text-slate-500">未选择任何文件</span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
                  <span className="text-[10px] text-slate-400">支持 xlsx / docx / pdf，单个不超过 20MB</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-3 py-1 text-[11px] font-medium text-slate-500">
                    <Upload size={12} aria-hidden="true" /> 上传并解析
                  </span>
                </div>
              </div>
              <div className="mt-2 h-[70px] rounded border border-dashed border-slate-200" />
            </div>
            <p className="mt-1.5 text-[11px] text-emerald-700">↑ 选文件降级为描边，主操作在右下角、按状态变色</p>
          </Side>
        </div>
      </Case>

      <Case
        index={3}
        title="奖项录入：两行字挤在一起，行高参差不齐"
        cost="小，挪一列"
        pain="操作列里「选择奖项 ▾」和「保存」两个按钮并排挤在 100 多像素里，有的行下面还挂一行「未通过终审」小字。结果是有的行高、有的行矮，整张表参差不齐，滚动时看着像错位。"
        gain="「未通过终审」挪到「当前奖项」列（那本来就是讲奖项的列），操作列只留两个按钮，所有行一样高。"
      >
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Side kind="now" label="现在">
            <div className="rounded border border-slate-200 bg-white">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-2 py-1.5">项目</th>
                    <th className="px-2 py-1.5">当前奖项</th>
                    <th className="px-2 py-1.5">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-2 py-2">农业无人机精准作业平台</td>
                    <td className="px-2 py-2 text-slate-500">未录入</td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1">
                        <span className="rounded-full border border-slate-300 px-2 py-0.5 text-[10px]">选择奖项</span>
                        <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] text-white">保存</span>
                      </div>
                      <div className="mt-0.5 text-[9px] text-slate-400">未通过终审</div>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-2 py-2">柔性传感与智能康复设备</td>
                    <td className="px-2 py-2 text-slate-500">未录入</td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1">
                        <span className="rounded-full border border-slate-300 px-2 py-0.5 text-[10px]">选择奖项</span>
                        <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] text-white">保存</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-1.5 text-[11px] text-red-600">↑ 第一行比第二行高一块</p>
          </Side>
          <Side kind="next" label="建议">
            <div className="rounded border border-slate-200 bg-white">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-2 py-1.5">项目</th>
                    <th className="px-2 py-1.5">当前奖项</th>
                    <th className="px-2 py-1.5">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-2 py-2">农业无人机精准作业平台</td>
                    <td className="px-2 py-2 text-slate-500">
                      未录入
                      <span className="mt-0.5 block text-[10px] text-amber-700">未通过终审</span>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2">
                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-2 py-0.5 text-[10px]">
                        选择奖项 <ChevronDown size={9} aria-hidden="true" />
                      </span>
                      <span className="ml-1 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] text-white">保存</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-2 py-2">柔性传感与智能康复设备</td>
                    <td className="px-2 py-2 text-slate-500">未录入</td>
                    <td className="whitespace-nowrap px-2 py-2">
                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-2 py-0.5 text-[10px]">
                        选择奖项 <ChevronDown size={9} aria-hidden="true" />
                      </span>
                      <span className="ml-1 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] text-white">保存</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-1.5 text-[11px] text-emerald-700">↑ 两行一样高</p>
          </Side>
        </div>
      </Case>

      <Case
        index={4}
        title="异常核实：四个统计块粘成一条彩带"
        cost="小，改间距和圆角"
        pain="异常总数、待核实、已处置、处置率四个块首尾无缝连在一起，靠底色区分。看起来像一条横幅，不像四张并列的数字卡。下面的进度条也紧贴着，层次挤在一起。"
        gain="拆成四张独立卡片，之间有缝、各自圆角，和看板上的统计卡同一套语言。"
      >
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Side kind="now" label="现在">
            <div className="overflow-hidden rounded border border-slate-200">
              <div className="flex">
                <div className="flex-1 bg-slate-50 px-3 py-2">
                  <p className="text-[10px] text-slate-500">异常总数</p>
                  <p className="text-lg font-semibold text-slate-900">0</p>
                </div>
                <div className="flex-1 border-l border-white bg-amber-50/70 px-3 py-2">
                  <p className="text-[10px] text-amber-700">待核实</p>
                  <p className="text-lg font-semibold text-amber-700">0</p>
                </div>
                <div className="flex-1 border-l border-white bg-emerald-50/70 px-3 py-2">
                  <p className="text-[10px] text-emerald-700">已处置</p>
                  <p className="text-lg font-semibold text-emerald-700">0</p>
                </div>
                <div className="flex-1 border-l border-white bg-blue-50/70 px-3 py-2">
                  <p className="text-[10px] text-blue-700">处置率</p>
                  <p className="text-lg font-semibold text-blue-700">0%</p>
                </div>
              </div>
              <div className="flex items-center justify-between px-3 py-1 text-[10px] text-slate-400">
                <span>已处置 0 / 总数 0</span>
                <span>0%</span>
              </div>
            </div>
            <p className="mt-1.5 text-[11px] text-red-600">↑ 四块连成一条，边界靠白线硬切</p>
          </Side>
          <Side kind="next" label="建议">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <p className="text-[10px] text-slate-500">异常总数</p>
                <p className="text-lg font-semibold text-slate-900">0</p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-[10px] text-amber-700">待核实</p>
                <p className="text-lg font-semibold text-amber-700">0</p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                <p className="text-[10px] text-emerald-700">已处置</p>
                <p className="text-lg font-semibold text-emerald-700">0</p>
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                <p className="text-[10px] text-blue-700">处置率</p>
                <p className="text-lg font-semibold text-blue-700">0%</p>
              </div>
            </div>
            <p className="mt-1.5 text-[11px] text-emerald-700">↑ 四张独立卡片，和看板统计卡同一套</p>
          </Side>
        </div>
      </Case>

      <Case
        index={5}
        title="用户管理：同一句话写了两遍"
        cost="小，去掉一列"
        pain="「审核状态」列显示绿色「已审核」，下面又跟一行「管理员」；而左侧「角色」列已经写着管理员了。「审核信息」列整列都是「—」，占着一列宽度什么也没说。"
        gain="「审核状态」只显示状态，重复的角色名去掉；「审核信息」并进同一列，有内容才显示。表格少一列，剩下的列宽能松开。"
      >
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Side kind="now" label="现在">
            <div className="rounded border border-slate-200 bg-white">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-2 py-1.5">用户</th>
                    <th className="px-2 py-1.5">角色</th>
                    <th className="px-2 py-1.5">审核状态</th>
                    <th className="px-2 py-1.5">审核信息</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-2 py-2">陈宇轩</td>
                    <td className="px-2 py-2 text-slate-600">学生</td>
                    <td className="px-2 py-2">
                      <span className="text-emerald-700">已审核</span>
                      <span className="mt-0.5 block text-[10px] text-slate-500">学生</span>
                    </td>
                    <td className="px-2 py-2 text-slate-400">—</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-1.5 text-[11px] text-red-600">↑ 「学生」写了两次，最后那列只有一个横杠</p>
          </Side>
          <Side kind="next" label="建议">
            <div className="rounded border border-slate-200 bg-white">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-2 py-1.5">用户</th>
                    <th className="px-2 py-1.5">角色</th>
                    <th className="px-2 py-1.5">审核状态</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-2 py-2">陈宇轩</td>
                    <td className="px-2 py-2 text-slate-600">学生</td>
                    <td className="px-2 py-2">
                      <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-200">
                        已审核
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-1.5 text-[11px] text-emerald-700">↑ 少一列，状态用徽章</p>
          </Side>
        </div>
      </Case>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-2 text-sm leading-6 text-amber-900">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            另外发现一个不属于「改样式」的问题：<strong>/rankings 学院排行</strong>{" "}
            这个页面现在是空的，只有一张写着「已并入看板」的卡片，下面六百像素全白，侧栏里也没有入口。
            它是个已经废弃但没删掉的路由，要么删掉，要么让它跳回看板。
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-start gap-2 text-sm leading-6 text-slate-600">
          <Info size={16} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
          <span>这一页是临时对照用的，不在产品里。告诉我要改哪几个编号，改完就删。</span>
        </div>
      </div>
    </div>
  );
}

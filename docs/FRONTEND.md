# 前端约定

## 已锁定记号（登录页第一刀）

- 视觉 A：沿用现有浅色蓝体系（bg-slate-50 / #f8fafc / blue-600），不使用学院墨蓝或深色青绿，不做深蓝侧栏。
- 主按钮 B2：胶囊 `rounded-full`，沿用现有蓝 `bg-blue-600`。
- 次按钮：同形状描边胶囊（`variant="outline"`），不要做成第二个实心主按钮；按下加深用 `active:bg-slate-100`，不要 `bg-blue-800`。
- 表单 F2：标签在左、控件在右，标签列宽一致；窄屏（默认 < `sm`）标签移到控件上方。
- 卡片 C2：白底、细描边 `border-slate-200`、轻阴影 `shadow-sm`，圆角约 12px（`rounded-xl`），不加更重的阴影。
- 点按 K3：按下稍微缩小并颜色加深（`active:scale-[0.97]` + 变深），transition 160ms ease-out，无弹跳/回弹；`motion-reduce:active:scale-100` 取消缩小，仍可变深。
- 顶栏 H3：整条浅色通栏，白底 + 细底边 `border-slate-200`；左上角「WHU 科创赛事平台」+ 现有站点图标 `/favicon.ico`；名称下方预留一行空的小字占位（不写文案、不画虚线、不出现「预留」）；右侧链接位由 `LOGIN_HEADER_LINKS`（`{ label, href }[]`）渲染，本刀数组为空。
- 登录页第一刀已落地，后续展示刀**不得回退**登录页 H3 / F2 / C2 / B2 / K3；改共享 `Button` 时登录提交按钮须继续显式传 `className="w-full"`（`Button` 默认不再自带 `w-full`）。

## 报名页第二刀（展示）

- 沿用视觉 A / B2 / F2 / C2 / K3。
- 标题区：保留现有浅蓝提示条（`bg-blue-50` + 「项目报名」与「当前学生：…」原文，含「未绑定学号」）；本刀不改成白底细线标题。
- 各段做成 C2 细描边白卡片；宽屏两列布局保留，**每一格**做成 F2；标签字号至少 14px（`text-sm`），输入框用小档圆角（`rounded-lg`），不做胶囊。
- 「提交报名」= 实心蓝胶囊 + K3；「保存草稿」= 同形状描边胶囊。弹窗「确认添加」「检索」按主按钮；「取消」描边。按钮文案一字不改。
- 底栏摆法已锁定 **A2**：保存草稿与提交报名等分底栏（各约 50% 宽），**sticky 贴视口底**的细底栏（少内边距，非大卡片）。A3 仍未采用。
- 三态只换样子：空态沿用「暂未添加指导老师」「暂未添加团队成员」「尚未选择文件」；加载沿用「保存中…」「提交中…」「检索中」，不加整页骨架；错误沿用接口/`前端校验`/既有失败句，不另加「重试」按钮。
- 不改报名提交/保存/跳转、请求字段、校验规则、权限；不解释外部平台报名 vs 站内 `/apply`。
- 工作区侧栏展示名「科创赛事 / 综合管理服务平台」与登录页「WHU 科创赛事平台」不同，**不要改侧栏文案去对齐登录名**。

## 共享 Button

- 手写 `components/ui/button.tsx`：`variant="default" | "outline"`；默认不含 `w-full`（由调用方传入）。
- 不跑 shadcn CLI；不为换肤生成 Card / Select / Dialog。

## 本刀范围

登录页第一刀 + 报名页第二刀展示，以及占位页仅样式收齐（不挂真实功能）。不改 `lib/` 业务、`app/api/`、`prisma/`、`middleware.ts`、`.env`；不升级 Next/React/Tailwind；不引入 antd/状态库/表单库；花叔设计不进仓库。


## 工作区内容页收齐（展示扫尾）

- 同一套视觉 A / C2 / F2 / B2+outline / K3 铺到已有真实内容页（看板、赛事、我的项目、审核及相关管理页等）。
- 侧栏/顶栏只收间距与形状；不得改「科创赛事」「综合管理服务平台」及菜单文案；不得做成登录 H3。
- 占位页只保留圆角收齐，不挂真实功能。
- 报名页：底栏已锁定 **A2 等分 + sticky 细底栏**；浅蓝标题条保留；文件选择隐藏原生「未选择文件」，「选择文件」为描边次按钮；「申报者邮箱」整行。

## 2026-11-07 现状补记（与上方早期条款冲突时，以本节和当前代码为准）

上方「不得回退」条款记录的是 11-06 第一刀时的形态，用户后续已明确调整方向。**不要按旧条款把现有登录页、占位页或共享组件回退掉。** 本节只追加现状，不删除历史记录。

- 登录页：**浅色白底 + 蓝色主色**，不做深色、不用青绿。布局由「H3 顶栏 + 居中白卡片」改为**左右分栏**（左侧品牌叙事、右侧表单）；字段标签回到控件上方，不再 F2 左置；去掉 H3 顶栏与 C2 白卡片外壳。B2 胶囊按钮、K3 按压缩放仍保留。
- 左侧品牌大标语用 `.font-rounded`（系统圆体栈，零成本预览版）；正式字体方案待定，不要求全站替换。
- 登录页已加：密码显示/隐藏、身份记忆（仅存下拉框，不存手机号与密码）、手机号自动聚焦、失败后的可操作引导与「清空重输」、「学生注册」整块描边按钮、平台定位澄清文案、静态报名入口说明、依次淡入（带 `prefers-reduced-motion` 降级）。
- **占位页已挂真实功能**：`/anomalies`、`/check`、`/assistant` 不再写「功能暂未开放」，分别调用现有组件与接口；`/rankings` 仍保留「已并入看板」，是否恢复独立页属产品决策，先确认再做。
- 看板：按角色的快捷入口、卡片依次淡入、人话空态 + 「清除筛选」。
- 注册页：与登录页同款的密码显示/隐藏、随身份变化的提示、错误可操作引导、焦点态统一、整块「返回登录」按钮；注册校验与提交逻辑未改。
- 共享 `Button` 已改为 shadcn 风格（cva + Radix Slot + `cn()`），**走「按需引入 shadcn」路线**；4 变体 × 2 尺寸，仍保留 B2 胶囊与 K3。不跑最新 shadcn CLI（本项目 Tailwind 3）。
- 底座不升级：Next 14 / React 18 / Tailwind 3；新增依赖仅 `class-variance-authority`、`clsx`、`tailwind-merge@2`、`@radix-ui/react-slot`。
- 仍然有效：**只改前端**，不动 `lib/`、`app/api/`、`prisma/`、`middleware.ts`、`.env`；权限归属与报名业务口径由产品和后端负责人确认，前端不做假权限、不编造数据。

## 2026-11-07 第三层：sonner + motion（依赖清单以本节为准）

- 在上一节那 4 个依赖之外，本轮新增 **2 个运行时依赖**：`sonner@2`、`motion@14`（导入路径是 `motion/react`，**不是** `framer-motion`）。Next 14 / React 18 / Tailwind 3 版本一个没动，**未跑 shadcn CLI**。
- `app/layout.tsx` 全局挂 `<Toaster />`：浅色、右上角、`offset=76`（下移避开页头用户菜单）、3.2s 自动消失、可手动关闭。toast **只加在「操作后跳转、原本没有任何文字反馈」的路径**：登录成功、报名草稿/提交、新建赛事。审核页与异常页已有页面内 notice / 错误条，**不重复弹**；注册页用 `window.location` 整页跳转，toast 会随页面卸载，故不加。
- React Bits 组件按官方 **TS + Tailwind** 变体**手动复制源码**到 `components/react-bits/`，没跑 `npx shadcn@latest add @react-bits/...`（该 CLI 面向 Tailwind v4 / React 19）。`BlurText.tsx` 相对官方只改了一处：根元素 `<p>` → `<span>`（并同步 ref 类型），以便合法嵌进 `<h1>`；**后续更新源码时请保留这处改动**。
- 登录页大标语用 Blur Text 逐字清晰：中文必须用 `animateBy="letters"`，官方默认按空格分词对中文无效；原 `.login-fade-up` 已移除，避免父子双重动画。看板四个统计数字用 Count Up 从 0 滚到**服务端返回的真实值**，待办红色与红边保留。
- 降级：两个组件自带 `reducedMotion` / `matchMedia` 判断，另在 `globals.css` 补了一条 `prefers-reduced-motion` 规则，把 `.blur-text` 强制锁到终态。动画不得影响表单可读性和键盘操作。
- **零依赖的 React Bits 效果**（Glare Hover、Shiny Text）本轮未加；需要时单独确认后再落地。

## 2026-11-07 Spotlight Card（看板快捷入口）

- `components/react-bits/SpotlightCard.tsx` 为官方 **TS + Tailwind** 源码手动复制（纯 React，**零第三方依赖**），同样没跑 shadcn CLI。
- 相对官方改了 **3 处**，目的都是「只负责打光、不接管卡片外观」。官方自带 `rounded-3xl p-8` + 白卡背景 + 阴影，直接套会顶掉项目现有的 12px 圆角与 16px 内边距：
  1. `CARD` 常量改为 `relative isolate overflow-hidden rounded-[inherit]`，去掉圆角、内边距、背景色和阴影。
  2. 删掉静态边框 span，避免与现有 `border border-slate-200` 叠成两层边框。
  3. `focusin` / `focusout` 挂到 `root.parentElement`，并让焦点判定接受父级——卡片被包在 `<a>` 里时，官方原逻辑（只认卡片内部元素）会失效，键盘聚焦不亮。
- 目前只用在 `/dashboard` 快捷入口的三张卡：`theme="light"`、`spotlightColor="#2563eb"`、`intensity=0.55`（浅色主题内部再乘 0.28，实际约 0.15）、`proximity=48`、`borderGlow=0.4`。统计卡、表格行、审核列表**不用**。
- **更新该组件源码时请保留上面 3 处改动**，否则会退回「接管卡片外观 + 键盘不亮」的官方行为。

## 2026-11-07 Stepper（数据导入步骤条）

- `components/react-bits/StepperIndicator.tsx` 取自官方 `Components/Stepper/Stepper.tsx`，但**只抽了步骤指示条**，没有引入它自带的内容视口与页脚。
- 为什么不整块套：官方内容视口是 `overflow-hidden`，会把导入预览里 `min-w-[1800px]` 的宽表裁掉；而且导入流程的三步各有自己的异步按钮（上传并解析 / 保存映射方案 / 入库），不是「上一步 / 下一步」。整块套等于改流程，只换零件风险最低。
- 相对官方改了 **4 处**，更新源码时请保留：
  1. 只保留指示条，`current` 由页面自己的 `step` 状态传入，组件不持有步骤状态、不渲染内容、不渲染页脚。
  2. 主题变量映射到 `globals.css` 的语义 token（`--surface-muted` / `--border` / `--ink` / `--brand` / `--brand-soft`），不再用官方写死的灰阶。
  3. 图标从 `@hugeicons/core-free-icons` 换成项目已有的 `lucide-react`（`Check`），**不新增依赖**。
  4. 徽章语义调整：官方是「当前=描边、已完成=实心」，这里改成「当前=品牌实心白字、已完成=品牌浅底打勾」，因为中文后台里当前步骤需要最醒目。
- 还修了官方一处行为：`ResizeObserver` 在 `observe()` 后必定回调一次，会把刚设好的 `transform` 过渡覆盖成 `opacity-only`，导致切换步骤变成瞬移。现在只在轨道宽度真的变化时才重算，切换保留 560ms 弹簧（实测采样 `4 → 61 → 220 → 367 → 400 → 391 → 374 → 370`，有弹性过冲）。
- 目前只用在 `/import`：替换了原来手写的 `<ol>`，外层卡片（`rounded-xl border shadow-sm p-4`）保留，**默认不传 `onStepClick`**，所以步骤条只做展示、不可点击，与原 `<li>` 行为一致。窄屏（<640px）只显示数字徽章，标题仍保留在 `aria-label` 里供读屏使用。

## 2026-11-07 看板统计卡可点 + 我的项目筛选

- 看板统计卡原来只有数字、点不动，容易被当成死块。现在给**能准确跳转的卡片**加了链接和右上角箭头（hover 变蓝、按压缩放、`focus-visible` 轮廓，Tab 可聚焦）：
  - 学生：我的项目数 → `/my?filter=all`；我的待审核 → `pending`；我的终审通过 → `final`；我的晋级省赛 → `advanced`
  - 管理员：项目总数 → `/projects`；待审核数 → `/review`（默认就是待审核 tab）
  - **「报名总人数（去重）」和「晋级省赛数」保持不可点**：前者没有对应明细页，后者 `/projects` 不支持按状态筛选。宁可不给入口，也不让人点进去看到一份无关列表。
- 「我的状态」里每个状态块也是链接，`status → filter` 映射与 `/my` 的取值一致（`PENDING`/`COLLEGE_REVIEW` → `pending`，`PROVINCE_ADVANCED`/`NATIONAL_ADVANCED` → `advanced`）。
- `/my` 新增 `?filter=`：pills（全部 / 待审核 / 终审通过 / 晋级省赛 / 已驳回 / 草稿 / 已撤回，各带数量）+ 结果过滤 + 针对性空态。**筛选在页面内对 `getMyProjects` 已返回的数组过滤**，没有改 `lib/apply.ts`、没有加接口参数。
- **口径必须与 `lib/statistics.ts` 一致**：统计按 `reviewStatus` 分组，所以筛选也用 `reviewStatus`，否则会出现「卡片写 1、列表是 0」。为此表格状态列从 `projectStatusLabels[project.status]` 改为 `registrationStatusLabels[project.reviewStatus]`（两套枚举在本项目现有数据里取值一致，但 reviewStatus 才是「报名进度」的语义）。
- 顺带把「新建报名」按钮从 `/apply` 改为 `/competitions`：`/apply` 不带 `competitionId` 会被服务端重定向回赛事列表，直连少一跳。

## 2026-11-07 赛事简介（/intro）—— 卡片式赛事介绍

- 新增两个页面：`app/(workspace)/intro/page.tsx`（卡片列表）与 `app/(workspace)/intro/[id]/page.tsx`（简介详情），**只读展示，不写库、不加接口**。
- 定位区别：`/competitions/[id]` 是操作型详情（报名、时间窗、文件、获奖、管理员操作），`/intro/[id]` 是展示型介绍（定位、看点、赛道、流程、视频位）。两边互相有跳转，不复制对方的主功能。
- 入口补齐 4 处：侧栏「赛事简介」（管理员 / 学生 / 教师都有）、看板快捷入口（学生 3 张、管理员 4 张，列数随角色变 `lg:grid-cols-3/4`）、`/competitions` 顶部按钮、`/competitions/[id]` 顶部「查看赛事简介」。移动端底部导航从 `grid-cols-5` 改成 `flex + flex-1`，3～5 项都能均分，不会再留空格子。
- 卡片用 `SpotlightCard`（light 主题、蓝色聚光、`rounded-2xl` 由外层 `Link` 提供、卡片自身 `rounded-[inherit]`）。外层 `Link` 负责 hover 上浮与焦点轮廓，SpotlightCard 只负责打光。
- 简介文案：`components/competitions/competition-intro-data.ts` 按 `seriesId` 提供兜底介绍。**数据库 `Competition.description` 有值时优先用它**，为空才用兜底。文案只写赛事定位与流程，不写日期、名额、奖金等会变的规则，一律指向通知与规程。
- 视频位是**预留接口而不是假播放器**：查 `CompetitionAttachment` 里 `kind === "VIDEO"` 或文件名以 `mp4/webm/mov/m4v/ogv` 结尾的记录，有就渲染 `<video controls>`，没有就渲染 16:9 占位卡。管理员以后按现有附件上传流程传视频，这里会自动变成播放器，不需要再改前端。
- 详情页标题用 `BlurText`（`animateBy="letters"`，中文逐字），其余区块交给 `.page-enter` 的逐块渐入，不叠第二套入场动画。

## 2026-11-07 宣传片上传（管理端入口 + 过渡脚本）

- 管理端入口在 `/competitions/[id]` 新增区块「宣传片与赛事解读」（`id="media"`）：选视频 → 自动带出标题 → 上传；已上传时显示播放器与「删除宣传片」，删除走现有的附件 DELETE 接口，撤回后学生端自动回到占位卡。
- 视频与文档分开：附件列表排除 `kind = VIDEO` 与视频后缀，避免把 mp4 当通知列出来；学生端赛事详情页的「赛事文件」同样排除，播放位只放在赛事简介页。
- **接口现状**：附件上传接口只放行 `NOTICE / RULE / TEMPLATE` 与文档扩展名，视频一律 422。前端已捕获这种情况，把黄色提示换成「需要把 VIDEO 加进白名单」的可执行说明，不是一串校验报错。真正可用的上传必须后端改两处，清单见 `docs/配合后端-宣传片上传.md`。
- 过渡方案（现在就能把视频放上线）：`node scripts/import-competition-video.mjs --competition <ID|系列标识|名称> --file <视频> --title "宣传片"`，脚本把文件复制到 `public/uploads/competitions/<赛事ID>/` 并写一条 `kind = VIDEO` 记录；`--remove` 撤回，`--list` 查看现有宣传片。脚本没有登录身份，**不写审计日志**，正式环境应优先用接口上传。
- 学生端简介页的播放器与占位卡统一 `max-w-3xl`，避免大屏上播放器拉满整行、和占位卡的宽度不一致。

## 2026-11-07 Lattice Loader + Shiny Text（两个 React Bits 组件）

**LatticeLoader** —— `components/react-bits/LatticeLoader.tsx`，取自官方 `src/ts-tailwind/Micro/LatticeLoader`。
- 官方源码只改了 **1 处**：`useLayoutEffect` 换成同构版本（服务端降级为 `useEffect`），否则 Next.js SSR 会打印 "useLayoutEffect does nothing on the server"。图案表、CSS keyframes、props 全部保留。
- 用在哪：`/assistant` 提问等待（"正在检索知识库" + 秒表，挂在对话流末尾）；`/import` 解析等待（**替换**按钮而不是并排，容器固定 `h-9` 与按钮等高，避免布局跳动）。
- 为什么不放进按钮里：`Button` 自带 loading 转圈，叠加会变成"转圈 + 点阵"两套动画；而且 loader 本身已经回答"在干什么、等了多久"。
- 已知行为：三条 label（进行中 / 完成 / 失败）都常驻 DOM，未激活的用 `absolute + opacity-0`，所以 `innerText` 会读到全部三段文字；视觉无影响，读屏靠 `sr-only` 播报当前状态。

**ShinyText** —— `components/react-bits/ShinyText.tsx`，取自官方 `src/ts-tailwind/TextAnimations/ShinyText`，**未改源码**，零新增依赖（canvas 解析颜色 + `background-clip: text`）。
- 用在哪：登录页主标题**第二行**。第一行仍是 `BlurText` 逐字入场，第二行用 `.fade-up` 延迟 420ms 淡入后开始循环扫光，两行节奏接得上。
- 参数：`color #0f172a` / `shineColor #60a5fa` / `speed 3.2` / `delay 2.6` / `shineWidth 24` / `softness 0.72`。
- **`shineWidth` 为什么是 24 而不是默认 40**：宽度 46 时实测整行会同时落到过渡带里，看起来像"文字整体变灰蓝"；收到 24 后只有局部被提亮，其余保持深色，才是"一道光扫过"的观感。
- 可复用位置：赛事卡"报名中"标签、看板 CTA 文案。放大面积前先看 `shineWidth`，越长的一行越容易整行泛色。

## 2026-11-07 赛事列表操作列改胶囊按钮

- 原来「查看详情 / 立即报名 / 我的项目 / 删除」是四个纯文字链接，在 30 多行的表里很容易划过去。现在统一成 **h-8 胶囊按钮**（`Button asChild` + `size="sm"` + `className="h-8 px-3"`），操作列容器从 `inline` 改成 `flex flex-wrap gap-2`。
- 层级只保留三档，不要再多：**实心蓝 = 立即报名**（唯一主行动）、**白底描边 = 查看详情**、**灰字无边框 = 我的项目**（弱化，避免和主行动抢注意力）；管理员行的**删除**是红色描边。
- `CompetitionDeleteButton` 新增 `compact` 属性：只在表格操作列里压到 `h-8`，详情页仍用默认大小。不做成全局尺寸，避免影响其他调用点。
- 为什么用 `Button asChild` 而不是手写 `Link` 类名：`cn()` 是 `twMerge`，外部 `className` 能正确覆盖 `size` 自带的高度与内边距；手写的话以后改按钮样式又要同步一遍。
- **遗留不一致**：`/my`、`/projects`、`/review` 的操作列仍是文字链接。要统一时照这三档层级改，别每页各调一套。

## 2026-11-07 「抬升」定为全站按钮统一交互

- 用户从 8 种候选中选定 **1 抬升 Lift**。实现不新增 variant，而是写进 `buttonVariants` 的 base：`hover:-translate-y-0.5` + `hover:shadow-*`，`active:translate-y-0` 回落并 `scale-[0.97]`。所有变体、所有调用点自动生效，不需要逐个改页面。
- 投影按变体给色，不统一用黑：主按钮 `shadow-blue-600/25`、描边 `shadow-slate-900/10`、危险 `shadow-red-600/15`。同色投影看起来像「按钮浮起来」，黑投影更像「卡片有脏边」。
- `ghost` 显式抵消抬升（`hover:translate-y-0 hover:shadow-none`）：透明底浮起来只剩一圈脏阴影。`disabled` 同样抵消，避免禁用态还能浮。
- 抬升用 `translate` 而不是 `margin`/`top`，不参与布局重排，表格里密集排列不会撑开行高、不会抖动。实测表格行内按钮 hover 后 `top 408 → 406`、`transform translateY(-2px)`，同行其他元素纹丝不动。
- 主色可换：`/style-lab` 顶部新增「同一个抬升，换主色」区块，蓝／靛蓝／深墨／紫／墨绿五个色号并排。换色只需改 `bg-*`、`hover:bg-*`、`shadow-*/25` 三处，动效不用重写。**换全站主色则要替换散落各页的 `blue-*` 类名**，属于一次性全局替换 + 全页回归，不是改一个 token 的事。
- 已知未处理：移动端点击后 `hover` 会残留（Tailwind 3 默认不给 `hover:` 包 `@media (hover: hover)`）。要彻底解决需在 `tailwind.config` 开 `future.hoverOnlyWhenSupported`，会改变全站 hover 行为，单独评估。

## 2026-11-07 箭头滑入（Button 的 `arrow` 能力）

- `Button` 新增 `arrow?: boolean`，默认关闭。开启后悬停时从文字右侧滑出一个 14px 箭头，按钮**宽度不变**。
- 为什么不做成全站默认：箭头暗示「点了会走下一步」。全站 101 处 Button 里有大量取消、重置、删除、导出、驳回，挂上箭头会误导。只在语义是「进入 / 继续 / 提交前进」的按钮上开。
- **关键的实现取舍**：实验室里演示的箭头滑入是「宽度从 0 展开到 16px」，在单按钮场景很好看，但表格里一排按钮，鼠标移上去会把右边的按钮推走 16px。正式版改成**箭头固定占位 14px + 淡入 + 4px 内移**（`-ml-1.5` 抵掉部分 gap），实测 hover 前后按钮宽度差 0、相邻按钮位移 0，只有箭头透明度 0→1。
- 导出了 `ButtonArrow` 给 `asChild` 用：`Button` 在 `asChild` 模式下不能自动插箭头（Slot 只接受单个子元素），调用点写成 `<Link>文案<ButtonArrow /></Link>`，父元素记得带 `group`。目前用在赛事列表的「查看详情 / 立即报名」和赛事简介详情的「查看赛事详情 / 我要报名」。
- 与抬升**叠加**而不是二选一：抬升提供"按得动"的物理感，箭头提供"往哪走"的方向感。想去掉抬升只留箭头，删 `buttonVariants` base 里的 `hover:-translate-y-0.5` 即可。
- 没开箭头的：`我的项目`（刻意弱化，加箭头会抢主行动注意力）、`删除`（危险操作不该有前进暗示）、表单里的所有提交/重置按钮（提交后不一定跳页）。

## 2026-11-07 界面问题对照页（/compare，临时）

- 用户要求"做一个能让我看懂的东西"，纯文字描述他看不懂。做法：做一页左右并排的对照，左边是现在真实样式、右边是建议样式，全部用 Tailwind 真样式渲染，不用抽象框图。
- 5 个议题：① 状态颜色无语义 ② 项目台账表格溢出 ③ 报名审核按钮堆 ④ 我的项目空态 ⑤ 操作列仍是文字链接。
- **这一页是临时对照页**，用户看完选定编号后要连页面一起删，不是产品功能。
- 同批删除了 `/style-lab`（按钮样式实验室）。文件已 `mv` 到 `E:/_whu-cdp/trash/style-lab-1812`，不是 `rm`；breadcrumbs 里的映射同步移除。删完需要清 `.next/types/app/(workspace)/style-lab`，否则 `tsc` 会报「找不到模块」——那是构建产物里的旧路由类型，不是源码问题。

## 2026-11-07 状态颜色统一 + 我的项目下一步卡 + 操作列统一

**状态徽章 `components/ui/status-badge.tsx`（全站唯一口径）**

| 颜色 | 含义 | 对应状态 |
|---|---|---|
| 红 | 驳回、异常 | `REJECTED` |
| 橙 | 还没开始审，卡在入口 | `PENDING`（待审核、待学院审核） |
| 蓝 | 正在流转，不用本人动手 | `COLLEGE_REVIEW`、`ACTIVE` |
| 绿 | 通过、晋级 | `SCHOOL_FINAL`（仅 registration 口径）、`PROVINCE_ADVANCED`、`NATIONAL_ADVANCED` |
| 灰 | 未开始、已结束 | `DRAFT`、`WITHDRAWN`、`FINISHED` |

- **`SCHOOL_FINAL` 必须传 `scope`**：报名审核里它叫「校内终审通过」（绿），项目台账里它叫「校内终审」（还在审，蓝）。同一个枚举值两种含义，按状态值一刀切会出错。默认 `scope="registration"`，项目口径的页面显式传 `scope="project"`。
- 一次替换掉三套各自为政的实现：`review-workbench.tsx` 的本地 `statusTone`、`competitions/page.tsx` 的 `registrationTone`、`my/page.tsx` 写死的 `bg-blue-50`（原来「已驳回」和「待审核」都是蓝色）。覆盖 8 个位置：我的项目、我的项目详情、项目台账、项目详情（标题 + 基本信息）、审核工作台、审核详情、赛事列表「我的报名」、教师页。
- 以后新增状态显示一律用 `<StatusBadge status={...} scope={...}>文案</StatusBadge>`，不要再写局部配色函数。

**我的项目「下一步该做什么」卡**

- 学生通常只有一个项目，表格一行结束下面空掉半屏，而且「已驳回」三个字并不告诉人该点哪。表格下方补一张卡：图标 + 一句结论 + 退回原因 + 对应项目 + 一个动作按钮。
- 卡片底色跟随状态：驳回橙、等待蓝、通过绿、草稿白。优先挑需要本人动手的那个项目（驳回 → 等审核 → 其余），多个项目时在卡里注明「另有 N 个，见上表」。
- 文案只描述已有事实，**不写「3 个工作日内」这类没有依据的时限**。

**操作列统一**

- `/my`「查看」、`/projects`「查看全貌」、`/review`「查看详情」从蓝色文字链接改为 `Button asChild size="sm" variant="outline"` + `ButtonArrow`，与赛事页同一套（白底描边、悬停上浮、箭头滑入）。
- 顺带发现：`/projects` 表格 `min-w-[1180px]`，操作列换成按钮后更宽，横向溢出更明显。这条属于单独议题（表格溢出），尚未处理。

## 2026-11-07 审计日志对象名、奖项列表、异常统计卡

**审计日志「操作对象」补名称（`components/admin/audit-targets.ts`）**

- 原来只显示 `targetType`（英文 `User` / `Project`）和 `targetId`（UUID），管理员查不到东西。
- 现在第一行是 **类型标签 + 可读名称 + 补充信息**（用户带手机号、项目带赛事与学院、赛事带年份），第二行是小号等宽的内部编号，`select-all` 方便整段复制。
- **编号是刻意保留的**：用户明确要求「内部编号可能也有用」，排查问题、跟后端对数都要靠它，只是降到副信息层。
- 实现：页面里按 `targetType` 分组收集 id，只对 User / Project / Competition / Track / Teacher / CompetitionAttachment 六类做一次 `findMany`，其余类型（ImportBatch、Anomaly 等）只显示类型标签 + 编号。查不到的显示「未找到对应记录」，不假装成功。
- 表里没有名称字段的类型（TimeWindow、MaterialCheck、Assistant）不查，避免为显示一个空值多打一次库。

**奖项录入（`components/admin/award-workbench.tsx`）**

- 「未通过终审」从小字改成琥珀色小徽章，从操作列移到「当前奖项」列 —— 那本来就是讲奖项的列。
- 操作列加 `whitespace-nowrap`，并删掉保存前预览的「旧 → 新」那行（它与当前奖项列的保存后变化重复，且会撑高行）。
- 实测六行行高全部 69px，之前有徽章的行比别人高一块。

**异常核实（`components/admin/anomaly-management.tsx`）**

- 四块原来是整块彩色底（`bg-amber-50` 等）无缝并排，看起来像一条彩带。现在改成白底 + 淡色边框 + `shadow-sm` + 彩色数字，与看板统计卡同一套语言。
- 顺带把 `green-*` 统一成 `emerald-*`，进度条下面那行重复的百分比删掉（处置率卡片里已有）。

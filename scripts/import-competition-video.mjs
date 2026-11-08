/**
 * 宣传片导入（运维脚本）：在后端附件接口放开视频格式之前，用来把宣传片放上线。
 *
 * 用法：
 *   node scripts/import-competition-video.mjs --competition <赛事ID|系列标识|名称> --file <视频路径> --title "宣传片"
 *   node scripts/import-competition-video.mjs --competition <同上> --remove
 *   node scripts/import-competition-video.mjs --list
 *
 * 效果与「管理员在后台点上传」一致：文件落到 public/uploads/competitions/<赛事ID>/，
 * 并写一条 kind = VIDEO 的附件记录，学生端赛事简介页立即出现播放器。
 *
 * 与接口上传的差别：不写审计日志（脚本没有登录身份）。正式环境请优先用接口上传。
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, unlinkSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const root = process.cwd();

function loadEnv() {
  const envPath = path.join(root, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const matched = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!matched) continue;
    const value = matched[2].replace(/^["']|["']$/g, "");
    if (!process.env[matched[1]]) process.env[matched[1]] = value;
  }
}

function fail(message) {
  console.error(`[video] ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = { remove: false, list: false };
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (item === "--remove") args.remove = true;
    else if (item === "--list") args.list = true;
    else if (item === "--competition") args.competition = argv[++i];
    else if (item === "--file") args.file = argv[++i];
    else if (item === "--title") args.title = argv[++i];
  }
  return args;
}

function safeFileName(value) {
  const base = (value.split(/[\\/]/).pop() ?? "video.mp4").replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").trim();
  return (base || "video.mp4").slice(-120);
}

loadEnv();
const prisma = new PrismaClient();
const args = parseArgs(process.argv.slice(2));

async function findCompetition(keyword) {
  if (!keyword) fail("请用 --competition 指定赛事（ID / 系列标识 / 名称都可以）");
  const byId = await prisma.competition.findUnique({ where: { id: keyword }, select: { id: true, name: true } });
  if (byId) return byId;
  const candidates = await prisma.competition.findMany({
    where: { OR: [{ seriesId: keyword }, { name: { contains: keyword } }] },
    select: { id: true, name: true, year: true, seriesId: true },
    orderBy: [{ year: "desc" }],
  });
  if (candidates.length === 0) fail(`找不到赛事：${keyword}`);
  if (candidates.length > 1) {
    console.error(`[video] 匹配到 ${candidates.length} 个赛事，请改用赛事 ID：`);
    for (const item of candidates) console.error(`  - ${item.id}  ${item.year} ${item.name} (${item.seriesId})`);
    process.exit(1);
  }
  return candidates[0];
}

async function listVideos() {
  const videos = await prisma.competitionAttachment.findMany({
    where: { kind: "VIDEO" },
    select: { id: true, title: true, fileName: true, filePath: true, competition: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  if (!videos.length) {
    console.log("[video] 目前没有任何宣传片记录");
    return;
  }
  for (const item of videos) {
    console.log(`[video] ${item.competition.name} | ${item.title} | ${item.fileName} | ${item.filePath}`);
  }
}

async function removeVideo(competition) {
  const videos = await prisma.competitionAttachment.findMany({
    where: { competitionId: competition.id, kind: "VIDEO" },
  });
  if (!videos.length) {
    console.log(`[video] ${competition.name} 没有宣传片，跳过`);
    return;
  }
  for (const video of videos) {
    const diskPath = path.join(root, "public", video.filePath.replace(/^\//, ""));
    if (existsSync(diskPath)) unlinkSync(diskPath);
    await prisma.competitionAttachment.delete({ where: { id: video.id } });
    console.log(`[video] 已删除：${video.title}（${video.fileName}）`);
  }
}

async function importVideo(competition) {
  if (!args.file) fail("请用 --file 指定视频文件");
  const source = path.resolve(root, args.file);
  if (!existsSync(source)) fail(`文件不存在：${source}`);
  const size = statSync(source).size;
  if (size === 0) fail("文件大小为 0");

  const admin = await prisma.user.findFirst({
    where: { deletedAt: null, OR: [{ role: "ADMIN" }, { extraRoles: { some: { role: "ADMIN" } } }] },
    select: { id: true, name: true },
  });
  if (!admin) fail("数据库里没有管理员账号，无法记录上传人");

  const directory = path.join(root, "public", "uploads", "competitions", competition.id);
  mkdirSync(directory, { recursive: true });
  const fileName = safeFileName(source);
  const storedName = `${randomUUID()}-${fileName}`;
  const diskPath = path.join(directory, storedName);
  copyFileSync(source, diskPath);
  const filePath = `/uploads/competitions/${competition.id}/${storedName}`;
  const title = (args.title ?? fileName.replace(/\.[^.]+$/, "")).slice(0, 120);

  const existing = await prisma.competitionAttachment.findFirst({
    where: { competitionId: competition.id, kind: "VIDEO" },
    select: { id: true, filePath: true },
  });

  let attachment;
  if (existing) {
    const oldPath = path.join(root, "public", existing.filePath.replace(/^\//, ""));
    if (oldPath !== diskPath && existsSync(oldPath)) unlinkSync(oldPath);
    attachment = await prisma.competitionAttachment.update({
      where: { id: existing.id },
      data: { title, fileName, filePath, fileSize: size },
    });
    console.log(`[video] 已替换原有宣传片：${title}`);
  } else {
    const max = await prisma.competitionAttachment.aggregate({
      where: { competitionId: competition.id },
      _max: { sortOrder: true },
    });
    attachment = await prisma.competitionAttachment.create({
      data: {
        competitionId: competition.id,
        title,
        kind: "VIDEO",
        fileName,
        filePath,
        fileSize: size,
        uploadedBy: admin.id,
        sortOrder: (max._max.sortOrder ?? -1) + 1,
      },
    });
    console.log(`[video] 已上传：${title}`);
  }

  console.log(`[video] 赛事：${competition.name}`);
  console.log(`[video] 记录：${attachment.id}`);
  console.log(`[video] 路径：${filePath}（${(size / 1024 / 1024).toFixed(1)} MB，上传人记为 ${admin.name}）`);
  console.log("[video] 学生端赛事简介页刷新即可看到播放器");
}

try {
  if (args.list) {
    await listVideos();
  } else {
    const competition = await findCompetition(args.competition);
    if (args.remove) await removeVideo(competition);
    else await importVideo(competition);
  }
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
} finally {
  await prisma.$disconnect();
}

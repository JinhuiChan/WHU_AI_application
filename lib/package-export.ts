import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import JSZip from "jszip";
import { buildReviewWhere } from "@/lib/review";
import { prisma } from "@/lib/prisma";
import { resolveSealedFilePath } from "@/lib/sealed";
import type { ReviewFilters } from "@/types/review";

const maxProjects = 100;
const maxTotalBytes = 500 * 1024 * 1024;
const stageLabels = { SCHOOL: "校赛", PROVINCE: "省赛", NATIONAL: "国赛", FINISHED: "已结束" } as const;

export class PackageError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "PackageError";
  }
}

export type PackageEntry = {
  projectId: string;
  sealedFileId: string;
  entryName: string;
  diskPath: string;
  sizeBytes: number;
  uploadedAt: Date;
};

function safePart(value: string | null | undefined, fallback: string) {
  const normalized = (value ?? "").replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").trim();
  return (normalized || fallback).slice(0, 100);
}

function extensionFor(mimeType: string) {
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/jpeg") return ".jpg";
  return ".pdf";
}

export async function prepareSealedPackage(filters: Partial<ReviewFilters>) {
  const where = buildReviewWhere(filters);
  const projectCount = await prisma.project.count({ where });
  if (projectCount === 0) throw new PackageError(422, "当前筛选结果没有项目");
  if (projectCount > maxProjects) throw new PackageError(422, `当前筛选结果共 ${projectCount} 个项目，超过 100 项，请分批打包`);
  const projects = await prisma.project.findMany({
    where,
    select: {
      id: true,
      name: true,
      college: true,
      stage: true,
      competition: { select: { name: true } },
      owner: { select: { name: true } },
      teamMembers: {
        where: { role: "LEADER" },
        take: 1,
        select: { name: true },
      },
      sealedFiles: {
        where: { reviewResult: { not: "REJECTED" } },
        orderBy: { versionNo: "desc" },
        take: 1,
      },
    },
    orderBy: [{ competitionId: "asc" }, { college: "asc" }, { name: "asc" }],
  });

  const entries: PackageEntry[] = [];
  const usedNames = new Set<string>();
  let totalBytes = 0;
  let skippedProjects = 0;
  for (const project of projects) {
    const file = project.sealedFiles[0];
    if (!file) {
      skippedProjects += 1;
      continue;
    }
    const diskPath = resolveSealedFilePath(file.filePath);
    const fileStat = await stat(diskPath).catch(() => null);
    if (!fileStat?.isFile()) throw new PackageError(404, `项目「${project.name}」的第 ${file.versionNo} 版盖章件文件缺失`);
    totalBytes += fileStat.size;
    if (totalBytes > maxTotalBytes) throw new PackageError(422, "盖章件总大小超过 500MB，请分批打包");
    const baseName = [
      safePart(project.competition?.name, "未设置赛事"),
      stageLabels[project.stage],
      safePart(project.college, "未设置学院"),
      safePart(project.name, "未命名项目"),
      safePart(project.teamMembers[0]?.name ?? project.owner?.name, "未设置队长"),
      `第${file.versionNo}版`,
    ].join("_");
    const extension = extensionFor(file.mimeType);
    let entryName = `${baseName}${extension}`;
    let suffix = 2;
    while (usedNames.has(entryName.toLowerCase())) {
      entryName = `${baseName}_${suffix}${extension}`;
      suffix += 1;
    }
    usedNames.add(entryName.toLowerCase());
    entries.push({
      projectId: project.id,
      sealedFileId: file.id,
      entryName,
      diskPath,
      sizeBytes: fileStat.size,
      uploadedAt: file.uploadedAt,
    });
  }
  if (!entries.length) throw new PackageError(422, "当前筛选结果没有可打包的最终版盖章件");
  return { entries, projectCount, skippedProjects, totalBytes };
}

export function createPackageStream(entries: PackageEntry[]) {
  const zip = new JSZip();
  for (const entry of entries) {
    zip.file(entry.entryName, createReadStream(entry.diskPath), { binary: true, date: entry.uploadedAt });
  }
  const stream = zip.generateNodeStream({ type: "nodebuffer", streamFiles: true, compression: "STORE" });
  return Readable.toWeb(stream as Readable) as ReadableStream<Uint8Array>;
}

export function packageFileName(entries: PackageEntry[]) {
  const first = entries[0];
  return `盖章件_${path.parse(first.entryName).name.replace(/_第\d+版$/, "")}.zip`;
}

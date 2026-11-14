#!/usr/bin/env bash
# 用途：构建独立 release，并在确认后切换 current、重启服务和检查健康状态。
# 用法：在仓库根目录执行 bash scripts/deploy-server.sh（只构建，不切软链）。
#      执行 bash scripts/deploy-server.sh switch（切软链、重启、健康检查并打印回滚命令）。
# 前置条件：以 root 运行；kesai 用户存在；Node、npm、npx 在 /usr/local/bin；仓库公开可 clone。
set -Eeuo pipefail
umask 022

REPO=https://github.com/longjunwwk/WHU_AI_application.git
BRANCH=main
SHARED=/srv/kesai/shared
RELEASES=/srv/kesai/releases
CURRENT=/srv/kesai/current
STAMP=$(date +%Y%m%d-%H%M)
log() { printf '\n=== %s ===\n' "$*"; }

if [ "${1:-}" = "switch" ]; then
  TARGET=$(cat /root/kesai-last-release)
  log "切换 current -> $TARGET"
  test -f "$TARGET/.next/BUILD_ID" || { echo "!! 构建产物不完整"; exit 1; }
  ln -sfn "$TARGET" "$CURRENT"
  systemctl restart kesai
  sleep 4
  systemctl is-active kesai
  curl -s -o /dev/null -w "health=%{http_code}\n" http://127.0.0.1:3000/api/health
  echo "回滚: ln -sfn $(cat /root/kesai-prev-release) $CURRENT && systemctl restart kesai"
  exit 0
fi

test "$(id -u)" = 0 || { echo "必须以 root 运行"; exit 1; }

log "1. 备份"
mkdir -p /root/kesai-backups
tar czf "/root/kesai-backups/app-$STAMP.tgz" -C "$SHARED" app.env data
tar czf "/root/kesai-backups/data-$STAMP.tgz" -C "$SHARED" uploads imports 2>/dev/null || true
ls -lh /root/kesai-backups | tail -4

log "2. 解析远端提交"
SHA=$(git ls-remote "$REPO" "refs/heads/$BRANCH" | cut -f1)
test -n "$SHA" || { echo "!! 读不到远端 commit"; exit 1; }
SHORT=$(printf '%s' "$SHA" | cut -c1-7)
RELEASE="$RELEASES/$STAMP-$SHORT"
echo "commit=$SHA"
echo "release=$RELEASE"
test ! -e "$RELEASE" || { echo "!! $RELEASE 已存在"; exit 1; }

log "3. clone"
git clone --depth 1 --branch "$BRANCH" "$REPO" "$RELEASE"
rm -rf "$RELEASE/.git"

log "4. 数据软链（不覆盖 shared/app.env）"
mkdir -p "$SHARED/sealed" "$RELEASE/storage"
ln -sfn "$SHARED/app.env"     "$RELEASE/.env"
ln -sfn "$SHARED/data/app.db" "$RELEASE/prisma/dev.db"
ln -sfn "$SHARED/uploads"     "$RELEASE/public/uploads"
ln -sfn "$SHARED/imports"     "$RELEASE/storage/imports"
ln -sfn "$SHARED/sealed"      "$RELEASE/storage/sealed"
ls -l "$RELEASE/.env" "$RELEASE/prisma/dev.db" "$RELEASE/public/uploads" "$RELEASE/storage/sealed"

log "5. 历史盖章件迁到 shared/sealed"
if [ -d "$SHARED/uploads/sealed" ]; then
  find "$SHARED/uploads/sealed" -type f -exec mv -n {} "$SHARED/sealed/" \; 2>/dev/null || true
  rmdir "$SHARED/uploads/sealed" 2>/dev/null || true
fi
echo "shared/sealed 文件数: $(find "$SHARED/sealed" -type f | wc -l)"

log "6. 权限"
chown -R kesai:kesai "$RELEASE" "$SHARED/sealed"

log "7. npm ci"
cd "$RELEASE"
runuser -u kesai -- npm ci --no-audit --no-fund

log "8. prisma generate"
runuser -u kesai -- npx prisma generate

log "9. 基线登记"
runuser -u kesai -- npx prisma migrate status || true
runuser -u kesai -- npx prisma migrate resolve --applied 20261113000000_init || true
runuser -u kesai -- npx prisma migrate status || true

log "10. build"
runuser -u kesai -- npm run build

log "11. 记录"
printf '%s' "$RELEASE" > /root/kesai-last-release
readlink -f "$CURRENT" > /root/kesai-prev-release
echo "线上（未变）: $(cat /root/kesai-prev-release)"
echo "待切换:       $RELEASE"
echo
echo "全部成功。确认无误后执行:  bash /root/kesai-deploy.sh switch"

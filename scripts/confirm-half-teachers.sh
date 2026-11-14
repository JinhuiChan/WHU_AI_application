#!/usr/bin/env bash
# 用途：默认预览将确认的项目和教师行；--apply 备份并导出原状态后，确认一半存在未确认老师的项目。
# Dry-run（不写入）：
#   bash scripts/confirm-half-teachers.sh --db /srv/kesai/shared/data/app.db
# Apply（实际写入）：
#   bash scripts/confirm-half-teachers.sh --db /srv/kesai/shared/data/app.db --apply
# 验证：
#   sqlite3 /srv/kesai/shared/data/app.db "select confirmStatus, count(*) from Teacher group by confirmStatus;"
# 回滚（替换 <时间戳>，同一 CSV 可重复执行）：
#   sqlite3 -cmd ".bail on" \
#     -cmd "CREATE TEMP TABLE confirm_teacher_rollback(teacherId TEXT PRIMARY KEY, projectId TEXT, oldConfirmStatus TEXT, oldConfirmedAt TEXT);" \
#     -cmd ".mode csv" \
#     -cmd ".import --skip 1 /srv/kesai/backup/confirm-teachers-<时间戳>.csv confirm_teacher_rollback" \
#     /srv/kesai/shared/data/app.db \
#     "BEGIN IMMEDIATE; UPDATE Teacher SET confirmStatus=(SELECT r.oldConfirmStatus FROM confirm_teacher_rollback r WHERE r.teacherId=Teacher.id), confirmedAt=NULLIF((SELECT r.oldConfirmedAt FROM confirm_teacher_rollback r WHERE r.teacherId=Teacher.id), '') WHERE id IN (SELECT teacherId FROM confirm_teacher_rollback); COMMIT;"
set -Eeuo pipefail
umask 077

DB=""
APPLY=0
while [ "$#" -gt 0 ]; do
  case "$1" in
    --db)
      [ "$#" -ge 2 ] || { echo "--db 需要文件路径" >&2; exit 2; }
      DB=$2
      shift 2
      ;;
    --apply)
      APPLY=1
      shift
      ;;
    *)
      echo "未知参数：$1；用法见脚本头部" >&2
      exit 2
      ;;
  esac
done

[ -n "$DB" ] || { echo "必须指定 --db；用法见脚本头部" >&2; exit 2; }
[ -f "$DB" ] || { echo "数据库文件不存在：$DB" >&2; exit 1; }
command -v sqlite3 >/dev/null 2>&1 || { echo "未找到 sqlite3" >&2; exit 1; }

echo "现有 confirmStatus 取值（只读）："
sqlite3 -readonly "$DB" "SELECT DISTINCT confirmStatus FROM Teacher ORDER BY confirmStatus;"

if [ "$APPLY" -eq 0 ]; then
  sqlite3 -readonly "$DB" <<'SQL'
.bail on
.headers on
.mode column
CREATE TEMP TABLE selected_projects AS
SELECT projectId
FROM Teacher
WHERE confirmStatus <> 'CONFIRMED'
GROUP BY projectId
ORDER BY projectId ASC
LIMIT (SELECT CAST((COUNT(DISTINCT projectId) + 1) / 2 AS INTEGER) FROM Teacher WHERE confirmStatus <> 'CONFIRMED');
SELECT projectId AS "将改动项目" FROM selected_projects ORDER BY projectId ASC;
SELECT
  (SELECT COUNT(*) FROM selected_projects) AS projectCount,
  (SELECT COUNT(*) FROM Teacher WHERE projectId IN (SELECT projectId FROM selected_projects) AND confirmStatus <> 'CONFIRMED') AS teacherRowCount;
SELECT id AS teacherId, projectId, confirmStatus AS oldConfirmStatus, confirmedAt AS oldConfirmedAt
FROM Teacher
WHERE projectId IN (SELECT projectId FROM selected_projects) AND confirmStatus <> 'CONFIRMED'
ORDER BY projectId ASC, id ASC;
SQL
  echo "dry-run 完成，未写入任何数据。"
  exit 0
fi

STAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR=/srv/kesai/backup
DB_BACKUP="$BACKUP_DIR/app-before-confirm-$STAMP.db"
CSV_BACKUP="$BACKUP_DIR/confirm-teachers-$STAMP.csv"
mkdir -p "$BACKUP_DIR"
cp -- "$DB" "$DB_BACKUP"
SOURCE_SIZE=$(stat -c %s -- "$DB")
BACKUP_SIZE=$(stat -c %s -- "$DB_BACKUP")
[ "$SOURCE_SIZE" = "$BACKUP_SIZE" ] || { echo "备份大小不一致，已中止：$DB_BACKUP" >&2; exit 1; }
echo "数据库备份已校验：$DB_BACKUP"
echo "原始状态 CSV：$CSV_BACKUP"

sqlite3 "$DB" <<SQL
.bail on
PRAGMA foreign_keys=ON;
BEGIN IMMEDIATE;
CREATE TEMP TABLE selected_projects AS
SELECT projectId
FROM Teacher
WHERE confirmStatus <> 'CONFIRMED'
GROUP BY projectId
ORDER BY projectId ASC
LIMIT (SELECT CAST((COUNT(DISTINCT projectId) + 1) / 2 AS INTEGER) FROM Teacher WHERE confirmStatus <> 'CONFIRMED');
.headers on
.mode csv
.once $CSV_BACKUP
SELECT id AS teacherId, projectId, confirmStatus AS oldConfirmStatus, confirmedAt AS oldConfirmedAt
FROM Teacher
WHERE projectId IN (SELECT projectId FROM selected_projects) AND confirmStatus <> 'CONFIRMED'
ORDER BY projectId ASC, id ASC;
UPDATE Teacher
SET confirmStatus = 'CONFIRMED',
    confirmedAt = COALESCE(confirmedAt, CAST(strftime('%s', 'now') AS INTEGER) * 1000)
WHERE projectId IN (SELECT projectId FROM selected_projects)
  AND confirmStatus <> 'CONFIRMED';
.headers off
.mode list
SELECT '已更新教师行数：' || changes();
COMMIT;
SQL

echo "完成。数据库备份：$DB_BACKUP"
echo "完成。回滚 CSV：$CSV_BACKUP"

import { QuestionCircleOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { App as AntApp, Button, Checkbox, Segmented, Tooltip, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { AutoScheduleModal } from '../components/timetable/AutoScheduleModal';
import { CandidatePanel } from '../components/timetable/CandidatePanel';
import { SolutionDrawer } from '../components/timetable/SolutionDrawer';
import { TimetableGrid } from '../components/timetable/TimetableGrid';
import { useFavorites } from '../hooks/useFavorites';
import { useCourseDetailMap } from '../hooks/useCourseDetailMap';
import { request } from '../lib/api';
import {
  generateSchedules,
  type GenerateResult,
  type SchedulePrefs,
} from '../lib/autoSchedule';
import {
  readTimetableSelections,
  writeTimetableSelections,
} from '../lib/storage';
import {
  HOUR_START,
  blocksOverlap,
  blockKey,
  hoursOf,
  latestEndMinute,
  semesterOf,
  subclassBlocks,
  uniqueBlocks,
  type CoverageCell,
  type PreviewInfo,
  type SelectedBlockInfo,
  type SelectionEntry,
  type TimeBlock,
} from '../lib/timetable';
import type { CourseDetail, CourseDetailResponse } from '../types/course';

/** 我的课表:按学期的一周排课工具,含时间冲突提示与时间覆盖热力。 */
export default function TimetablePage() {
  const { favorites, toggle } = useFavorites();
  const { details, loading } = useCourseDetailMap(favorites);
  const { message } = AntApp.useApp();

  const [selections, setSelections] = useState<SelectionEntry[]>(() =>
    readTimetableSelections(),
  );
  const [semester, setSemester] = useState<1 | 2>(1);
  const [hoverCourse, setHoverCourse] = useState<string | null>(null);
  const [hoverSub, setHoverSub] = useState<{ courseCode: string; subclassId: number } | null>(
    null,
  );
  const [coverageOn, setCoverageOn] = useState(false);

  // ---- 自动排课状态 ----
  const [autoModalOpen, setAutoModalOpen] = useState(false);
  const [autoResult, setAutoResult] = useState<GenerateResult | null>(null);
  const [autoSemester, setAutoSemester] = useState<1 | 2>(1);
  const [autoPrefs, setAutoPrefs] = useState<SchedulePrefs>({
    avoidEarlyNine: true,
    concentrate: true,
    lunchBreak: true,
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hoveredSolution, setHoveredSolution] = useState<number | null>(null);
  const [lockedSolution, setLockedSolution] = useState<number | null>(null);
  /** 自动排课搜索添加的非备选课程详情(补全详情用) */
  const [extraDetails, setExtraDetails] = useState<Map<string, CourseDetail>>(new Map());

  useEffect(() => {
    writeTimetableSelections(selections);
  }, [selections]);

  // 清理悬空选择:课程已移出备选、或分班已不存在时自动删除
  useEffect(() => {
    setSelections((previous) => {
      const next = previous.filter((entry) => {
        if (!favorites.includes(entry.courseCode)) return false;
        const detail = details.get(entry.courseCode);
        if (!detail) return true; // 详情尚未加载,先保留
        return detail.subclasses.some((subclass) => subclass.id === entry.subclassId);
      });
      return next.length === previous.length ? previous : next;
    });
  }, [favorites, details]);

  /** courseCode -> 已排 subclassId(不分学期) */
  const selectionByCourse = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of selections) map.set(entry.courseCode, entry.subclassId);
    return map;
  }, [selections]);

  /** 已排且属于当前学期的条目(时间表与冲突判断都按学期隔离) */
  const currentSemSelected = useMemo(
    () =>
      selections.flatMap((entry) => {
        const detail = details.get(entry.courseCode);
        const subclass = detail?.subclasses.find((item) => item.id === entry.subclassId);
        if (!detail || !subclass || semesterOf(subclass) !== semester) return [];
        return [{ courseCode: entry.courseCode, detail, subclass }];
      }),
    [selections, details, semester],
  );

  /** 时间表渲染的已排块 */
  const selectedInfos: SelectedBlockInfo[] = useMemo(
    () =>
      currentSemSelected.map(({ courseCode, detail, subclass }) => ({
        courseCode,
        courseTitle: detail.title,
        section: subclass.section ?? String(subclass.id),
        blocks: subclassBlocks(subclass),
      })),
    [currentSemSelected],
  );

  /** 当前学期已排时段(冲突判断用) */
  const selectedBlockList = useMemo(
    () =>
      currentSemSelected.map(({ courseCode, subclass }) => ({
        code: courseCode,
        blocks: subclassBlocks(subclass),
      })),
    [currentSemSelected],
  );

  /**
   * 悬停预览:整门课(本学期分班并集)或单个分班;
   * 红色 = 与当前学期其他课程已排时段冲突。
   * 覆盖模式勾选时,悬停依然生效(此时覆盖着色隐藏,见 coverage 计算)。
   */
  const preview: PreviewInfo | null = useMemo(() => {
    let courseCode: string | null = null;
    let targetBlocks: TimeBlock[] = [];
    if (hoverSub) {
      courseCode = hoverSub.courseCode;
      const subclass = details
        .get(courseCode)
        ?.subclasses.find((item) => item.id === hoverSub.subclassId);
      targetBlocks = subclass ? subclassBlocks(subclass) : [];
    } else if (hoverCourse) {
      courseCode = hoverCourse;
      const detail = details.get(courseCode);
      targetBlocks = detail
        ? uniqueBlocks(
            detail.subclasses
              .filter((subclass) => semesterOf(subclass) === semester)
              .flatMap((subclass) => subclassBlocks(subclass)),
          )
        : [];
    }
    if (!courseCode || targetBlocks.length === 0) return null;

    const otherBlocks = selectedBlockList
      .filter((item) => item.code !== courseCode)
      .flatMap((item) => item.blocks);
    const conflicts = new Set(
      targetBlocks
        .filter((block) => otherBlocks.some((other) => blocksOverlap(block, other)))
        .map(blockKey),
    );
    return { blocks: targetBlocks, conflicts };
  }, [hoverSub, hoverCourse, details, selectedBlockList, semester]);

  /**
   * 时间覆盖:每个 (day, hour) 小时格有多少门备选课(不含任何已排课程,
   * 只统计本学期分班)可上。悬停预览激活时返回 null(隐藏覆盖着色)。
   */
  const coverage: Map<string, CoverageCell> | null = useMemo(() => {
    if (!coverageOn || preview) return null;
    const selectedCodes = new Set(selections.map((entry) => entry.courseCode));
    const map = new Map<string, CoverageCell>();

    for (const detail of details.values()) {
      if (selectedCodes.has(detail.code)) continue;
      const cellMap = new Map<string, string[]>();
      for (const subclass of detail.subclasses) {
        if (semesterOf(subclass) !== semester) continue;
        const sectionLabel = subclass.section ?? String(subclass.id);
        for (const block of subclassBlocks(subclass)) {
          for (const hour of hoursOf(block)) {
            const key = `${block.day}-${hour}`;
            const sections = cellMap.get(key) ?? [];
            if (!sections.includes(sectionLabel)) sections.push(sectionLabel);
            cellMap.set(key, sections);
          }
        }
      }
      for (const [key, sections] of cellMap) {
        const cell = map.get(key) ?? { count: 0, courses: [] };
        cell.courses.push({ code: detail.code, title: detail.title, sections });
        cell.count += 1;
        map.set(key, cell);
      }
    }
    return map;
  }, [coverageOn, preview, details, selections, semester]);

  /** 备选列表:只显示在当前学期开课的课程 */
  const candidates = useMemo(
    () =>
      favorites
        .map((code) => details.get(code))
        .filter((detail): detail is NonNullable<typeof detail> => Boolean(detail))
        .filter((detail) => detail.subclasses.some((s) => semesterOf(s) === semester)),
    [favorites, details, semester],
  );

  const hourEnd = useMemo(
    () => Math.max(19, Math.ceil(latestEndMinute(details) / 60)),
    [details],
  );

  // ---- 自动排课 ----

  /** 收藏详情 + 自动排课补充拉取的详情 */
  const allDetails = useMemo(() => {
    const merged = new Map(details);
    for (const [code, detail] of extraDetails) {
      if (!merged.has(code)) merged.set(code, detail);
    }
    return merged;
  }, [details, extraDetails]);

  /** 悬停优先,其次锁定;命中时整表切换为方案预览 */
  const displayedSolutionIndex = hoveredSolution ?? lockedSolution;
  const solutionPreview: SelectedBlockInfo[] | null = useMemo(() => {
    if (!autoResult || displayedSolutionIndex === null) return null;
    const solution = autoResult.solutions[displayedSolutionIndex];
    if (!solution) return null;
    return solution.entries.flatMap((entry) => {
      const detail = allDetails.get(entry.courseCode);
      const subclass = detail?.subclasses.find((item) => item.id === entry.subclassId);
      if (!detail || !subclass) return [];
      return [
        {
          courseCode: detail.code,
          courseTitle: detail.title,
          section: subclass.section ?? String(subclass.id),
          blocks: subclassBlocks(subclass),
        },
      ];
    });
  }, [autoResult, displayedSolutionIndex, allDetails]);

  const closeAutoFlow = () => {
    setDrawerOpen(false);
    setAutoResult(null);
    setHoveredSolution(null);
    setLockedSolution(null);
  };

  const runAutoSchedule = async (codes: string[], sem: 1 | 2, prefs: SchedulePrefs) => {
    setAutoModalOpen(false);
    setAutoSemester(sem);
    setAutoPrefs(prefs);

    // 补拉不在收藏详情里的课程(搜索添加的课程)
    const base = new Map(details);
    for (const [code, detail] of extraDetails) {
      if (!base.has(code)) base.set(code, detail);
    }
    const missing = codes.filter((code) => !base.has(code));
    if (missing.length > 0) {
      try {
        await Promise.all(
          missing.map((code) =>
            request<CourseDetailResponse>(`/api/courses/${encodeURIComponent(code)}`).then(
              (data) => base.set(code, data.course),
            ),
          ),
        );
      } catch {
        // 单个课程拉取失败则跳过该课程
      }
    }
    setExtraDetails(new Map(base));

    const courseList = codes
      .map((code) => base.get(code))
      .filter((detail): detail is CourseDetail => Boolean(detail));
    const result = generateSchedules(courseList, sem, prefs);
    setAutoResult(result);
    setHoveredSolution(null);
    setLockedSolution(null);
    setDrawerOpen(true);

    if (result.solutions.length === 0) {
      const reason =
        result.emptyCourses.length > 0
          ? `${result.emptyCourses.join('、')} 在 Sem ${sem} 没有分班,无法参与排课`
          : '所选课程的分班时间存在不可避免的冲突,无法共存';
      void message.warning(`没有可行的排课方案:${reason}`);
    }
  };

  const applySolution = (index: number) => {
    const solution = autoResult?.solutions[index];
    if (!solution) return;
    const solutionCodes = solution.entries.map((entry) => entry.courseCode);

    setSelections((previous) => {
      const kept = previous.filter((entry) => {
        if (solutionCodes.includes(entry.courseCode)) return false;
        const subclass = allDetails
          .get(entry.courseCode)
          ?.subclasses.find((item) => item.id === entry.subclassId);
        return !(subclass && semesterOf(subclass) === autoSemester);
      });
      return [
        ...kept,
        ...solution.entries.map((entry) => ({
          courseCode: entry.courseCode,
          subclassId: entry.subclassId,
        })),
      ];
    });
    // 排进课表的课程自动加入备选(收藏),保证课表数据完整
    for (const code of solutionCodes) {
      if (!favorites.includes(code)) toggle(code);
    }
    void message.success(`已应用方案 ${index + 1}(${solutionCodes.length} 门课)`);
    closeAutoFlow();
  };

  const favoriteDetails = useMemo(
    () =>
      favorites
        .map((code) => details.get(code))
        .filter((detail): detail is CourseDetail => Boolean(detail)),
    [favorites, details],
  );

  const selectSubclass = (courseCode: string, subclassId: number) => {
    const detail = details.get(courseCode);
    const subclass = detail?.subclasses.find((item) => item.id === subclassId);
    if (!detail || !subclass) return;

    const current = selectionByCourse.get(courseCode);
    const blocks = subclassBlocks(subclass);
    const conflict = selectedBlockList
      .filter((item) => item.code !== courseCode)
      .some((item) => item.blocks.some((block) => blocks.some((b) => blocksOverlap(b, block))));

    setSelections((previous) => [
      ...previous.filter((entry) => entry.courseCode !== courseCode),
      { courseCode, subclassId },
    ]);
    if (conflict) {
      void message.warning(
        `注意:${courseCode}(${subclass.section ?? '—'})与课表中其他课程时间冲突`,
      );
    } else if (current !== undefined && current !== subclassId) {
      void message.success(`已更换 ${courseCode} 的分班为 ${subclass.section ?? subclassId}`);
    } else {
      void message.success(`已将 ${courseCode}(${subclass.section ?? '—'})加入课表`);
    }
  };

  const removeFromTimetable = (courseCode: string) => {
    setSelections((previous) => previous.filter((entry) => entry.courseCode !== courseCode));
    void message.success(`已将 ${courseCode} 移出课表`);
  };

  const clearTimetable = () => {
    setSelections([]);
    void message.success('已清空课表');
  };

  return (
    <div className="tt-page">
      <div className="tt-main">
        <div className="tt-toolbar">
          <Typography.Title level={3} className="page-title" style={{ marginBottom: 0 }}>
            我的课表
          </Typography.Title>
          <div className="tt-toolbar__right">
            <Segmented
              value={semester}
              onChange={(value) => setSemester(value as 1 | 2)}
              options={[
                { label: 'Sem 1', value: 1 },
                { label: 'Sem 2', value: 2 },
              ]}
            />
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              onClick={() => setAutoModalOpen(true)}
            >
              自动排课
            </Button>
            <Checkbox
              checked={coverageOn}
              onChange={(event) => setCoverageOn(event.target.checked)}
            >
              时间覆盖
            </Checkbox>
            <Tooltip title="开启后按小时显示所有备选课(不含已排课程,仅当前学期)的可上课覆盖:颜色越深代表该时段可选课程越多,数字为课程数,悬停数字查看课程与分班明细;悬停备选课时临时显示该课时段">
              <QuestionCircleOutlined className="tt-toolbar__tip" />
            </Tooltip>
            <Button danger disabled={selections.length === 0} onClick={clearTimetable}>
              清空课表
            </Button>
          </div>
        </div>

        <TimetableGrid
          hourStart={HOUR_START}
          hourEnd={hourEnd}
          selected={solutionPreview ? [] : selectedInfos}
          preview={solutionPreview ? null : preview}
          coverage={solutionPreview ? null : coverage}
          solutionPreview={solutionPreview}
          onRemoveCourse={removeFromTimetable}
        />

        <div className="tt-legend">
          <span className="tt-legend__item">
            <span className="tt-legend__chip is-green" /> 悬停时可选时段
          </span>
          <span className="tt-legend__item">
            <span className="tt-legend__chip is-red" /> 与已排课程冲突
          </span>
          <span className="tt-legend__item">
            <span className="tt-legend__chip is-selected" /> 已排入课表(悬停色块右上角 × 可移除)
          </span>
          {coverageOn && !solutionPreview && (
            <span className="tt-legend__item">
              <span className="tt-legend__chip is-coverage" /> 覆盖模式:颜色越深可选课程越多
            </span>
          )}
          {solutionPreview && (
            <span className="tt-legend__item">
              <span className="tt-legend__chip is-ghost" /> 自动排课方案预览(在右侧方案列表中悬停/锁定)
            </span>
          )}
        </div>
      </div>

      <CandidatePanel
        candidates={candidates}
        loading={loading}
        selectionByCourse={selectionByCourse}
        selectedBlockList={selectedBlockList}
        semester={semester}
        hoverCourse={hoverCourse}
        onHoverCourse={setHoverCourse}
        onHoverSubclass={setHoverSub}
        onSelectSubclass={selectSubclass}
      />

      <AutoScheduleModal
        open={autoModalOpen}
        onClose={() => setAutoModalOpen(false)}
        defaultSemester={semester}
        candidateDetails={favoriteDetails}
        onRun={(codes, sem, prefs) => {
          void runAutoSchedule(codes, sem, prefs);
        }}
      />

      {autoResult && (
        <SolutionDrawer
          open={drawerOpen}
          onClose={closeAutoFlow}
          result={autoResult}
          prefs={autoPrefs}
          hovered={hoveredSolution}
          locked={lockedSolution}
          onHover={setHoveredSolution}
          onLock={(index) => setLockedSolution((previous) => (previous === index ? previous : index))}
          onApply={applySolution}
        />
      )}
    </div>
  );
}

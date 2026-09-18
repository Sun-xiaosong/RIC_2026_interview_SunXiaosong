package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"sort"
	"strconv"
	"strings"
)

// ---- 响应辅助 ----

func writeJSONStatus(response http.ResponseWriter, status int, value any) {
	response.Header().Set("Content-Type", "application/json; charset=utf-8")
	response.WriteHeader(status)
	if err := json.NewEncoder(response).Encode(value); err != nil {
		log.Printf("write response: %v", err)
	}
}

func writeJSON(response http.ResponseWriter, value any) {
	writeJSONStatus(response, http.StatusOK, value)
}

func writeError(response http.ResponseWriter, status int, message string) {
	writeJSONStatus(response, status, errorResponse{Error: message})
}

func requireGet(response http.ResponseWriter, request *http.Request) bool {
	if request.Method != http.MethodGet {
		writeError(response, http.StatusMethodNotAllowed, "method not allowed")
		return false
	}
	return true
}

// ---- 搜索排序 ----

// matchTier 计算课程代码与搜索词的匹配档位:
// 0 代码精确匹配 > 1 代码前缀匹配 > 2 代码包含匹配 > -1 不匹配。
// 只匹配课程代码(8 位:4 个字母 + 4 个数字,如 COMP3314),标题不参与搜索;
// 代码包含关键词即命中(不区分大小写),因此搜字母(COMP)、数字(3314)、
// 片段(ct、na23)都能找到对应课程。
// 在 Go 内存中做(而非 SQL LIKE):规避 LIKE 的 %/_ 通配符转义问题,且大小写行为可控。
func matchTier(query, code string) int {
	if strings.EqualFold(code, query) {
		return 0
	}
	q := strings.ToLower(query)
	lowerCode := strings.ToLower(code)
	if strings.HasPrefix(lowerCode, q) {
		return 1
	}
	if strings.Contains(lowerCode, q) {
		return 2
	}
	return -1
}

// ---- /api/health ----

func healthHandler(db *sql.DB) http.HandlerFunc {
	return func(response http.ResponseWriter, request *http.Request) {
		if !requireGet(response, request) {
			return
		}

		var courses, reviews, subclasses int
		err := db.QueryRow(`
			SELECT
				(SELECT COUNT(*) FROM courses),
				(SELECT COUNT(*) FROM reviews),
				(SELECT COUNT(*) FROM subclasses)
		`).Scan(&courses, &reviews, &subclasses)
		if err != nil {
			writeError(response, http.StatusInternalServerError, "database unavailable")
			return
		}

		writeJSON(response, map[string]any{
			"status": "ok",
			"database": map[string]int{
				"courses": courses, "reviews": reviews, "subclasses": subclasses,
			},
		})
	}
}

// ---- /api/courses 列表与搜索 ----

// fetchCourseSummaries 查询全部课程摘要(评价数为 reviews 表真实条数),
// dept 为空串时不过滤院系。结果按课程代码排序。
func fetchCourseSummaries(db *sql.DB, dept string) ([]courseSummary, error) {
	rows, err := db.Query(`
		SELECT
			courses.code,
			courses.title,
			courses.offer_dept,
			COUNT(reviews.id),
			courses.liked_count,
			courses.disliked_count
		FROM courses
		LEFT JOIN reviews ON reviews.course_code = courses.code
		WHERE (? = '' OR courses.offer_dept = ?)
		GROUP BY courses.code
		ORDER BY courses.code ASC
	`, dept, dept)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	courses := make([]courseSummary, 0, 10)
	for rows.Next() {
		var item courseSummary
		if err := rows.Scan(
			&item.Code, &item.Title, &item.OfferDept, &item.ReviewedCount,
			&item.LikedCount, &item.DislikedCount,
		); err != nil {
			return nil, err
		}
		courses = append(courses, item)
	}
	return courses, rows.Err()
}

func coursesHandler(db *sql.DB) http.HandlerFunc {
	return func(response http.ResponseWriter, request *http.Request) {
		if !requireGet(response, request) {
			return
		}

		query := strings.TrimSpace(request.URL.Query().Get("q"))
		dept := request.URL.Query().Get("dept")

		courses, err := fetchCourseSummaries(db, dept)
		if err != nil {
			writeError(response, http.StatusInternalServerError, "database query failed")
			return
		}

		if query != "" {
			matched := make([]courseSummary, 0, len(courses))
			for _, item := range courses {
				if matchTier(query, item.Code) >= 0 {
					matched = append(matched, item)
				}
			}
			sort.SliceStable(matched, func(i, j int) bool {
				ti := matchTier(query, matched[i].Code)
				tj := matchTier(query, matched[j].Code)
				if ti != tj {
					return ti < tj
				}
				return matched[i].Code < matched[j].Code
			})
			courses = matched
		}

		writeJSON(response, map[string]any{"courses": courses})
	}
}

// ---- /api/departments 院系选项 ----

func departmentsHandler(db *sql.DB) http.HandlerFunc {
	return func(response http.ResponseWriter, request *http.Request) {
		if !requireGet(response, request) {
			return
		}

		rows, err := db.Query(`
			SELECT offer_dept, COUNT(*)
			FROM courses
			WHERE offer_dept IS NOT NULL
			GROUP BY offer_dept
			ORDER BY offer_dept ASC
		`)
		if err != nil {
			writeError(response, http.StatusInternalServerError, "database query failed")
			return
		}
		defer rows.Close()

		departments := make([]departmentItem, 0, 5)
		for rows.Next() {
			var item departmentItem
			if err := rows.Scan(&item.Name, &item.CourseCount); err != nil {
				writeError(response, http.StatusInternalServerError, "database result failed")
				return
			}
			departments = append(departments, item)
		}
		if err := rows.Err(); err != nil {
			writeError(response, http.StatusInternalServerError, "database result failed")
			return
		}

		writeJSON(response, map[string]any{"departments": departments})
	}
}

// ---- /api/courses/ 子树:课程详情与评价 ----

// courseTreeHandler 手动解析 /api/courses/{code} 与 /api/courses/{code}/reviews。
// go.mod 为 1.21,标准库 ServeMux 尚不支持 {code} 通配符,故在此分派。
func courseTreeHandler(db *sql.DB) http.HandlerFunc {
	return func(response http.ResponseWriter, request *http.Request) {
		segments := strings.Split(strings.Trim(request.URL.Path, "/"), "/")
		if len(segments) < 2 || segments[0] != "api" || segments[1] != "courses" {
			writeError(response, http.StatusNotFound, "not found")
			return
		}

		rest := segments[2:]
		switch {
		case len(rest) == 0:
			coursesHandler(db)(response, request)
		case len(rest) == 1:
			courseDetailHandler(db, strings.ToUpper(rest[0]))(response, request)
		case len(rest) == 2 && rest[1] == "reviews":
			courseReviewsHandler(db, strings.ToUpper(rest[0]))(response, request)
		default:
			writeError(response, http.StatusNotFound, "not found")
		}
	}
}

// courseExists 用于详情/评价端点判断课程是否存在(不存在统一 404)。
func courseExists(db *sql.DB, code string) (bool, error) {
	var one int
	err := db.QueryRow("SELECT 1 FROM courses WHERE code = ?", code).Scan(&one)
	if err == sql.ErrNoRows {
		return false, nil
	}
	return err == nil, err
}

func courseDetailHandler(db *sql.DB, code string) http.HandlerFunc {
	return func(response http.ResponseWriter, request *http.Request) {
		if !requireGet(response, request) {
			return
		}

		exists, err := courseExists(db, code)
		if err != nil {
			writeError(response, http.StatusInternalServerError, "database query failed")
			return
		}
		if !exists {
			writeError(response, http.StatusNotFound, "course not found")
			return
		}

		var detail courseDetail
		detail.Code = code
		var requirement, description string
		var aPlus, aGrade, aMinus, bPlus, bGrade, bMinus int
		var cPlus, cGrade, cMinus, dPlus, dGrade, dMinus int
		var passCount, failCount int
		var tutorialYes, tutorialNo, essayYes, essayNo, finalYes, finalNo int
		var presentationYes, presentationNo, projectYes, projectNo, attendanceYes, attendanceNo int
		err = db.QueryRow(`
			SELECT
				title, offer_dept, requirement, description,
				liked_count, disliked_count,
				a_plus, a, a_minus, b_plus, b, b_minus,
				c_plus, c, c_minus, d_plus, d, d_minus, pass, fail,
				tutorial_yes_count, tutorial_no_count,
				essay_yes_count, essay_no_count,
				final_yes_count, final_no_count,
				presentation_yes_count, presentation_no_count,
				project_yes_count, project_no_count,
				attendance_yes_count, attendance_no_count,
				(SELECT COUNT(*) FROM reviews WHERE course_code = courses.code)
			FROM courses
			WHERE code = ?
		`, code).Scan(
			&detail.Title, &detail.OfferDept, &requirement, &description,
			&detail.LikedCount, &detail.DislikedCount,
			&aPlus, &aGrade, &aMinus, &bPlus, &bGrade, &bMinus,
			&cPlus, &cGrade, &cMinus, &dPlus, &dGrade, &dMinus, &passCount, &failCount,
			&tutorialYes, &tutorialNo, &essayYes, &essayNo, &finalYes, &finalNo,
			&presentationYes, &presentationNo, &projectYes, &projectNo,
			&attendanceYes, &attendanceNo,
			&detail.ReviewedCount,
		)
		if err != nil {
			writeError(response, http.StatusInternalServerError, "database query failed")
			return
		}
		if requirement != "" {
			detail.Requirement = &requirement
		}
		if description != "" {
			detail.Description = &description
		}
		detail.GradeDistribution = map[string]int{
			"a_plus": aPlus, "a": aGrade, "a_minus": aMinus,
			"b_plus": bPlus, "b": bGrade, "b_minus": bMinus,
			"c_plus": cPlus, "c": cGrade, "c_minus": cMinus,
			"d_plus": dPlus, "d": dGrade, "d_minus": dMinus,
			"pass": passCount, "fail": failCount,
		}
		detail.FeatureVotes = map[string]vote{
			"tutorial":     {Yes: tutorialYes, No: tutorialNo},
			"essay":        {Yes: essayYes, No: essayNo},
			"final":        {Yes: finalYes, No: finalNo},
			"presentation": {Yes: presentationYes, No: presentationNo},
			"project":      {Yes: projectYes, No: projectNo},
			"attendance":   {Yes: attendanceYes, No: attendanceNo},
		}

		subclassRows, err := db.Query(`
			SELECT id, semester, section, instructor, slots, is_active
			FROM subclasses
			WHERE course_code = ?
			ORDER BY id ASC
		`, code)
		if err != nil {
			writeError(response, http.StatusInternalServerError, "database query failed")
			return
		}
		defer subclassRows.Close()

		detail.Subclasses = make([]subclassView, 0, 4)
		for subclassRows.Next() {
			var item subclassView
			var slots string
			var isActive int
			if err := subclassRows.Scan(
				&item.ID, &item.Semester, &item.Section, &item.Instructor, &slots, &isActive,
			); err != nil {
				writeError(response, http.StatusInternalServerError, "database result failed")
				return
			}
			item.Slots = parseSlots(slots)
			item.IsActive = isActive != 0
			detail.Subclasses = append(detail.Subclasses, item)
		}
		if err := subclassRows.Err(); err != nil {
			writeError(response, http.StatusInternalServerError, "database result failed")
			return
		}

		writeJSON(response, map[string]any{"course": detail})
	}
}

func courseReviewsHandler(db *sql.DB, code string) http.HandlerFunc {
	return func(response http.ResponseWriter, request *http.Request) {
		if !requireGet(response, request) {
			return
		}

		exists, err := courseExists(db, code)
		if err != nil {
			writeError(response, http.StatusInternalServerError, "database query failed")
			return
		}
		if !exists {
			writeError(response, http.StatusNotFound, "course not found")
			return
		}

		page, pageSize := 1, 5
		if parsed, err := strconv.Atoi(request.URL.Query().Get("page")); err == nil && parsed > 0 {
			page = parsed
		}
		if parsed, err := strconv.Atoi(request.URL.Query().Get("pageSize")); err == nil {
			pageSize = parsed
		}
		if pageSize < 1 {
			pageSize = 1
		}
		if pageSize > 50 {
			pageSize = 50
		}

		sortMode := request.URL.Query().Get("sort")
		if sortMode == "" {
			sortMode = "latest"
		}
		if sortMode != "latest" && sortMode != "hot" {
			writeError(response, http.StatusBadRequest, "sort must be latest or hot")
			return
		}

		orderClause := "created_at DESC, id DESC"
		if sortMode == "hot" {
			// created_at 全库为统一格式的时间戳字符串,字典序即时间序。
			orderClause = "(liked_count - disliked_count) DESC, created_at DESC, id DESC"
		}

		var total int
		if err := db.QueryRow(
			"SELECT COUNT(*) FROM reviews WHERE course_code = ?", code,
		).Scan(&total); err != nil {
			writeError(response, http.StatusInternalServerError, "database query failed")
			return
		}

		offset := (page - 1) * pageSize
		rows, err := db.Query(`
			SELECT id, year_taken, sem_taken, instructor, content,
				liked_count, disliked_count, user_id, course_code, created_at, updated_at
			FROM reviews
			WHERE course_code = ?
			ORDER BY `+orderClause+`
			LIMIT ? OFFSET ?
		`, code, pageSize, offset)
		if err != nil {
			writeError(response, http.StatusInternalServerError, "database query failed")
			return
		}
		defer rows.Close()

		reviews := make([]reviewItem, 0, pageSize)
		for rows.Next() {
			var item reviewItem
			if err := rows.Scan(
				&item.ID, &item.YearTaken, &item.SemTaken, &item.Instructor, &item.Content,
				&item.LikedCount, &item.DislikedCount, &item.UserID, &item.CourseCode,
				&item.CreatedAt, &item.UpdatedAt,
			); err != nil {
				writeError(response, http.StatusInternalServerError, "database result failed")
				return
			}
			reviews = append(reviews, item)
		}
		if err := rows.Err(); err != nil {
			writeError(response, http.StatusInternalServerError, "database result failed")
			return
		}

		writeJSON(response, map[string]any{
			"reviews":  reviews,
			"total":    total,
			"page":     page,
			"pageSize": pageSize,
		})
	}
}

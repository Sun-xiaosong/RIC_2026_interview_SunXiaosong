package main

import (
	"encoding/json"
	"log"
)

// ---- API 响应结构(字段统一 camelCase,与前端 TS 类型一一对应)----

type courseSummary struct {
	Code          string  `json:"code"`
	Title         string  `json:"title"`
	OfferDept     *string `json:"offerDept"`
	ReviewedCount int     `json:"reviewedCount"`
	LikedCount    int     `json:"likedCount"`
	DislikedCount int     `json:"dislikedCount"`
}

type vote struct {
	Yes int `json:"yes"`
	No  int `json:"no"`
}

// slotRaw 用于解析数据库中 slots 列存的原始 JSON(键为 snake_case)
type slotRaw struct {
	Day        int    `json:"day"`
	Venue      string `json:"venue"`
	StartTime  string `json:"start_time"`
	EndTime    string `json:"end_time"`
	StartDate  string `json:"start_date"`
	EndDate    string `json:"end_date"`
	IsTutorial bool   `json:"is_tutorial"`
}

// slotView 是对外输出的上课时间条目(键为 camelCase)
type slotView struct {
	Day        int    `json:"day"`
	Venue      string `json:"venue"`
	StartTime  string `json:"startTime"`
	EndTime    string `json:"endTime"`
	StartDate  string `json:"startDate"`
	EndDate    string `json:"endDate"`
	IsTutorial bool   `json:"isTutorial"`
}

type subclassView struct {
	ID         int        `json:"id"`
	Semester   *string    `json:"semester"`
	Section    *string    `json:"section"`
	Instructor *string    `json:"instructor"`
	Slots      []slotView `json:"slots"`
	IsActive   bool       `json:"isActive"`
}

type courseDetail struct {
	Code             string             `json:"code"`
	Title            string             `json:"title"`
	OfferDept        *string            `json:"offerDept"`
	Requirement      *string            `json:"requirement"`
	Description      *string            `json:"description"`
	LikedCount       int                `json:"likedCount"`
	DislikedCount    int                `json:"dislikedCount"`
	ReviewedCount    int                `json:"reviewedCount"`
	GradeDistribution map[string]int    `json:"gradeDistribution"`
	FeatureVotes     map[string]vote    `json:"featureVotes"`
	Subclasses       []subclassView     `json:"subclasses"`
}

type reviewItem struct {
	ID            int     `json:"id"`
	YearTaken     *string `json:"yearTaken"`
	SemTaken      *string `json:"semTaken"`
	Instructor    *string `json:"instructor"`
	Content       string  `json:"content"`
	LikedCount    int     `json:"likedCount"`
	DislikedCount int     `json:"dislikedCount"`
	UserID        int     `json:"userId"`
	CourseCode    string  `json:"courseCode"`
	CreatedAt     *string `json:"createdAt"`
	UpdatedAt     *string `json:"updatedAt"`
}

type departmentItem struct {
	Name        string `json:"name"`
	CourseCount int    `json:"courseCount"`
}

type errorResponse struct {
	Error string `json:"error"`
}

// parseSlots 把 subclasses.slots 列中的 JSON 文本解析为输出结构。
// 解析失败时降级为空数组并记日志,避免单条脏数据影响整个接口。
func parseSlots(raw string) []slotView {
	if raw == "" {
		return []slotView{}
	}
	var parsed []slotRaw
	if err := json.Unmarshal([]byte(raw), &parsed); err != nil {
		log.Printf("parse slots %q: %v", raw, err)
		return []slotView{}
	}
	result := make([]slotView, 0, len(parsed))
	for _, item := range parsed {
		result = append(result, slotView{
			Day:        item.Day,
			Venue:      item.Venue,
			StartTime:  item.StartTime,
			EndTime:    item.EndTime,
			StartDate:  item.StartDate,
			EndDate:    item.EndDate,
			IsTutorial: item.IsTutorial,
		})
	}
	return result
}

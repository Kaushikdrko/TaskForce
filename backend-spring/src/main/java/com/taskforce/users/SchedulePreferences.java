package com.taskforce.users;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "schedule_preferences")
@Getter
@Setter
@NoArgsConstructor
public class SchedulePreferences {

    @Id
    @Column(name = "user_id", columnDefinition = "uuid")
    private UUID userId;

    @Column(name = "work_start_time")
    private LocalTime workStartTime = LocalTime.of(9, 0);

    @Column(name = "work_end_time")
    private LocalTime workEndTime = LocalTime.of(17, 0);

    // 0=Sun … 6=Sat
    @Column(name = "work_days", columnDefinition = "integer[]")
    private int[] workDays;

    @Column(name = "preferred_focus_hours", columnDefinition = "time[]")
    private LocalTime[] preferredFocusHours;

    @Column(name = "break_duration_minutes")
    private Integer breakDurationMinutes = 15;

    @Column(name = "max_daily_tasks")
    private Integer maxDailyTasks = 10;
}

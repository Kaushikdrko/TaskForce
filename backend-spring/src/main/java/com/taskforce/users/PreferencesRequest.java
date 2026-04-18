package com.taskforce.users;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
public class PreferencesRequest {

    private LocalTime workStartTime;
    private LocalTime workEndTime;
    private int[] workDays;
    private LocalTime[] preferredFocusHours;
    private Integer breakDurationMinutes;
    private Integer maxDailyTasks;
}

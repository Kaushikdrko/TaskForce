package com.taskforce.tasks;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
public class TaskRequest {

    @NotBlank
    private String title;

    @Pattern(regexp = "pending|in_progress|completed|cancelled")
    private String status;

    @Pattern(regexp = "low|medium|high|urgent")
    private String priority;

    private OffsetDateTime dueDate;
    private OffsetDateTime scheduledStart;
    private Integer estimatedMinutes;
    private Integer actualMinutes;
    private String[] tags;
    private UUID folderId;
    private UUID eventId;
}

package com.taskforce.tasks;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
public class TaskRequest {

    @NotBlank
    private String title;

    private String status;
    private String priority;
    private LocalDate dueDate;
    private OffsetDateTime scheduledStart;
    private Integer estimatedMinutes;
    private Integer actualMinutes;
    private String[] tags;
    private UUID folderId;
    private UUID eventId;
    // created_by is set server-side; agent passes "ai"
    private String createdBy;
}

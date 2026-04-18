package com.taskforce.tasks;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "tasks")
@Getter
@Setter
@NoArgsConstructor
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "user_id", nullable = false, columnDefinition = "uuid")
    private UUID userId;

    @Column(name = "folder_id", columnDefinition = "uuid")
    private UUID folderId;

    @Column(name = "event_id", columnDefinition = "uuid")
    private UUID eventId;

    @Column(nullable = false)
    private String title;

    // pending | in_progress | completed | cancelled
    @Column(nullable = false)
    private String status = "pending";

    // low | medium | high | urgent
    private String priority = "medium";

    @Column(name = "due_date")
    private OffsetDateTime dueDate;

    @Column(name = "scheduled_start")
    private OffsetDateTime scheduledStart;

    @Column(name = "estimated_minutes")
    private Integer estimatedMinutes;

    @Column(name = "actual_minutes")
    private Integer actualMinutes;

    @Column(columnDefinition = "text[]")
    private String[] tags;

    // user | ai
    @Column(name = "created_by")
    private String createdBy = "user";

    @Column(name = "created_at", updatable = false, insertable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", insertable = false)
    private OffsetDateTime updatedAt;
}

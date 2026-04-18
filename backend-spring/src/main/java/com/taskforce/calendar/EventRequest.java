package com.taskforce.calendar;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
public class EventRequest {

    @NotBlank
    private String title;

    @NotNull
    private OffsetDateTime startTime;

    @NotNull
    private OffsetDateTime endTime;

    private UUID folderId;
    private boolean allDay;
    private String recurrenceRule;
    private String color;
    // source is set server-side; clients may pass "ai" if created by the agent
    private String source;
}

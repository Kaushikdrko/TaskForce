package com.taskforce.calendar;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
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
    @Pattern(regexp = "local|google|outlook|ai")
    private String source;
}

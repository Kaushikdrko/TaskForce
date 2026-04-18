package com.taskforce.calendar;

import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/events")
public class CalendarController {

    private final EventService eventService;

    public CalendarController(EventService eventService) {
        this.eventService = eventService;
    }

    @GetMapping
    public ResponseEntity<List<Event>> list(
            @AuthenticationPrincipal String userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime end,
            @RequestParam(name = "folder_id", required = false) UUID folderId) {
        return ResponseEntity.ok(eventService.list(userId, start, end, folderId));
    }

    @PostMapping
    public ResponseEntity<Event> create(
            @AuthenticationPrincipal String userId,
            @Valid @RequestBody EventRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(eventService.create(userId, req));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Event> get(
            @AuthenticationPrincipal String userId,
            @PathVariable UUID id) {
        return ResponseEntity.ok(eventService.get(userId, id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Event> update(
            @AuthenticationPrincipal String userId,
            @PathVariable UUID id,
            @Valid @RequestBody EventRequest req) {
        return ResponseEntity.ok(eventService.update(userId, id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal String userId,
            @PathVariable UUID id) {
        eventService.delete(userId, id);
        return ResponseEntity.noContent().build();
    }

    // ── Sync stubs (Phase 6) ─────────────────────────────────────────────────

    @PostMapping("/sync/google")
    public ResponseEntity<Void> syncGoogle(@AuthenticationPrincipal String userId) {
        return ResponseEntity.accepted().build();
    }

    @PostMapping("/sync/outlook")
    public ResponseEntity<Void> syncOutlook(@AuthenticationPrincipal String userId) {
        return ResponseEntity.accepted().build();
    }
}

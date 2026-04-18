package com.taskforce.tasks;

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
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @GetMapping
    public ResponseEntity<List<Task>> list(
            @AuthenticationPrincipal String userId,
            @RequestParam(required = false) String status,
            @RequestParam(name = "due_date", required = false)
                @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime dueDate,
            @RequestParam(name = "folder_id", required = false) UUID folderId) {
        return ResponseEntity.ok(taskService.list(userId, status, dueDate, folderId));
    }

    @PostMapping
    public ResponseEntity<Task> create(
            @AuthenticationPrincipal String userId,
            @Valid @RequestBody TaskRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(taskService.create(userId, req));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Task> get(
            @AuthenticationPrincipal String userId,
            @PathVariable UUID id) {
        return ResponseEntity.ok(taskService.get(userId, id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Task> update(
            @AuthenticationPrincipal String userId,
            @PathVariable UUID id,
            @Valid @RequestBody TaskRequest req) {
        return ResponseEntity.ok(taskService.update(userId, id, req));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Task> updateStatus(
            @AuthenticationPrincipal String userId,
            @PathVariable UUID id,
            @Valid @RequestBody StatusRequest req) {
        return ResponseEntity.ok(taskService.updateStatus(userId, id, req.getStatus()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal String userId,
            @PathVariable UUID id) {
        taskService.delete(userId, id);
        return ResponseEntity.noContent().build();
    }
}

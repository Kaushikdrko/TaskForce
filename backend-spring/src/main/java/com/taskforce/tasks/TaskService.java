package com.taskforce.tasks;

import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class TaskService {

    private final TaskRepository taskRepository;

    public TaskService(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    public List<Task> list(String userId, String status, LocalDate dueDate, UUID folderId) {
        Specification<Task> spec = TaskSpec.hasUserId(UUID.fromString(userId));
        if (status   != null) spec = spec.and(TaskSpec.hasStatus(status));
        if (dueDate  != null) spec = spec.and(TaskSpec.hasDueDate(dueDate));
        if (folderId != null) spec = spec.and(TaskSpec.hasFolderId(folderId));
        return taskRepository.findAll(spec);
    }

    @Transactional
    public Task create(String userId, TaskRequest req) {
        Task task = new Task();
        task.setUserId(UUID.fromString(userId));
        applyRequest(task, req);
        if (task.getStatus()    == null) task.setStatus("pending");
        if (task.getPriority()  == null) task.setPriority("medium");
        if (task.getCreatedBy() == null) task.setCreatedBy("user");
        return taskRepository.save(task);
    }

    public Task get(String userId, UUID id) {
        return taskRepository.findByIdAndUserId(id, UUID.fromString(userId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));
    }

    @Transactional
    public Task update(String userId, UUID id, TaskRequest req) {
        Task task = get(userId, id);
        applyRequest(task, req);
        return taskRepository.save(task);
    }

    @Transactional
    public Task updateStatus(String userId, UUID id, String status) {
        Task task = get(userId, id);
        task.setStatus(status);
        return taskRepository.save(task);
    }

    @Transactional
    public void delete(String userId, UUID id) {
        taskRepository.delete(get(userId, id));
    }

    private void applyRequest(Task task, TaskRequest req) {
        task.setTitle(req.getTitle());
        if (req.getStatus()           != null) task.setStatus(req.getStatus());
        if (req.getPriority()         != null) task.setPriority(req.getPriority());
        if (req.getDueDate()          != null) task.setDueDate(req.getDueDate());
        if (req.getScheduledStart()   != null) task.setScheduledStart(req.getScheduledStart());
        if (req.getEstimatedMinutes() != null) task.setEstimatedMinutes(req.getEstimatedMinutes());
        if (req.getActualMinutes()    != null) task.setActualMinutes(req.getActualMinutes());
        if (req.getTags()             != null) task.setTags(req.getTags());
        if (req.getFolderId()         != null) task.setFolderId(req.getFolderId());
        if (req.getEventId()          != null) task.setEventId(req.getEventId());
        if (req.getCreatedBy()        != null) task.setCreatedBy(req.getCreatedBy());
    }
}

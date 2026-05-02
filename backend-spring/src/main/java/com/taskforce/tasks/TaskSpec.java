package com.taskforce.tasks;

import org.springframework.data.jpa.domain.Specification;

import java.time.OffsetDateTime;
import java.util.UUID;

class TaskSpec {

    static Specification<Task> hasUserId(UUID userId) {
        return (root, query, cb) -> cb.equal(root.get("userId"), userId);
    }

    static Specification<Task> hasStatus(String status) {
        return (root, query, cb) -> cb.equal(root.get("status"), status);
    }

    static Specification<Task> hasFolderId(UUID folderId) {
        return (root, query, cb) -> cb.equal(root.get("folderId"), folderId);
    }

    static Specification<Task> dueDateFrom(OffsetDateTime start) {
        return (root, query, cb) -> cb.greaterThanOrEqualTo(root.get("dueDate"), start);
    }

    static Specification<Task> dueDateTo(OffsetDateTime end) {
        return (root, query, cb) -> cb.lessThanOrEqualTo(root.get("dueDate"), end);
    }

    static Specification<Task> titleContains(String keyword) {
        return (root, query, cb) ->
            cb.like(cb.lower(root.get("title")), "%" + keyword.toLowerCase() + "%");
    }
}

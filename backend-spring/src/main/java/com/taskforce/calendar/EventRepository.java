package com.taskforce.calendar;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EventRepository extends JpaRepository<Event, UUID> {

    List<Event> findByUserId(UUID userId);

    // Events overlapping [start, end)
    @Query("""
        SELECT e FROM Event e
        WHERE e.userId = :userId
          AND e.startTime < :end
          AND e.endTime > :start
        ORDER BY e.startTime
        """)
    List<Event> findByUserIdAndRange(
        @Param("userId") UUID userId,
        @Param("start") OffsetDateTime start,
        @Param("end") OffsetDateTime end
    );

    @Query("""
        SELECT e FROM Event e
        WHERE e.userId = :userId
          AND e.folderId = :folderId
          AND e.startTime < :end
          AND e.endTime > :start
        ORDER BY e.startTime
        """)
    List<Event> findByUserIdAndFolderIdAndRange(
        @Param("userId") UUID userId,
        @Param("folderId") UUID folderId,
        @Param("start") OffsetDateTime start,
        @Param("end") OffsetDateTime end
    );

    List<Event> findByUserIdAndFolderIdOrderByStartTime(UUID userId, UUID folderId);

    Optional<Event> findByIdAndUserId(UUID id, UUID userId);
}

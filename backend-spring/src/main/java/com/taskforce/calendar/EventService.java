package com.taskforce.calendar;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class EventService {

    private final EventRepository eventRepository;

    public EventService(EventRepository eventRepository) {
        this.eventRepository = eventRepository;
    }

    public List<Event> list(String userId, OffsetDateTime start, OffsetDateTime end, UUID folderId) {
        UUID uid = UUID.fromString(userId);

        if (start != null && end != null && folderId != null) {
            return eventRepository.findByUserIdAndFolderIdAndRange(uid, folderId, start, end);
        }
        if (start != null && end != null) {
            return eventRepository.findByUserIdAndRange(uid, start, end);
        }
        if (folderId != null) {
            return eventRepository.findByUserIdAndFolderIdOrderByStartTime(uid, folderId);
        }
        return eventRepository.findByUserId(uid);
    }

    @Transactional
    public Event create(String userId, EventRequest req) {
        Event event = new Event();
        event.setUserId(UUID.fromString(userId));
        applyRequest(event, req);
        if (event.getSource() == null) event.setSource("local");
        return eventRepository.save(event);
    }

    public Event get(String userId, UUID id) {
        return eventRepository.findByIdAndUserId(id, UUID.fromString(userId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found"));
    }

    @Transactional
    public Event update(String userId, UUID id, EventRequest req) {
        Event event = get(userId, id);
        applyRequest(event, req);
        return eventRepository.save(event);
    }

    @Transactional
    public void delete(String userId, UUID id) {
        Event event = get(userId, id);
        eventRepository.delete(event);
    }

    private void applyRequest(Event event, EventRequest req) {
        event.setTitle(req.getTitle());
        event.setStartTime(req.getStartTime());
        event.setEndTime(req.getEndTime());
        event.setAllDay(req.isAllDay());
        event.setFolderId(req.getFolderId());
        event.setRecurrenceRule(req.getRecurrenceRule());
        event.setColor(req.getColor());
        if (req.getSource() != null) event.setSource(req.getSource());
    }
}

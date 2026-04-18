package com.taskforce.tickets;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
public class TicketService {

    private static final Logger log = LoggerFactory.getLogger(TicketService.class);

    private final TicketRepository ticketRepository;

    public TicketService(TicketRepository ticketRepository) {
        this.ticketRepository = ticketRepository;
    }

    @Transactional
    public Ticket create(String userId, TicketRequest req) {
        Ticket ticket = new Ticket();
        ticket.setUserId(UUID.fromString(userId));
        ticket.setSubject(req.getSubject());
        ticket.setDescription(req.getDescription());
        if (req.getPriority() != null) ticket.setPriority(req.getPriority());
        Ticket saved = ticketRepository.save(ticket);
        notifySupport(saved);
        return saved;
    }

    public List<Ticket> list(String userId) {
        return ticketRepository.findByUserIdOrderByCreatedAtDesc(UUID.fromString(userId));
    }

    public Ticket get(String userId, UUID id) {
        return ticketRepository.findByIdAndUserId(id, UUID.fromString(userId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found"));
    }

    // Phase 7: replace with Twilio email/SMS notification
    private void notifySupport(Ticket ticket) {
        log.info("New support ticket [{}] subject='{}' priority='{}'",
                ticket.getId(), ticket.getSubject(), ticket.getPriority());
    }
}

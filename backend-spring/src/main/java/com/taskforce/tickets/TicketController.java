package com.taskforce.tickets;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/tickets")
public class TicketController {

    private final TicketService ticketService;

    public TicketController(TicketService ticketService) {
        this.ticketService = ticketService;
    }

    @PostMapping
    public ResponseEntity<Ticket> create(@AuthenticationPrincipal String userId,
                                         @Valid @RequestBody TicketRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ticketService.create(userId, req));
    }

    @GetMapping
    public ResponseEntity<List<Ticket>> list(@AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(ticketService.list(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Ticket> get(@AuthenticationPrincipal String userId,
                                      @PathVariable UUID id) {
        return ResponseEntity.ok(ticketService.get(userId, id));
    }
}
